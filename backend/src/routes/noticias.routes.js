/**
 * routes/noticias.routes.js — CRUD de noticias
 */
const { Router } = require('express');
const { Noticia, Imagen, Categoria, Usuario } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { uploadNoticias, subirImagen } = require('../services/cloudinary.service');
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

    const { page, limit: limitQ } = req.query;
    const paginaFinal = parseInt(pagina || page || 1);
    const limiteFinal = parseInt(limite || limitQ || 10);

    const { count, rows } = await Noticia.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes', attributes: ['url', 'alt_text', 'es_portada'] },
      ],
      order: [['fecha_publicacion', 'DESC']],
      limit: limiteFinal,
      offset: (paginaFinal - 1) * limiteFinal,
    });

    // Normalizar campos al contrato camelCase del frontend
    const noticias = rows.map(n => ({
      ...n.toJSON(),
      fechaPublicacion: n.fecha_publicacion,
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
      // Subir a Cloudinary (buffer en memoria → nunca toca disco)
      const result = await subirImagen(file.buffer, 'noticias');

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

module.exports = router;
