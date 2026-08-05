/**
 * routes/super-admin.routes.js
 * Panel de Super Admin — solo rol ADMIN
 * Gestión de solicitudes de perfil docente, docentes y historial de acciones
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const { Op }  = require('sequelize');
const router  = express.Router();

const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const {
  Usuario, PerfilDocente, SolicitudPerfil,
  AccionAdmin, Sede, Noticia, Imagen,
} = require('../models');
const { emailService }      = require('../services/email.service');
const { cloudinaryService } = require('../services/cloudinary.service');

// Middleware: solo ADMIN puede acceder a todas estas rutas
const soloAdmin = [autenticar, requiereRol('ADMIN')];
const upload    = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── DASHBOARD: ESTADÍSTICAS ──────────────────────────────
router.get('/stats', soloAdmin, async (req, res) => {
  try {
    const [pendientes, aprobados, rechazados, totalDocentes, totalActivos, pubPendientes] = await Promise.all([
      SolicitudPerfil.count({ where: { estado: 'pendiente' } }),
      SolicitudPerfil.count({ where: { estado: 'aprobado'  } }),
      SolicitudPerfil.count({ where: { estado: 'rechazado' } }),
      Usuario.count({ where: { rol: { [Op.in]: ['DOCENTE','PERSONAL'] } } }),
      Usuario.count({ where: { rol: { [Op.in]: ['DOCENTE','PERSONAL'] }, activo: true } }),
      Noticia.count({ where: { estado: 'pendiente' } }),
    ]);

    // Últimas 5 acciones del historial
    const ultimasAcciones = await AccionAdmin.findAll({
      include: [{ model: Usuario, as: 'admin', attributes: ['nombre'] }],
      order:   [['createdAt', 'DESC']],
      limit:   5,
    });

    // Distribución por área (cargo en perfil)
    const porArea = await PerfilDocente.findAll({
      attributes: [
        'cargo',
        [require('sequelize').fn('COUNT', require('sequelize').col('cargo')), 'total'],
      ],
      group:   ['cargo'],
      order:   [[require('sequelize').literal('total'), 'DESC']],
      limit:   8,
      raw:     true,
    });

    res.json({
      solicitudes: { pendientes, aprobados, rechazados },
      docentes:    { total: totalDocentes, activos: totalActivos },
      publicacionesPendientes: pubPendientes,
      ultimasAcciones,
      porArea,
    });
  } catch (e) {
    console.error('Error stats super-admin:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── SOLICITUDES DE PERFIL ────────────────────────────────

// Listar solicitudes con filtros
router.get('/solicitudes', soloAdmin, async (req, res) => {
  const { estado, q, page = 1, limit = 15 } = req.query;
  const where = {};
  if (estado) where.estado = estado;
  if (q)      where.nombre = { [Op.like]: `%${q}%` };

  try {
    const { count, rows } = await SolicitudPerfil.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ total: count, data: rows, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Ver detalle de una solicitud
router.get('/solicitudes/:id', soloAdmin, async (req, res) => {
  try {
    const sol = await SolicitudPerfil.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(sol);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── APROBAR solicitud (crea usuario + perfil en BD) ───────
router.put('/solicitudes/:id/aprobar', soloAdmin, async (req, res) => {
  const { motivo } = req.body;
  if (!motivo?.trim()) {
    return res.status(400).json({ error: 'El motivo de aprobación es obligatorio' });
  }

  try {
    const sol = await SolicitudPerfil.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (sol.estado !== 'pendiente') {
      return res.status(400).json({ error: `Esta solicitud ya está en estado "${sol.estado}"` });
    }

    // Verificar que el email no esté ya registrado
    if (sol.email) {
      const yaExiste = await Usuario.findOne({ where: { email: sol.email } });
      if (yaExiste) {
        return res.status(409).json({
          error: 'Ya existe un usuario con ese email. Edita el perfil existente.',
        });
      }
    }

    // Generar contraseña temporal segura
    const chars     = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const passTemp  = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hash      = await bcrypt.hash(passTemp, 12);

    const emailDocente = sol.email ||
      `${sol.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'-')}@itisantander.edu.co`;

    // Crear usuario
    const usuario = await Usuario.create({
      nombre:        sol.nombre,
      email:         emailDocente,
      password_hash: hash,
      rol:           'DOCENTE',
      activo:        true,
    });

    // Parsear especialidades seguro
    let especialidades = null;
    try { especialidades = sol.especialidades ? JSON.parse(sol.especialidades) : null; } catch (e) { /* JSON inválido — ignorar */ }

    let publicaciones = null;
    try { publicaciones = sol.publicaciones ? JSON.parse(sol.publicaciones) : null; } catch (e) { /* JSON inválido — ignorar */ }

    // Crear perfil
    await PerfilDocente.create({
      usuario_id:               usuario.id,
      foto_url:                 sol.foto_url,
      titulo_profesional:       sol.titulo,
      cargo:                    sol.area,
      bio:                      sol.bio_completa || sol.bio_corta,
      logros:                   publicaciones,
      cualidades_intelectuales: especialidades,
      url_blog:                 sol.web,
      url_linkedin:             sol.linkedin,
      url_orcid:                sol.orcid,
      perfil_publico:           true,
      ultima_actualizacion:     new Date(),
    });

    // Marcar solicitud como aprobada
    await sol.update({
      estado:        'aprobado',
      motivo_admin:  motivo,
      revisado_por:  req.usuario.id,
      revisado_en:   new Date(),
      email_enviado: !!sol.email,
    });

    // Registrar en historial
    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'aprobar_perfil',
      descripcion:  `Perfil de "${sol.nombre}" aprobado. Motivo: ${motivo}`,
      entidad_tipo: 'SolicitudPerfil',
      entidad_id:   sol.id,
    });

    // Email al docente (no bloqueante)
    if (sol.email) {
      emailService.perfilAprobado({
        docenteEmail:  sol.email,
        docenteNombre: sol.nombre,
        motivo,
        passwordTemp: passTemp,
      }).catch(e => console.error('Email perfilAprobado error:', e.message));
    }

    res.json({ ok: true, mensaje: `Perfil de "${sol.nombre}" aprobado y publicado.`, usuarioId: usuario.id });
  } catch (e) {
    console.error('Error aprobar solicitud:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── RECHAZAR solicitud ────────────────────────────────────
router.put('/solicitudes/:id/rechazar', soloAdmin, async (req, res) => {
  const { motivo } = req.body;
  if (!motivo?.trim()) {
    return res.status(400).json({ error: 'El motivo de rechazo es obligatorio' });
  }

  try {
    const sol = await SolicitudPerfil.findByPk(req.params.id);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (sol.estado !== 'pendiente') {
      return res.status(400).json({ error: `Esta solicitud ya está en estado "${sol.estado}"` });
    }

    await sol.update({
      estado:        'rechazado',
      motivo_admin:  motivo,
      revisado_por:  req.usuario.id,
      revisado_en:   new Date(),
      email_enviado: !!sol.email,
    });

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'rechazar_perfil',
      descripcion:  `Perfil de "${sol.nombre}" rechazado. Motivo: ${motivo}`,
      entidad_tipo: 'SolicitudPerfil',
      entidad_id:   sol.id,
    });

    if (sol.email) {
      emailService.perfilRechazado({
        docenteEmail:  sol.email,
        docenteNombre: sol.nombre,
        motivo,
      }).catch(e => console.error('Email perfilRechazado error:', e.message));
    }

    res.json({ ok: true, mensaje: `Solicitud de "${sol.nombre}" rechazada. Email enviado.` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GESTIÓN DE DOCENTES ──────────────────────────────────

// Listar todos los docentes (con perfil)
router.get('/docentes', soloAdmin, async (req, res) => {
  const { q, activo, page = 1, limit = 20 } = req.query;
  const where = { rol: { [Op.in]: ['DOCENTE', 'PERSONAL'] } };
  if (q)         where[Op.or] = [
    { nombre: { [Op.like]: `%${q}%` } },
    { email:  { [Op.like]: `%${q}%` } },
  ];
  if (activo !== undefined) where.activo = activo === 'true';

  try {
    const { count, rows } = await Usuario.findAndCountAll({
      where,
      include: [{ model: PerfilDocente, as: 'perfil', required: false }],
      order:   [['nombre', 'ASC']],
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ total: count, data: rows, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear docente manualmente
router.post('/docentes', soloAdmin, upload.single('foto'), async (req, res) => {
  const { nombre, email, titulo, area, bio, sede, web, linkedin, orcid, rol: rolInput } = req.body;
  const rolesPermitidos = ['DOCENTE', 'PERSONAL', 'RECTOR', 'COORDINADOR', 'ORIENTADORA'];
  const rolFinal = rolesPermitidos.includes(rolInput) ? rolInput : 'DOCENTE';
  if (!nombre?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });
  }

  try {
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

    // Contraseña temporal
    const chars    = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const passTemp = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hash     = await bcrypt.hash(passTemp, 12);

    const usuario = await Usuario.create({ nombre, email, password_hash: hash, rol: rolFinal, activo: true });

    // Subir foto a Cloudinary si viene en el request
    let fotoUrl = null;
    if (req.file) {
      try {
        const result = await cloudinaryService.uploadBuffer(
          req.file.buffer, req.file.mimetype,
          `docentes/${usuario.id}`
        );
        fotoUrl = result.secure_url;
      } catch (uploadErr) {
        console.error('Error subiendo foto docente:', uploadErr.message);
      }
    }

    await PerfilDocente.create({
      usuario_id:         usuario.id,
      foto_url:           fotoUrl,
      titulo_profesional: titulo,
      cargo:              area,
      bio,
      url_blog:           web,
      url_linkedin:       linkedin,
      url_orcid:          orcid,
      perfil_publico:     true,
      ultima_actualizacion: new Date(),
    });

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'crear_docente',
      descripcion:  `Docente "${nombre}" creado manualmente`,
      entidad_tipo: 'Usuario',
      entidad_id:   usuario.id,
    });

    // Email de bienvenida (no bloqueante)
    emailService.bienvenida({ email, nombre, password: passTemp, rol: rolFinal })
      .catch(e => console.error('Email bienvenida error:', e.message));

    res.status(201).json({ ok: true, mensaje: `Usuario "${nombre}" (${rolFinal}) creado`, usuarioId: usuario.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar docente
router.put('/docentes/:id', soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: PerfilDocente, as: 'perfil' }],
    });
    if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });

    const { nombre, activo, titulo, area, bio, perfil_publico, web, linkedin, orcid } = req.body;

    const userUpd = {};
    if (nombre  !== undefined) userUpd.nombre = nombre;
    if (activo  !== undefined) userUpd.activo  = activo;
    if (Object.keys(userUpd).length) await usuario.update(userUpd);

    if (usuario.perfil) {
      const pUpd = {};
      if (titulo          !== undefined) pUpd.titulo_profesional = titulo;
      if (area            !== undefined) pUpd.cargo              = area;
      if (bio             !== undefined) pUpd.bio                = bio;
      if (perfil_publico  !== undefined) pUpd.perfil_publico     = perfil_publico;
      if (web             !== undefined) pUpd.url_blog           = web;
      if (linkedin        !== undefined) pUpd.url_linkedin       = linkedin;
      if (orcid           !== undefined) pUpd.url_orcid          = orcid;
      pUpd.ultima_actualizacion = new Date();
      if (Object.keys(pUpd).length) await usuario.perfil.update(pUpd);
    }

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'editar_docente',
      descripcion:  `Docente "${usuario.nombre}" actualizado`,
      entidad_tipo: 'Usuario',
      entidad_id:   usuario.id,
    });

    res.json({ ok: true, mensaje: 'Docente actualizado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Publicar / despublicar perfil en la página /docentes (toggle perfil_publico)
router.patch('/docentes/:id/visible', soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: PerfilDocente, as: 'perfil' }],
    });
    if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });

    // Crear perfil si aún no existe
    let perfil = usuario.perfil;
    if (!perfil) {
      perfil = await PerfilDocente.create({
        usuario_id:   usuario.id,
        perfil_publico: true,
        ultima_actualizacion: new Date(),
      });
    }

    const nuevoEstado = !perfil.perfil_publico;
    await perfil.update({ perfil_publico: nuevoEstado, ultima_actualizacion: new Date() });

    const msg = nuevoEstado ? 'publicado en /docentes' : 'ocultado de /docentes';
    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'editar_docente',
      descripcion:  `Perfil de "${usuario.nombre}" ${msg}`,
      entidad_tipo: 'PerfilDocente',
      entidad_id:   perfil.id,
    });

    res.json({ ok: true, perfil_publico: nuevoEstado, mensaje: `"${usuario.nombre}" ${msg}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Desactivar docente (soft delete)
router.delete('/docentes/:id', soloAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });
    if (usuario.es_raiz) return res.status(403).json({ error: 'No se puede desactivar el usuario raíz' });

    const estabaActivo = usuario.activo;
    await usuario.update({ activo: !estabaActivo });

    const tipo = estabaActivo ? 'desactivar_docente' : 'reactivar_docente';
    const msg  = estabaActivo ? 'desactivado' : 'reactivado';

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo,
      descripcion:  `Docente "${usuario.nombre}" ${msg}`,
      entidad_tipo: 'Usuario',
      entidad_id:   usuario.id,
    });

    res.json({ ok: true, mensaje: `Docente "${usuario.nombre}" ${msg}`, activo: !estabaActivo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── HISTORIAL DE ACCIONES ────────────────────────────────
router.get('/historial', soloAdmin, async (req, res) => {
  const { tipo, page = 1, limit = 30 } = req.query;
  const where = {};
  if (tipo) where.tipo = tipo;

  try {
    const { count, rows } = await AccionAdmin.findAndCountAll({
      where,
      include: [{ model: Usuario, as: 'admin', attributes: ['nombre', 'email'] }],
      order:   [['createdAt', 'DESC']],
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ total: count, data: rows, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GESTIÓN DE PUBLICACIONES ─────────────────────────────

router.get('/publicaciones', soloAdmin, async (req, res) => {
  const { estado = 'pendiente', page = 1, limit = 15 } = req.query;
  try {
    const { count, rows } = await Noticia.findAndCountAll({
      where: { estado },
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre', 'rol'] },
        { model: Imagen,  as: 'imagenes', attributes: ['url', 'es_portada'] },
      ],
      order: [['createdAt', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ total: count, data: rows, page: parseInt(page), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (e) {
    console.error('publicaciones GET error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/publicaciones/:id/aprobar', soloAdmin, async (req, res) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Publicación no encontrada' });
    if (noticia.estado !== 'pendiente') return res.status(400).json({ error: 'La publicación no está pendiente' });

    await noticia.update({ estado: 'publicada', fecha_publicacion: new Date() });

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'aprobar_publicacion',
      descripcion:  `Publicación "${noticia.titulo}" aprobada y publicada en la revista`,
      entidad_tipo: 'Noticia',
      entidad_id:   noticia.id,
    });

    res.json({ ok: true, mensaje: `"${noticia.titulo}" publicada en la revista.` });
  } catch (e) {
    console.error('publicaciones aprobar error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/publicaciones/:id/rechazar', soloAdmin, async (req, res) => {
  const { motivo } = req.body;
  if (!motivo?.trim()) return res.status(400).json({ error: 'El motivo de rechazo es obligatorio' });
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Publicación no encontrada' });
    if (noticia.estado !== 'pendiente') return res.status(400).json({ error: 'La publicación no está pendiente' });

    await noticia.update({ estado: 'rechazada', motivo_rechazo: motivo.trim() });

    await AccionAdmin.create({
      admin_id:     req.usuario.id,
      tipo:         'rechazar_publicacion',
      descripcion:  `Publicación "${noticia.titulo}" rechazada. Motivo: ${motivo}`,
      entidad_tipo: 'Noticia',
      entidad_id:   noticia.id,
    });

    res.json({ ok: true, mensaje: 'Publicación rechazada.' });
  } catch (e) {
    console.error('publicaciones rechazar error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
