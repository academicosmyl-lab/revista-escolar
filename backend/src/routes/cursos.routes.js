/**
 * routes/cursos.routes.js — Panel de cursos con filtros
 */
const { Router } = require('express');
const { Curso, Usuario, PerfilDocente, Area, CursoDocente, Sede } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();

// GET /api/v1/cursos — lista con filtros: ?sede_id=&area_id=&nivel=
router.get('/', async (req, res, next) => {
  try {
    const { sede_id, nivel, anio_lectivo } = req.query;
    const where = { activo: true };
    if (sede_id)      where.sede_id = sede_id;
    if (nivel)        where.nivel = nivel;
    if (anio_lectivo) where.anio_lectivo = parseInt(anio_lectivo);

    const cursos = await Curso.findAll({
      where,
      include: [
        { model: Sede, as: 'sede', attributes: ['id','nombre','slug','color_institucional'] },
        {
          model: Usuario, as: 'director', attributes: ['id','nombre'],
          include: [{ model: PerfilDocente, as: 'perfil', attributes: ['foto_url','titulo_profesional'] }],
          required: false,
        },
        {
          model: CursoDocente, as: 'asignaciones', required: false,
          include: [
            { model: Usuario, as: 'docente', attributes: ['id','nombre'],
              include: [{ model: PerfilDocente, as: 'perfil', attributes: ['foto_url','titulo_profesional'] }] },
            { model: Area, as: 'area', attributes: ['id','nombre','color','icono'] },
          ],
        },
      ],
      order: [['nombre', 'ASC']],
    });

    res.json({ cursos });
  } catch (err) { next(err); }
});

// GET /api/v1/cursos/:id — detalle de un curso
router.get('/:id', async (req, res, next) => {
  try {
    const curso = await Curso.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: Sede, as: 'sede' },
        { model: Usuario, as: 'director', attributes: ['id','nombre','email'],
          include: [{ model: PerfilDocente, as: 'perfil' }], required: false },
        { model: CursoDocente, as: 'asignaciones',
          include: [
            { model: Usuario, as: 'docente', attributes: ['id','nombre','email'],
              include: [{ model: PerfilDocente, as: 'perfil' }] },
            { model: Area, as: 'area' },
          ],
        },
      ],
    });
    if (!curso) throw crearError('Curso no encontrado', 404);
    res.json({ curso });
  } catch (err) { next(err); }
});

// POST /api/v1/cursos — crear curso (ADMIN)
router.post('/', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const { nombre, nivel, jornada, sede_id, director_id, anio_lectivo } = req.body;
    if (!nombre || !sede_id) throw crearError('nombre y sede_id son requeridos', 400);
    const curso = await Curso.create({ nombre, nivel, jornada, sede_id, director_id, anio_lectivo });
    res.status(201).json({ curso });
  } catch (err) { next(err); }
});

// POST /api/v1/cursos/:id/asignar — asignar docente + área a un curso (ADMIN)
router.post('/:id/asignar', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const { docente_id, area_id } = req.body;
    if (!docente_id || !area_id) throw crearError('docente_id y area_id son requeridos', 400);
    const asignacion = await CursoDocente.create({
      curso_id: req.params.id,
      usuario_id: docente_id,
      area_id,
    });
    res.status(201).json({ asignacion });
  } catch (err) { next(err); }
});

// GET /api/v1/cursos/areas/lista — lista de áreas disponibles
router.get('/areas/lista', async (req, res, next) => {
  try {
    const areas = await Area.findAll({ where: { activa: true }, order: [['nombre','ASC']] });
    res.json({ areas });
  } catch (err) { next(err); }
});

module.exports = router;
