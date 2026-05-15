/**
 * routes/panel-docente.routes.js
 * Panel personal del docente: seguimiento por materia, documentos, imágenes, reportes
 */
const { Router } = require('express');
const { SeguimientoMateria, DocumentoDocente, Imagen, Curso, Area, Usuario, Noticia, Categoria } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { galleryAgent } = require('../agents/gallery.agent');
const { crearError } = require('../middlewares/error.middleware');
const { excelService } = require('../services/excel.service');
const Joi = require('joi');

const router = Router();
router.use(autenticar);

// GET /api/v1/panel/noticias — mis noticias (todos los estados)
router.get('/noticias', async (req, res, next) => {
  try {
    const noticias = await Noticia.findAll({
      where: { autor_id: req.usuario.id },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes', attributes: ['url', 'alt_text', 'es_portada'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ noticias });
  } catch (err) { next(err); }
});

// GET /api/v1/panel/seguimiento — ver mis seguimientos por materia
router.get('/seguimiento', async (req, res, next) => {
  try {
    const { curso_id, area_id, semana } = req.query;
    const where = { docente_id: req.usuario.id };
    if (curso_id) where.curso_id = curso_id;
    if (area_id)  where.area_id  = area_id;
    if (semana)   where.semana   = parseInt(semana);

    const seguimientos = await SeguimientoMateria.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id','nombre','nivel'] },
        { model: Area,  as: 'area',  attributes: ['id','nombre','color'] },
        { model: Imagen, as: 'imagenes', attributes: ['id','url','alt_text'] },
        { model: DocumentoDocente, as: 'documentos', attributes: ['id','nombre','url','tipo'] },
      ],
      order: [['semana','ASC'],['created_at','DESC']],
    });

    res.json({ seguimientos });
  } catch (err) { next(err); }
});

// POST /api/v1/panel/seguimiento — crear registro de seguimiento
router.post('/seguimiento', async (req, res, next) => {
  try {
    const schema = Joi.object({
      curso_id:        Joi.string().uuid().required(),
      area_id:         Joi.string().uuid().required(),
      semana:          Joi.number().integer().min(1).max(40).required(),
      titulo:          Joi.string().min(3).max(200).required(),
      descripcion:     Joi.string().optional(),
      avance_pct:      Joi.number().integer().min(0).max(100).default(0),
      estado:          Joi.string().valid('pendiente','en_progreso','completado').default('pendiente'),
      logro_destacado: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    const seguimiento = await SeguimientoMateria.create({
      ...value,
      docente_id: req.usuario.id,
    });

    res.status(201).json({ seguimiento });
  } catch (err) { next(err); }
});

// PUT /api/v1/panel/seguimiento/:id — actualizar seguimiento
router.put('/seguimiento/:id', async (req, res, next) => {
  try {
    const seg = await SeguimientoMateria.findOne({
      where: { id: req.params.id, docente_id: req.usuario.id },
    });
    if (!seg) throw crearError('Seguimiento no encontrado', 404);
    if (seg.aprobado_admin && req.usuario.rol === 'DOCENTE') {
      throw crearError('No puedes editar un seguimiento ya aprobado', 403);
    }
    await seg.update(req.body);
    res.json({ seguimiento: seg });
  } catch (err) { next(err); }
});

// POST /api/v1/panel/seguimiento/:id/imagenes — subir imágenes al seguimiento (máx 2)
router.post('/seguimiento/:id/imagenes', upload.array('imagenes', 2), async (req, res, next) => {
  try {
    const seg = await SeguimientoMateria.findOne({
      where: { id: req.params.id, docente_id: req.usuario.id },
    });
    if (!seg) throw crearError('Seguimiento no encontrado', 404);
    if (!req.files?.length) throw crearError('Debes subir al menos una imagen', 400);

    const imagenes = [];
    for (const file of req.files) {
      // Agente de galería procesa y coloca la imagen automáticamente
      const { altText } = await galleryAgent({
        imagenId: null,  // se actualiza después de crear
        filename: file.filename,
        noticiaId: null,
        sedeId: req.usuario.sede_principal_id,
        contexto: seg.titulo,
      }).catch(() => ({ altText: 'Imagen de actividad de clase' }));

      const imagen = await Imagen.create({
        seguimiento_id: seg.id,
        filename: file.filename,
        url: `/uploads/${file.filename}`,
        alt_text: altText || 'Imagen de actividad de clase',
        tamaño_bytes: file.size,
        procesada_por_ia: true,
      });
      imagenes.push(imagen);
    }

    res.json({ imagenes, mensaje: `${imagenes.length} imagen(es) subida(s)` });
  } catch (err) { next(err); }
});

// POST /api/v1/panel/documentos — subir documento (PDF, Word, Excel)
router.post('/documentos', upload.single('documento'), async (req, res, next) => {
  try {
    if (!req.file) throw crearError('Debes subir un archivo', 400);
    const { nombre, descripcion, seguimiento_id, publico } = req.body;

    const ext = require('path').extname(req.file.originalname).toLowerCase();
    const tipo = ['.jpg','.jpeg','.png','.webp'].includes(ext) ? 'imagen' : 'documento';

    const doc = await DocumentoDocente.create({
      docente_id:     req.usuario.id,
      seguimiento_id: seguimiento_id || null,
      perfil_id:      null,
      nombre:         nombre || req.file.originalname,
      filename:       req.file.filename,
      url:            `/uploads/${req.file.filename}`,
      tipo,
      tamaño_bytes:   req.file.size,
      descripcion,
      publico:        publico === 'true',
    });

    res.status(201).json({ documento: doc });
  } catch (err) { next(err); }
});

// GET /api/v1/panel/documentos — mis documentos
router.get('/documentos', async (req, res, next) => {
  try {
    const docs = await DocumentoDocente.findAll({
      where: { docente_id: req.usuario.id },
      order: [['created_at','DESC']],
    });
    res.json({ documentos: docs });
  } catch (err) { next(err); }
});

// GET /api/v1/panel/reporte — descargar reporte Excel de mi actividad
router.get('/reporte', async (req, res, next) => {
  try {
    const workbook = await excelService.generarReporteDocente(req.usuario.id, req.usuario.nombre);
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `reporte-${req.usuario.nombre.replace(/\s/g,'-')}-${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// PUT /api/v1/panel/seguimiento/:id/aprobar — admin/rector aprueba el logro
router.put('/seguimiento/:id/aprobar', requiereRol('ADMIN','RECTOR','COORDINADOR'), async (req, res, next) => {
  try {
    const seg = await SeguimientoMateria.findByPk(req.params.id);
    if (!seg) throw crearError('Seguimiento no encontrado', 404);
    await seg.update({ aprobado_admin: true });
    res.json({ mensaje: 'Logro aprobado y visible en el perfil del docente', seguimiento: seg });
  } catch (err) { next(err); }
});

module.exports = router;
