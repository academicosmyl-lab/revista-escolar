/**
 * routes/noticias.routes.js — CRUD de noticias
 */
const { Router } = require('express');
const { Op } = require('sequelize');
const { Noticia, Imagen, Categoria, Usuario, Sede, PerfilDocente, Like } = require('../models');
const crypto = require('crypto');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { uploadNoticias, subirImagen, eliminarImagen } = require('../services/cloudinary.service');
const { coordinador } = require('../agents/coordinator.agent');
const { crearError } = require('../middlewares/error.middleware');
const Joi = require('joi');
const path = require('path');

const router = Router();

const schemaNoticias = Joi.object({
  titulo: Joi.string().min(5).max(200).required(),
  contenido: Joi.string().min(50).required(),
  categoria_id: Joi.string().uuid().optional(),
  usar_ia: Joi.boolean().default(true),
});

// GET /api/v1/noticias — lista pública
router.get('/', async (req, res, next) => {
  try {
    const { categoria, categoriaId, sedeId, busqueda, pagina = 1, limite = 10, page, limit: limitQ } = req.query;
    const paginaFinal = parseInt(pagina || page || 1);
    const limiteFinal = parseInt(limite || limitQ || 10);

    const where = { estado: 'publicada' };
    const catId = categoriaId || categoria;
    if (catId)    where.categoria_id = catId;
    if (sedeId)   where.sede_id      = sedeId;
    if (busqueda) {
      where[Op.or] = [
        { titulo:  { [Op.iLike]: `%${busqueda}%` } },
        { resumen: { [Op.iLike]: `%${busqueda}%` } },
      ];
    }

    const { count, rows } = await Noticia.findAndCountAll({
      where,
      include: [
        { model: Usuario,   as: 'autor',     attributes: ['nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Sede,      as: 'sede',      attributes: ['id', 'nombre', 'slug'] },
        { model: Imagen,    as: 'imagenes',  attributes: ['url', 'alt_text', 'es_portada'] },
      ],
      order: [['destacada', 'DESC'], ['fecha_publicacion', 'DESC']],
      limit: limiteFinal,
      offset: (paginaFinal - 1) * limiteFinal,
    });

    // Contar likes por noticia en una sola query
    const ids = rows.map(n => n.id);
    const likesCounts = await Like.findAll({
      where: { noticia_id: ids },
      attributes: ['noticia_id', [Like.sequelize.fn('COUNT', Like.sequelize.col('id')), 'total']],
      group: ['noticia_id'],
      raw: true,
    });
    const likesMap = Object.fromEntries(likesCounts.map(l => [l.noticia_id, parseInt(l.total)]));

    // Normalizar campos al contrato camelCase del frontend
    const noticias = rows.map(n => ({
      ...n.toJSON(),
      fechaPublicacion: n.fecha_publicacion,
      likes: likesMap[n.id] ?? 0,
      imagenes: n.imagenes?.map(img => ({
        ...img.toJSON(),
        altText: img.alt_text,
        esPortada: img.es_portada,
      })),
    }));

    res.json({ total: count, pagina: paginaFinal, totalPages: Math.ceil(count / limiteFinal), noticias });
  } catch (err) { next(err); }
});

// GET /api/v1/noticias/:id — detalle público
router.get('/:id', async (req, res, next) => {
  try {
    const noticia = await Noticia.findOne({
      where: { id: req.params.id, estado: 'publicada' },
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre'],
          include: [{ model: PerfilDocente, as: 'perfil', attributes: ['foto_url', 'cargo', 'titulo_profesional'], required: false }] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes' },
      ],
    });
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    // Registrar visita y obtener total de likes
    const [, likesCount] = await Promise.all([
      noticia.increment('visitas'),
      Like.count({ where: { noticia_id: noticia.id } }),
    ]);

    res.json({ noticia: { ...noticia.toJSON(), likes: likesCount } });
  } catch (err) { next(err); }
});

// POST /api/v1/noticias — crear noticia (docentes autenticados)
router.post('/', autenticar, requiereRol('DOCENTE', 'ADMIN'), async (req, res, next) => {
  try {
    const { error, value } = schemaNoticias.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    let contenidoFinal = value.contenido;
    let tituloFinal = value.titulo;
    let resumenFinal = '';
    let sugerencias = [];

    // Mejorar con IA si está activado
    if (value.usar_ia !== false) {
      const mejora = await coordinador({
        tipo: 'noticia',
        datos: {
          titulo: value.titulo,
          contenido: value.contenido,
          categoria: value.categoria_id,
          docente_nombre: req.usuario.nombre,
        },
        usuario: req.usuario,
      });
      contenidoFinal = mejora.contenido_mejorado;
      tituloFinal = mejora.titulo_mejorado;
      resumenFinal = mejora.resumen;
      sugerencias = mejora.sugerencias;
    }

    const noticia = await Noticia.create({
      titulo: tituloFinal,
      resumen: resumenFinal,
      contenido: contenidoFinal,
      contenido_ia: value.usar_ia ? contenidoFinal : null,
      estado: 'pendiente',
      autor_id: req.usuario.id,
      categoria_id: value.categoria_id || null,
    });

    res.status(201).json({ noticia, sugerencias });
  } catch (err) { next(err); }
});

// PUT /api/v1/noticias/:id — editar noticia (autor o admin/rector)
router.put('/:id', autenticar, async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    const esAdmin = ['ADMIN', 'RECTOR'].includes(req.usuario.rol);
    if (!esAdmin && noticia.autor_id !== req.usuario.id)
      throw crearError('No tienes permiso para editar esta noticia', 403);

    const schema = Joi.object({
      titulo:       Joi.string().min(5).max(200).optional(),
      contenido:    Joi.string().min(50).optional(),
      categoria_id: Joi.string().uuid().allow(null, '').optional(),
      sede_id:      Joi.string().uuid().allow(null, '').optional(),
      destacada:    Joi.boolean().optional(),
      usar_ia:      Joi.boolean().optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    const upd = {};
    if (value.titulo !== undefined)    upd.titulo       = value.titulo;
    if (value.contenido !== undefined) upd.contenido    = value.contenido;
    if (value.categoria_id !== undefined) upd.categoria_id = value.categoria_id || null;
    if (value.sede_id !== undefined)   upd.sede_id      = value.sede_id || null;
    if (esAdmin && value.destacada !== undefined) upd.destacada = value.destacada;

    // Mejorar con IA si se solicita y hay nuevo contenido
    if (value.usar_ia && (value.titulo || value.contenido)) {
      const mejora = await coordinador({
        tipo: 'noticia',
        datos: {
          titulo:          value.titulo    ?? noticia.titulo,
          contenido:       value.contenido ?? noticia.contenido,
          categoria:       value.categoria_id ?? noticia.categoria_id,
          docente_nombre:  req.usuario.nombre,
        },
        usuario: req.usuario,
      }).catch(() => null);
      if (mejora) {
        upd.titulo    = mejora.titulo_mejorado;
        upd.contenido = mejora.contenido_mejorado;
        upd.resumen   = mejora.resumen;
      }
    }

    // Docente edita una rechazada → vuelve a pendiente
    if (!esAdmin && noticia.estado === 'rechazada' && Object.keys(upd).length > 0) {
      upd.estado          = 'pendiente';
      upd.motivo_rechazo  = null;
    }

    await noticia.update(upd);

    const actualizada = await Noticia.findByPk(noticia.id, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen,    as: 'imagenes',  attributes: ['id', 'url', 'alt_text', 'es_portada'] },
      ],
    });

    res.json({ noticia: actualizada, mensaje: 'Noticia actualizada' });
  } catch (err) { next(err); }
});

// POST /api/v1/noticias/:id/fotos — subir fotos (máx 2) → Cloudinary
router.post('/:id/fotos', autenticar, uploadNoticias.array('fotos', 2), async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) throw crearError('Noticia no encontrada', 404);
    if (noticia.autor_id !== req.usuario.id && req.usuario.rol !== 'ADMIN') {
      throw crearError('No tienes permiso para modificar esta noticia', 403);
    }
    if (!req.files?.length) throw crearError('Debes subir al menos una imagen', 400);

    const imagenesCreadas = [];
    for (const file of req.files) {
      // Portada → 16:9; galería → sin recorte (para preservar QR, infografías, etc.)
      const tipoImg = imagenesCreadas.length === 0 ? 'noticias' : 'noticias-galeria';
      const result = await subirImagen(file.buffer, tipoImg);

      // Generar ALT con IA usando el buffer
      const { altText } = await coordinador({
        tipo: 'imagen',
        datos: { buffer: file.buffer, filename: file.originalname, noticia_titulo: noticia.titulo },
        usuario: req.usuario,
      }).catch(() => ({ altText: `Imagen de ${noticia.titulo}` }));

      const imagen = await Imagen.create({
        noticia_id:       noticia.id,
        filename:         result.public_id,
        url:              result.secure_url,
        alt_text:         altText || `Imagen de ${noticia.titulo}`,
        tamaño_bytes:     file.size,
        es_portada:       imagenesCreadas.length === 0,
        procesada_por_ia: true,
      });
      imagenesCreadas.push(imagen);
    }

    res.json({ imagenes: imagenesCreadas });
  } catch (err) { next(err); }
});

// DELETE /api/v1/noticias/:id/fotos/:imagenId — eliminar una imagen específica
router.delete('/:id/fotos/:imagenId', autenticar, async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Noticia no encontrada' });

    const esAdmin = ['ADMIN', 'RECTOR'].includes(req.usuario.rol);
    if (!esAdmin && noticia.autor_id !== req.usuario.id)
      return res.status(403).json({ error: 'Sin permiso para modificar esta noticia' });

    const imagen = await Imagen.findOne({
      where: { id: req.params.imagenId, noticia_id: req.params.id },
    });
    if (!imagen) return res.status(404).json({ error: 'Imagen no encontrada' });

    await eliminarImagen(imagen.filename).catch(() => {});
    await imagen.destroy();

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/v1/noticias/:id/fotos/:imagenId — reemplazar una imagen
router.put('/:id/fotos/:imagenId', autenticar, uploadNoticias.single('foto'), async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Noticia no encontrada' });

    const esAdmin = ['ADMIN', 'RECTOR'].includes(req.usuario.rol);
    if (!esAdmin && noticia.autor_id !== req.usuario.id)
      return res.status(403).json({ error: 'Sin permiso para modificar esta noticia' });

    const imagen = await Imagen.findOne({
      where: { id: req.params.imagenId, noticia_id: req.params.id },
    });
    if (!imagen) return res.status(404).json({ error: 'Imagen no encontrada' });
    if (!req.file)  return res.status(400).json({ error: 'Debes subir una imagen' });

    const tipoImg = imagen.es_portada ? 'noticias' : 'noticias-galeria';
    const result  = await subirImagen(req.file.buffer, tipoImg, req.file.mimetype);

    await eliminarImagen(imagen.filename).catch(() => {});
    await imagen.update({ url: result.secure_url, filename: result.public_id, tamaño_bytes: req.file.size });

    res.json({ ok: true, imagen: { id: imagen.id, url: result.secure_url, es_portada: imagen.es_portada } });
  } catch (err) { next(err); }
});

// POST /api/v1/noticias/:id/like — toggle like (sin auth, IP-based)
router.post('/:id/like', async (req, res, next) => {
  try {
    const noticia = await Noticia.findOne({ where: { id: req.params.id, estado: 'publicada' } });
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
    const salt = process.env.JWT_SECRET || 'iti-salt';
    const ip_hash = crypto.createHmac('sha256', salt).update(ip).digest('hex');

    const existente = await Like.findOne({ where: { noticia_id: noticia.id, ip_hash } });
    if (existente) {
      await existente.destroy();
    } else {
      await Like.create({ noticia_id: noticia.id, ip_hash });
    }

    const total = await Like.count({ where: { noticia_id: noticia.id } });
    res.json({ likes: total, liked: !existente });
  } catch (err) { next(err); }
});

module.exports = router;
