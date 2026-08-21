/**
 * routes/perfil.routes.js — Perfil público y edición del docente
 */
const { Router } = require('express');
const multer  = require('multer');
const { Usuario, PerfilDocente, Noticia, Imagen, Sede, DocenteSede, SolicitudPerfil, Area } = require('../models');
const { autenticar } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { galleryAgent } = require('../agents/gallery.agent');
const { crearError } = require('../middlewares/error.middleware');
const { emailService }      = require('../services/email.service');
const { cloudinaryService } = require('../services/cloudinary.service');

const router = Router();
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /api/v1/perfil/registro-publico ──────────────────
// Recibe el formulario público del docente (sin autenticación).
// Guarda la solicitud como "pendiente" y notifica al super admin.
router.post('/registro-publico', uploadMem.single('foto'), async (req, res) => {
  try {
    const {
      rol, nombre, titulo, area, sede, experiencia, email,
      bioCorta, bioCompleta, especialidades, publicaciones,
      web, linkedin, orcid,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Subir foto a Cloudinary si viene en la solicitud
    let fotoUrl    = null;
    let fotoPublicId = null;
    if (req.file) {
      try {
        const result = await cloudinaryService.uploadBuffer(
          req.file.buffer,
          req.file.mimetype,
          `solicitudes-perfil/${Date.now()}`
        );
        fotoUrl      = result.secure_url;
        fotoPublicId = result.public_id;
      } catch (uploadErr) {
        console.error('Error subiendo foto solicitud:', uploadErr.message);
        // No bloqueamos — la solicitud sigue aunque falle la foto
      }
    }

    const solicitud = await SolicitudPerfil.create({
      rol:          rol?.trim()      || 'DOCENTE',
      nombre:       nombre.trim(),
      titulo:       titulo?.trim()   || null,
      area:         area?.trim()     || null,
      sede:         sede?.trim(),
      experiencia:  experiencia ? parseInt(experiencia) : null,
      email:        email?.trim()    || null,
      bio_corta:    bioCorta?.trim() || null,
      bio_completa: bioCompleta?.trim() || null,
      especialidades: especialidades || null,
      publicaciones:  publicaciones  || null,
      web:          web?.trim()      || null,
      linkedin:     linkedin?.trim() || null,
      orcid:        orcid?.trim()    || null,
      foto_url:     fotoUrl,
      foto_public_id: fotoPublicId,
      estado:       'pendiente',
      ip_origen:    req.ip,
    });

    // Auto-registrar área personalizada en la tabla de áreas
    // (para que aparezca en futuros formularios)
    if (area?.trim()) {
      Area.findOrCreate({
        where: { nombre: area.trim() },
        defaults: { nombre: area.trim(), activa: true },
      }).catch(e => console.error('Auto-registro área:', e.message));
    }

    // Notificar al super admin (no bloqueante)
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (adminEmail) {
      emailService.solicitudPerfilPendiente({
        adminEmail,
        docenteNombre: nombre,
        docenteArea:   area,
        solicitudId:   solicitud.id,
      }).catch(e => console.error('Email solicitudPerfilPendiente error:', e.message));
    }

    res.status(201).json({
      ok:      true,
      mensaje: 'Tu perfil fue recibido. El equipo directivo lo revisará pronto.',
      id:      solicitud.id,
    });
  } catch (e) {
    console.error('Error registro-publico:', e.message);
    res.status(500).json({ error: 'Error al guardar la solicitud. Intenta de nuevo.' });
  }
});

// GET /api/v1/perfil/registro-publico/buscar?email=xxx — buscar solicitud por email
router.get('/registro-publico/buscar', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }
    const emailNorm = email.trim().toLowerCase();
    const solicitud = await SolicitudPerfil.findOne({
      where: { email: emailNorm },
      order: [['createdAt', 'DESC']],
    });
    if (!solicitud) {
      return res.status(404).json({ error: 'No se encontró ningún registro con ese email' });
    }
    res.json({ solicitud });
  } catch (e) {
    console.error('Error buscando solicitud:', e.message);
    res.status(500).json({ error: 'Error al buscar la solicitud' });
  }
});

// PUT /api/v1/perfil/registro-publico/:id — actualizar solicitud existente
router.put('/registro-publico/:id', uploadMem.single('foto'), async (req, res) => {
  try {
    const solicitud = await SolicitudPerfil.findByPk(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const {
      rol, nombre, titulo, area, sede, experiencia, email,
      bioCorta, bioCompleta, especialidades, publicaciones,
      web, linkedin, orcid,
    } = req.body;

    // Subir nueva foto a Cloudinary si viene
    let fotoUrl      = solicitud.foto_url;
    let fotoPublicId = solicitud.foto_public_id;
    if (req.file) {
      try {
        const result = await cloudinaryService.uploadBuffer(
          req.file.buffer,
          req.file.mimetype,
          `solicitudes-perfil/${Date.now()}`
        );
        fotoUrl      = result.secure_url;
        fotoPublicId = result.public_id;
      } catch (uploadErr) {
        console.error('Error subiendo foto solicitud update:', uploadErr.message);
      }
    }

    await solicitud.update({
      rol:          rol?.trim()           || solicitud.rol,
      nombre:       nombre?.trim()        || solicitud.nombre,
      titulo:       titulo?.trim()        ?? solicitud.titulo,
      area:         area?.trim()          ?? solicitud.area,
      sede:         sede?.trim()          ?? solicitud.sede,
      experiencia:  experiencia !== undefined ? parseInt(experiencia) : solicitud.experiencia,
      email:        email?.trim()         ?? solicitud.email,
      bio_corta:    bioCorta?.trim()      ?? solicitud.bio_corta,
      bio_completa: bioCompleta?.trim()   ?? solicitud.bio_completa,
      especialidades: especialidades      ?? solicitud.especialidades,
      publicaciones:  publicaciones       ?? solicitud.publicaciones,
      web:          web?.trim()           ?? solicitud.web,
      linkedin:     linkedin?.trim()      ?? solicitud.linkedin,
      orcid:        orcid?.trim()         ?? solicitud.orcid,
      foto_url:     fotoUrl,
      foto_public_id: fotoPublicId,
      estado:       'pendiente',
    });

    // Auto-registrar área personalizada
    if (area?.trim()) {
      Area.findOrCreate({
        where: { nombre: area.trim() },
        defaults: { nombre: area.trim(), activa: true },
      }).catch(e => console.error('Auto-registro área update:', e.message));
    }

    res.json({
      ok:      true,
      mensaje: 'Tu perfil fue actualizado. El equipo directivo lo revisará pronto.',
      id:      solicitud.id,
    });
  } catch (e) {
    console.error('Error actualizando solicitud:', e.message);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

// GET /api/v1/perfil/docentes — lista pública de docentes con perfil
router.get('/docentes', async (req, res, next) => {
  try {
    const { sede_id, sedeId } = req.query;
    const filtroSede = sede_id || sedeId;
    const rolesPublicos = ['RECTOR', 'COORDINADOR', 'ORIENTADORA', 'DOCENTE'];

    // Si hay filtro de sede, primero obtenemos los IDs de usuarios de esa sede
    let usuarioIdsEnSede = null;
    if (filtroSede) {
      const filas = await DocenteSede.findAll({
        where: { sede_id: filtroSede },
        attributes: ['usuario_id'],
      });
      usuarioIdsEnSede = filas.map(f => f.usuario_id);
      if (usuarioIdsEnSede.length === 0) return res.json({ docentes: [] });
    }

    const whereUsuario = { rol: rolesPublicos, activo: true };
    if (usuarioIdsEnSede) whereUsuario.id = usuarioIdsEnSede;

    const rows = await Usuario.findAll({
      where: whereUsuario,
      attributes: ['id', 'nombre', 'email', 'rol'],
      include: [
        {
          model: PerfilDocente, as: 'perfil',
          where: { perfil_publico: true },
          required: false,
          attributes: ['foto_url','titulo_profesional','cargo','bio','estudios','logros','proyectos','url_blog','url_linkedin'],
        },
        {
          model: Sede, as: 'sedes',
          through: { attributes: [] },
          attributes: ['id','nombre','slug'],
          required: false,
        },
      ],
      order: [['nombre', 'ASC']],
    });

    const jerarquia = { RECTOR: 1, COORDINADOR: 2, ORIENTADORA: 3, DOCENTE: 4 };

    // Normalizar al contrato del frontend Angular (PerfilDocente interface)
    const docentes = rows
      .map(d => ({
      id:        d.id,
      usuario:   { id: d.id, nombre: d.nombre, email: d.email, rol: d.rol },
      bio:       d.perfil?.bio        ?? null,
      cargo:     d.perfil?.cargo      ?? null,
      fotoUrl:   d.perfil?.foto_url   ?? null,
      titulo:    d.perfil?.titulo_profesional ?? null,
      areas:     d.perfil?.estudios   ?? [],
      logros:    d.perfil?.logros     ?? [],
        urlBlog:   d.perfil?.url_blog   ?? null,
        urlLinkedin: d.perfil?.url_linkedin ?? null,
        sedes:     d.sedes ?? [],
        _orden:    jerarquia[d.rol] ?? 9,
      }))
      .sort((a, b) => a._orden - b._orden || a.usuario.nombre.localeCompare(b.usuario.nombre));

    docentes.forEach(d => delete d._orden);

    res.json({ docentes });
  } catch (err) { next(err); }
});

// GET /api/v1/perfil/:id — perfil público completo (cualquier rol con perfil_publico)
router.get('/:id', async (req, res, next) => {
  try {
    const rolesPublicos = ['RECTOR', 'COORDINADOR', 'ORIENTADORA', 'DOCENTE'];
    const docente = await Usuario.findOne({
      where: { id: req.params.id, rol: rolesPublicos, activo: true },
      attributes: ['id', 'nombre', 'email'],
      include: [
        {
          model: PerfilDocente, as: 'perfil',
          where: { perfil_publico: true },
          required: false,
        },
        {
          model: Noticia, as: 'noticias',
          where: { estado: 'publicada' },
          required: false,
          limit: 5,
          order: [['fecha_publicacion', 'DESC']],
          include: [{ model: Imagen, as: 'imagenes', attributes: ['url','alt_text','es_portada'] }],
        },
      ],
    });

    if (!docente) throw crearError('Docente no encontrado', 404);
    res.json({ docente });
  } catch (err) { next(err); }
});

// GET /api/v1/perfil/mio/datos — el docente ve su propio perfil completo
router.get('/mio/datos', autenticar, async (req, res, next) => {
  try {
    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) {
      // Crear perfil vacío si no existe
      perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });
    }
    res.json({ perfil });
  } catch (err) { next(err); }
});

// PUT /api/v1/perfil/mio/datos — el docente actualiza su perfil
router.put('/mio/datos', autenticar, async (req, res, next) => {
  try {
    const {
      titulo_profesional, bio,
      estudios, cualidades_intelectuales, cualidades_fisicas,
      logros, proyectos,
      url_blog, url_linkedin, url_researchgate, url_orcid,
      perfil_publico,
    } = req.body;

    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) {
      perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });
    }

    await perfil.update({
      titulo_profesional, bio,
      estudios:               typeof estudios === 'string' ? JSON.parse(estudios) : estudios,
      cualidades_intelectuales: typeof cualidades_intelectuales === 'string' ? JSON.parse(cualidades_intelectuales) : cualidades_intelectuales,
      cualidades_fisicas:     typeof cualidades_fisicas === 'string' ? JSON.parse(cualidades_fisicas) : cualidades_fisicas,
      logros:     typeof logros === 'string' ? JSON.parse(logros) : logros,
      proyectos:  typeof proyectos === 'string' ? JSON.parse(proyectos) : proyectos,
      url_blog, url_linkedin, url_researchgate, url_orcid,
      perfil_publico,
      ultima_actualizacion: new Date(),
    });

    res.json({ perfil, mensaje: 'Perfil actualizado exitosamente' });
  } catch (err) { next(err); }
});

// POST /api/v1/perfil/mio/foto — subir foto de perfil (1 imagen) → Cloudinary
router.post('/mio/foto', autenticar, uploadMem.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) throw crearError('Debes subir una imagen', 400);

    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });

    // Subir a Cloudinary (nunca guardar en el servidor local)
    const result = await cloudinaryService.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
      `perfiles-docentes/${req.usuario.id}`
    );

    const imagen = await Imagen.create({
      perfil_id:        perfil.id,
      filename:         result.public_id,
      url:              result.secure_url,
      alt_text:         `Foto de ${req.usuario.nombre}`,
      tamaño_bytes:     req.file.size,
      es_portada:       true,
      procesada_por_ia: false,
    });

    await perfil.update({ foto_url: result.secure_url });

    res.json({ foto_url: result.secure_url, imagen });
  } catch (err) { next(err); }
});

module.exports = router;
