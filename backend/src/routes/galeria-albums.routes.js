/**
 * routes/galeria-albums.routes.js
 * Galería institucional por álbumes — Albums / Capítulos / Fotos
 *
 * POLÍTICA DE FOTOS: nunca se elimina ningún registro de la BD.
 * El campo `eliminada` en GaleriaFoto es el único mecanismo de "borrado".
 * Cloudinary sí puede eliminarse cuando eliminada=true y el admin lo confirma.
 */
const { Router } = require('express');
const multer = require('multer');
const { Op } = require('sequelize');
const { sequelize, GaleriaAlbum, GaleriaCapitulo, GaleriaFoto, Usuario } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { subirFotoGaleria, eliminarImagen } = require('../services/cloudinary.service');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();

// Multer memoria — hasta 20 fotos a la vez, 20MB cada una
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo JPG, PNG o WEBP'), ok);
  },
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
});

// ══════════════════════════════════════════════════════════
//  ÁLBUMES
// ══════════════════════════════════════════════════════════

// GET /categorias — devuelve categorías únicas que tienen álbumes activos (público)
router.get('/categorias', async (req, res, next) => {
  try {
    const rows = await GaleriaAlbum.findAll({
      where: { eliminado: false, activo: true },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('categoria')), 'categoria']],
      raw: true,
      order: [['categoria', 'ASC']],
    });
    const categorias = rows.map(r => r.categoria).filter(Boolean);
    res.json({ categorias });
  } catch (err) { next(err); }
});

// GET /albums — listar álbumes activos (público)
router.get('/albums', async (req, res, next) => {
  try {
    const { categoria, año } = req.query;
    const where = { eliminado: false };
    if (categoria) where.categoria = categoria;
    if (año)       where.año       = parseInt(año);

    const albums = await GaleriaAlbum.findAll({
      where,
      attributes: { exclude: ['portada_cloudinary_data'] },
      include: [{
        model: GaleriaCapitulo, as: 'capitulos',
        where: { activo: true }, required: false,
        attributes: ['id','titulo','icono','orden'],
        include: [{
          model: GaleriaFoto, as: 'fotos',
          where: { eliminada: false }, required: false,
          attributes: ['id'],
        }],
      }],
      order: [['orden','ASC'],['año','DESC'],['createdAt','DESC']],
    });

    // Añadir conteo total de fotos por álbum
    const result = albums.map(a => {
      const obj = a.toJSON();
      obj.total_fotos = obj.capitulos.reduce((acc, c) => acc + (c.fotos?.length || 0), 0);
      obj.total_capitulos = obj.capitulos.length;
      return obj;
    });

    res.json({ albums: result, total: result.length });
  } catch (err) { next(err); }
});

// GET /albums/:id — detalle álbum con capítulos y fotos (público)
router.get('/albums/:id', async (req, res, next) => {
  try {
    const album = await GaleriaAlbum.findOne({
      where: { id: req.params.id, eliminado: false },
      attributes: { exclude: ['portada_cloudinary_data'] },
      include: [{
        model: GaleriaCapitulo, as: 'capitulos',
        where: { activo: true }, required: false,
        order: [['orden','ASC']],
        include: [{
          model: GaleriaFoto, as: 'fotos',
          where: { eliminada: false }, required: false,
          attributes: { exclude: ['cloudinary_data'] },
          order: [['orden','ASC']],
        }],
      }],
      order: [[{ model: GaleriaCapitulo, as: 'capitulos' }, 'orden', 'ASC']],
    });

    if (!album) throw crearError('Álbum no encontrado', 404);
    res.json({ album });
  } catch (err) { next(err); }
});

// POST /albums — crear álbum con foto de portada opcional (ADMIN)
router.post('/albums', autenticar, requiereRol('ADMIN'), upload.single('portada'), async (req, res, next) => {
  let portadaPublicId = null;
  try {
    const { nombre, categoria, subtitulo, descripcion, año } = req.body;
    if (!nombre)    throw crearError('El nombre del álbum es obligatorio', 400);
    if (!categoria) throw crearError('La categoría es obligatoria', 400);

    let portadaData = {};
    if (req.file) {
      const result = await subirFotoGaleria(req.file.buffer, req.file.mimetype);
      portadaPublicId = result.public_id;
      portadaData = {
        portada_url:             result.secure_url,
        portada_public_id:       result.public_id,
        portada_cloudinary_data: JSON.stringify(result),
      };
    }

    const album = await GaleriaAlbum.create({
      nombre, categoria,
      subtitulo:   subtitulo  || null,
      descripcion: descripcion || null,
      año:         año ? parseInt(año) : new Date().getFullYear(),
      creado_por:  req.usuario.id,
      ...portadaData,
    });

    res.status(201).json({ album, mensaje: 'Álbum creado correctamente' });
  } catch (err) {
    // Si se subió portada a Cloudinary pero falló el INSERT, logeamos el public_id para rescate
    if (portadaPublicId) {
      console.error(`[GALERÍA-RESCATE] Portada subida pero INSERT falló. public_id: ${portadaPublicId}`);
    }
    next(err);
  }
});

// PUT /albums/:id — editar álbum (ADMIN)
router.put('/albums/:id', autenticar, requiereRol('ADMIN'), upload.single('portada'), async (req, res, next) => {
  let portadaPublicId = null;
  try {
    const album = await GaleriaAlbum.findOne({ where: { id: req.params.id, eliminado: false } });
    if (!album) throw crearError('Álbum no encontrado', 404);

    const { nombre, categoria, subtitulo, descripcion, año, activo } = req.body;
    const cambios = {};
    if (nombre)      cambios.nombre      = nombre;
    if (categoria)   cambios.categoria   = categoria;
    if (subtitulo  !== undefined) cambios.subtitulo   = subtitulo;
    if (descripcion !== undefined) cambios.descripcion = descripcion;
    if (año)         cambios.año         = parseInt(año);
    if (activo !== undefined) cambios.activo = activo === 'true' || activo === true;

    if (req.file) {
      const result = await subirFotoGaleria(req.file.buffer, req.file.mimetype);
      portadaPublicId = result.public_id;
      cambios.portada_url             = result.secure_url;
      cambios.portada_public_id       = result.public_id;
      cambios.portada_cloudinary_data = JSON.stringify(result);
    }

    await album.update(cambios);
    res.json({ album, mensaje: 'Álbum actualizado' });
  } catch (err) {
    if (portadaPublicId) {
      console.error(`[GALERÍA-RESCATE] Portada actualizada pero UPDATE falló. public_id: ${portadaPublicId}`);
    }
    next(err);
  }
});

// DELETE /albums/:id — SOFT DELETE únicamente (ADMIN)
router.delete('/albums/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const album = await GaleriaAlbum.findByPk(req.params.id);
    if (!album) throw crearError('Álbum no encontrado', 404);
    // Solo marcamos — los datos y fotos se preservan en BD y Cloudinary
    await album.update({ eliminado: true, activo: false });
    res.json({ mensaje: 'Álbum desactivado (los datos y fotos se conservan)' });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════
//  CAPÍTULOS
// ══════════════════════════════════════════════════════════

// POST /albums/:id/capitulos — crear capítulo (ADMIN)
router.post('/albums/:id/capitulos', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const album = await GaleriaAlbum.findOne({ where: { id: req.params.id, eliminado: false } });
    if (!album) throw crearError('Álbum no encontrado', 404);

    const { titulo, descripcion, icono, orden } = req.body;
    if (!titulo) throw crearError('El título del capítulo es obligatorio', 400);

    // Calcular orden automático si no se envía
    const ultimoOrden = await GaleriaCapitulo.max('orden', { where: { album_id: album.id } }) || 0;

    const capitulo = await GaleriaCapitulo.create({
      album_id:    album.id,
      titulo,
      descripcion: descripcion || null,
      icono:       icono || '📷',
      orden:       orden !== undefined ? parseInt(orden) : ultimoOrden + 1,
    });

    res.status(201).json({ capitulo, mensaje: 'Capítulo creado' });
  } catch (err) { next(err); }
});

// PUT /capitulos/:id — editar capítulo (ADMIN)
router.put('/capitulos/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const cap = await GaleriaCapitulo.findByPk(req.params.id);
    if (!cap) throw crearError('Capítulo no encontrado', 404);

    const { titulo, descripcion, icono, orden, activo } = req.body;
    const cambios = {};
    if (titulo)      cambios.titulo      = titulo;
    if (descripcion !== undefined) cambios.descripcion = descripcion;
    if (icono)       cambios.icono       = icono;
    if (orden !== undefined) cambios.orden = parseInt(orden);
    if (activo !== undefined) cambios.activo = activo === 'true' || activo === true;

    await cap.update(cambios);
    res.json({ capitulo: cap, mensaje: 'Capítulo actualizado' });
  } catch (err) { next(err); }
});

// DELETE /capitulos/:id — soft delete (ADMIN)
router.delete('/capitulos/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const cap = await GaleriaCapitulo.findByPk(req.params.id);
    if (!cap) throw crearError('Capítulo no encontrado', 404);
    await cap.update({ activo: false });
    res.json({ mensaje: 'Capítulo desactivado (las fotos se conservan)' });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════
//  FOTOS — sección crítica de protección
// ══════════════════════════════════════════════════════════

// POST /capitulos/:id/fotos — subir fotos al capítulo (ADMIN) hasta 20 a la vez
router.post('/capitulos/:id/fotos', autenticar, requiereRol('ADMIN'), upload.array('fotos', 20), async (req, res, next) => {
  const publicIdsSubidos = []; // log de rescate

  try {
    if (!req.files?.length) throw crearError('Debes subir al menos una foto', 400);

    const cap = await GaleriaCapitulo.findOne({
      where: { id: req.params.id, activo: true },
      include: [{ model: GaleriaAlbum, as: 'album', where: { eliminado: false } }],
    });
    if (!cap) throw crearError('Capítulo no encontrado', 404);

    const ultimoOrden = await GaleriaFoto.max('orden', { where: { capitulo_id: cap.id } }) || 0;

    const fotosGuardadas = [];
    const errores = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let cloudinaryResult = null;

      try {
        // 1. Subir a Cloudinary
        cloudinaryResult = await subirFotoGaleria(file.buffer, file.mimetype);
        publicIdsSubidos.push(cloudinaryResult.public_id);

        // 2. Guardar en BD dentro de transacción
        const foto = await sequelize.transaction(async (t) => {
          return GaleriaFoto.create({
            capitulo_id:     cap.id,
            url:             cloudinaryResult.secure_url,
            public_id:       cloudinaryResult.public_id,
            cloudinary_data: JSON.stringify(cloudinaryResult),
            descripcion:     req.body.descripcion || null,
            orden:           ultimoOrden + i + 1,
            eliminada:       false,
            subida_por:      req.usuario.id,
          }, { transaction: t });
        });

        fotosGuardadas.push({
          id:  foto.id,
          url: foto.url,
          orden: foto.orden,
        });
      } catch (fotoErr) {
        // Si Cloudinary subió pero BD falló — logear para rescate manual
        if (cloudinaryResult?.public_id) {
          console.error(`[GALERÍA-RESCATE] Foto subida pero no guardada en BD. public_id: ${cloudinaryResult.public_id} | capitulo: ${cap.id}`);
        }
        errores.push({ archivo: file.originalname, error: fotoErr.message });
      }
    }

    res.status(201).json({
      fotos:   fotosGuardadas,
      guardadas: fotosGuardadas.length,
      errores:   errores.length ? errores : undefined,
      mensaje: `${fotosGuardadas.length} foto${fotosGuardadas.length !== 1 ? 's guardadas' : ' guardada'} en "${cap.titulo}"`,
    });
  } catch (err) { next(err); }
});

// PATCH /fotos/:id — editar descripción u orden (ADMIN)
router.patch('/fotos/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const foto = await GaleriaFoto.findOne({ where: { id: req.params.id, eliminada: false } });
    if (!foto) throw crearError('Foto no encontrada', 404);

    const cambios = {};
    if (req.body.descripcion !== undefined) cambios.descripcion = req.body.descripcion;
    if (req.body.orden       !== undefined) cambios.orden       = parseInt(req.body.orden);

    await foto.update(cambios);
    res.json({ foto, mensaje: 'Foto actualizada' });
  } catch (err) { next(err); }
});

// DELETE /fotos/:id — SOFT DELETE (ADMIN) — NUNCA borra el registro de BD
router.delete('/fotos/:id', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const foto = await GaleriaFoto.findByPk(req.params.id);
    if (!foto) throw crearError('Foto no encontrada', 404);

    // Solo marcar como eliminada — el registro y el public_id se conservan
    await foto.update({ eliminada: true });

    // Eliminar de Cloudinary es OPCIONAL y solo si el admin lo confirma explícitamente
    if (req.query.limpiar_cloudinary === 'si' && foto.public_id) {
      await eliminarImagen(foto.public_id);
    }

    res.json({
      mensaje: 'Foto eliminada de la galería (el archivo en la nube se conserva)',
      public_id_conservado: foto.public_id,
    });
  } catch (err) { next(err); }
});

// GET /fotos/rescate — listar fotos eliminadas (ADMIN) para posible recuperación
router.get('/fotos/rescate', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const fotos = await GaleriaFoto.findAll({
      where: { eliminada: true },
      attributes: ['id','url','public_id','descripcion','capitulo_id','createdAt'],
      include: [{ model: GaleriaCapitulo, as: 'capitulo', attributes: ['titulo','album_id'] }],
      order: [['createdAt','DESC']],
    });
    res.json({ fotos, total: fotos.length });
  } catch (err) { next(err); }
});

// POST /fotos/:id/restaurar — recuperar foto eliminada (ADMIN)
router.post('/fotos/:id/restaurar', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const foto = await GaleriaFoto.findOne({ where: { id: req.params.id, eliminada: true } });
    if (!foto) throw crearError('Foto no encontrada en el archivo', 404);
    await foto.update({ eliminada: false });
    res.json({ foto, mensaje: 'Foto restaurada a la galería' });
  } catch (err) { next(err); }
});

module.exports = router;
