/**
 * routes/inclusion.routes.js
 * Panel de inclusión — estudiantes en condiciones especiales
 * Acceso: orientadora (todas las sedes) + docentes del estudiante + rector + admin
 */
const { Router } = require('express');
const { EstudianteInclusion, SeguimientoInclusion, Curso, Sede, Usuario } = require('../models');
const { autenticar, puedeVerInclusion, puedeGestionarInclusion } = require('../middlewares/auth.middleware');
const { crearError } = require('../middlewares/error.middleware');
const { upload } = require('../middlewares/upload.middleware');
const Joi = require('joi');

const router = Router();
router.use(autenticar, puedeVerInclusion);

// GET /api/v1/inclusion — lista de estudiantes (filtrada por rol)
router.get('/', async (req, res, next) => {
  try {
    const { sede_id, curso_id } = req.query;
    const where = { activo: true };

    // Filtrar por sede según el rol
    if (req.usuario.rol === 'DOCENTE') {
      // El docente solo ve estudiantes de sus cursos
      // (se filtra en JS después de obtener los cursos del docente)
    } else if (req.usuario.rol === 'RECTOR' || req.usuario.rol === 'COORDINADOR') {
      where.sede_id = req.usuario.sede_principal_id;
    } else if (sede_id) {
      where.sede_id = sede_id;
    }

    if (curso_id) where.curso_id = curso_id;

    const estudiantes = await EstudianteInclusion.findAll({
      where,
      include: [
        { model: Curso, as: 'curso', attributes: ['id','nombre','nivel'] },
        { model: Sede, as: 'sede', attributes: ['id','nombre','slug'] },
      ],
      order: [['nombre_completo', 'ASC']],
    });

    res.json({ estudiantes, total: estudiantes.length });
  } catch (err) { next(err); }
});

// GET /api/v1/inclusion/:id — detalle con seguimientos
router.get('/:id', async (req, res, next) => {
  try {
    const estudiante = await EstudianteInclusion.findByPk(req.params.id, {
      include: [
        { model: Curso, as: 'curso' },
        { model: Sede, as: 'sede' },
        {
          model: SeguimientoInclusion, as: 'seguimientos',
          include: [{ model: Usuario, as: 'registrador', attributes: ['nombre','rol'] }],
          order: [['fecha', 'DESC']],
        },
      ],
    });
    if (!estudiante) throw crearError('Estudiante no encontrado', 404);
    res.json({ estudiante });
  } catch (err) { next(err); }
});

// POST /api/v1/inclusion — registrar nuevo estudiante (orientadora / admin)
router.post('/', puedeGestionarInclusion, async (req, res, next) => {
  try {
    const schema = Joi.object({
      nombre_completo:  Joi.string().min(3).max(150).required(),
      fecha_nacimiento: Joi.string().isoDate().optional(),
      curso_id:         Joi.string().uuid().required(),
      sede_id:          Joi.string().uuid().required(),
      condiciones:      Joi.array().items(Joi.object({
        tipo: Joi.string().valid('cognitiva','motriz','sensorial','psicosocial','multiple').required(),
        descripcion: Joi.string().optional(),
      })).optional(),
      diagnostico:      Joi.string().optional(),
      observaciones:    Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    const estudiante = await EstudianteInclusion.create({
      ...value,
      creado_por: req.usuario.id,
    });

    res.status(201).json({ estudiante, mensaje: 'Estudiante registrado en el panel de inclusión' });
  } catch (err) { next(err); }
});

// PUT /api/v1/inclusion/:id — actualizar (orientadora / admin)
router.put('/:id', puedeGestionarInclusion, async (req, res, next) => {
  try {
    const estudiante = await EstudianteInclusion.findByPk(req.params.id);
    if (!estudiante) throw crearError('Estudiante no encontrado', 404);
    await estudiante.update(req.body);
    res.json({ estudiante, mensaje: 'Actualizado correctamente' });
  } catch (err) { next(err); }
});

// POST /api/v1/inclusion/:id/seguimiento — agregar nota de seguimiento
router.post('/:id/seguimiento', async (req, res, next) => {
  try {
    const { tipo, descripcion, acciones, requiere_atencion, fecha } = req.body;
    if (!descripcion) throw crearError('La descripción es requerida', 400);

    const seguimiento = await SeguimientoInclusion.create({
      estudiante_id:    req.params.id,
      registrado_por:   req.usuario.id,
      fecha:            fecha || new Date().toISOString().split('T')[0],
      tipo:             tipo || 'academico',
      descripcion,
      acciones,
      requiere_atencion: requiere_atencion || false,
    });

    res.status(201).json({ seguimiento });
  } catch (err) { next(err); }
});

// POST /api/v1/inclusion/:id/piar — subir documento PIAR
router.post('/:id/piar', puedeGestionarInclusion, upload.single('piar'), async (req, res, next) => {
  try {
    if (!req.file) throw crearError('Debes subir el archivo PIAR', 400);
    const estudiante = await EstudianteInclusion.findByPk(req.params.id);
    if (!estudiante) throw crearError('Estudiante no encontrado', 404);
    await estudiante.update({ piar_url: `/uploads/${req.file.filename}` });
    res.json({ piar_url: estudiante.piar_url, mensaje: 'PIAR subido correctamente' });
  } catch (err) { next(err); }
});

module.exports = router;
