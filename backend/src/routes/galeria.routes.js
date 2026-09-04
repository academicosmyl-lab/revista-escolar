/**
 * routes/galeria.routes.js — Galería automatizada + Videos YouTube
 */
const { Router } = require('express');
const { GaleriaItem, Imagen, VideoYoutube, Sede } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { galleryAgent, galleryVideoAgent, reorganizarGaleria } = require('../agents/gallery.agent');
const { uploadNoticias, subirImagen } = require('../services/cloudinary.service');
const { crearError } = require('../middlewares/error.middleware');
const Joi = require('joi');

const router = Router();

// GET /api/v1/galeria — galería completa (pública) con filtro por sede y sección
router.get('/', async (req, res, next) => {
  try {
    const { sede_id, seccion } = req.query;
    const where = { activo: true };
    if (sede_id) where.sede_id = sede_id;
    if (seccion) where.seccion = seccion;

    const items = await GaleriaItem.findAll({
      where,
      include: [
        { model: Imagen, as: 'imagen', required: false,
          attributes: ['id','url','alt_text','es_portada','score_visual'] },
        { model: VideoYoutube, as: 'video', required: false,
          attributes: ['id','titulo','youtube_id','youtube_url','thumbnail_url','duracion'] },
        { model: Sede, as: 'sede', attributes: ['id','nombre','slug','color_institucional'] },
      ],
      order: [['posicion', 'ASC'], ['score_relevancia', 'DESC']],
    });

    // Agrupar por sección para facilitar el render en el frontend
    const galeria = {
      portada:    items.filter(i => i.seccion === 'portada'),
      destacados: items.filter(i => i.seccion === 'destacados'),
      recientes:  items.filter(i => i.seccion === 'recientes'),
    };

    res.json({ galeria, total: items.length });
  } catch (err) { next(err); }
});

// POST /api/v1/galeria/fotos — docente sube fotos directo a la galería (máx 5)
router.post('/fotos', autenticar, uploadNoticias.array('fotos', 5), async (req, res, next) => {
  try {
    if (!req.files?.length) throw crearError('Debes subir al menos una imagen', 400);

    const { sede_id, contexto } = req.body;
    if (!sede_id) throw crearError('Debes indicar la sede', 400);

    const sede = await Sede.findByPk(sede_id);
    if (!sede) throw crearError('Sede no encontrada', 404);

    const resultado = [];
    for (const file of req.files) {
      const result = await subirImagen(file.buffer, 'galeria');

      const imagen = await Imagen.create({
        filename:         result.public_id,
        url:              result.secure_url,
        alt_text:         contexto || 'Imagen institucional',
        tamaño_bytes:     file.size,
        procesada_por_ia: true,
      });

      // Agente evalúa y coloca en sección automáticamente
      galleryAgent({
        imagenId: imagen.id,
        filename: file.originalname,
        buffer:   file.buffer,
        noticiaId: null,
        sedeId:   sede_id,
        contexto: contexto || 'Actividad institucional del colegio',
      }).catch(e => console.error('galleryAgent galeria/fotos:', e.message));

      resultado.push({ imagen, sede: sede.nombre });
    }

    res.status(201).json({
      ok: true,
      imagenes: resultado,
      mensaje: `${resultado.length} foto${resultado.length > 1 ? 's subidas' : ' subida'} a la galería de ${sede.nombre}.`,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/galeria/video — docente registra video de YouTube
router.post('/video', autenticar, async (req, res, next) => {
  try {
    const schema = Joi.object({
      titulo:      Joi.string().min(5).max(200).required(),
      descripcion: Joi.string().max(1000).optional(),
      youtube_url: Joi.string().uri().required(),
      sede_id:     Joi.string().uuid().required(),
      noticia_id:  Joi.string().uuid().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    // Extraer ID del video de YouTube de la URL
    const ytId = _extraerYoutubeId(value.youtube_url);
    if (!ytId) throw crearError('URL de YouTube inválida. Usa el formato: https://www.youtube.com/watch?v=ID', 400);

    // Guardar video (estado pendiente — el admin aprueba)
    const video = await VideoYoutube.create({
      titulo:       value.titulo,
      descripcion:  value.descripcion,
      youtube_id:   ytId,
      youtube_url:  `https://www.youtube.com/watch?v=${ytId}`,
      thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      autor_id:     req.usuario.id,
      sede_id:      value.sede_id,
      noticia_id:   value.noticia_id || null,
      estado:       'pendiente',
    });

    res.status(201).json({
      video,
      embed_url: `https://www.youtube.com/embed/${ytId}`,
      mensaje: 'Video registrado. El admin lo revisará antes de publicarlo.',
    });
  } catch (err) { next(err); }
});

// PUT /api/v1/galeria/video/:id/aprobar — admin aprueba video y lo coloca en galería
router.put('/video/:id/aprobar', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const video = await VideoYoutube.findByPk(req.params.id);
    if (!video) throw crearError('Video no encontrado', 404);

    await video.update({ estado: 'aprobado' });

    // El agente de galería lo coloca automáticamente
    const resultado = await galleryVideoAgent({ videoId: video.id, sedeId: video.sede_id });

    res.json({ video, galeria: resultado, mensaje: 'Video aprobado y publicado en galería' });
  } catch (err) { next(err); }
});

// POST /api/v1/galeria/reorganizar/:sedeId — reorganizar galería manualmente (ADMIN)
router.post('/reorganizar/:sedeId', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const resultado = await reorganizarGaleria(req.params.sedeId);
    res.json({ resultado, mensaje: 'Galería reorganizada por el agente IA' });
  } catch (err) { next(err); }
});

// ── HELPER ───────────────────────────────────────────────
function _extraerYoutubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

module.exports = router;
