/**
 * routes/noticias.routes.js — CRUD de noticias
 */
const { Router } = require('express');
const { Noticia, Imagen, Categoria, Usuario } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
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
    const { categoria, pagina = 1, limite = 10 } = req.query;
    const where = { estado: 'publicada' };
    if (categoria) where.categoria_id = categoria;

    const { count, rows } = await Noticia.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes', attributes: ['url', 'alt_text', 'es_portada'] },
      ],
      order: [['fecha_publicacion', 'DESC']],
      limit: parseInt(limite),
      offset: (parseInt(pagina) - 1) * parseInt(limite),
    });

    res.json({ total: count, pagina: parseInt(pagina), noticias: rows });
  } catch (err) { next(err); }
});

// GET /api/v1/noticias/:id — detalle público
router.get('/:id', async (req, res, next) => {
  try {
    const noticia = await Noticia.findOne({
      where: { id: req.params.id, estado: 'publicada' },
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes' },
      ],
    });
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    // Registrar visita
    await noticia.increment('visitas');
    res.json({ noticia });
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

// POST /api/v1/noticias/:id/fotos — subir fotos (máx 2)
router.post('/:id/fotos', autenticar, upload.array('fotos', 2), async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id);
    if (!noticia) throw crearError('Noticia no encontrada', 404);
    if (noticia.autor_id !== req.usuario.id && req.usuario.rol !== 'ADMIN') {
      throw crearError('No tienes permiso para modificar esta noticia', 403);
    }

    const imagenesCreadeas = [];
    for (const file of req.files) {
      // Generar ALT con IA
      const { altText } = await coordinador({
        tipo: 'imagen',
        datos: { filename: file.filename, noticia_titulo: noticia.titulo },
        usuario: req.usuario,
      });

      const imagen = await Imagen.create({
        noticia_id: noticia.id,
        filename: file.filename,
        url: `/uploads/${file.filename}`,
        alt_text: altText,
        tamaño_bytes: file.size,
        es_portada: imagenesCreadeas.length === 0,
      });
      imagenesCreadeas.push(imagen);
    }

    res.json({ imagenes: imagenesCreadeas });
  } catch (err) { next(err); }
});

module.exports = router;
