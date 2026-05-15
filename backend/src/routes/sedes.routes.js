/**
 * routes/sedes.routes.js — CRUD de sedes y panel principal
 */
const { Router } = require('express');
const { Sede, Curso, Usuario, PerfilDocente, Area, CursoDocente, DocenteSede } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();

// GET /api/v1/sedes — lista pública de sedes
router.get('/', async (req, res, next) => {
  try {
    const sedes = await Sede.findAll({
      where: { activa: true },
      order: [['nombre', 'ASC']],
    });
    res.json({ sedes });
  } catch (err) { next(err); }
});

// GET /api/v1/sedes/:slug — detalle de sede con cursos y docentes
router.get('/:slug', async (req, res, next) => {
  try {
    const sede = await Sede.findOne({
      where: { slug: req.params.slug, activa: true },
      include: [
        {
          model: Curso,
          as: 'cursos',
          where: { activo: true },
          required: false,
          include: [{ model: Usuario, as: 'director', attributes: ['id','nombre','email'],
            include: [{ model: PerfilDocente, as: 'perfil', attributes: ['titulo_profesional','foto_url'] }] }],
        },
        {
          model: Usuario,
          as: 'docentes',
          attributes: ['id','nombre','email'],
          include: [{ model: PerfilDocente, as: 'perfil', attributes: ['titulo_profesional','foto_url','bio'] }],
        },
      ],
    });
    if (!sede) throw crearError('Sede no encontrada', 404);
    res.json({ sede });
  } catch (err) { next(err); }
});

// POST /api/v1/sedes — crear sede (solo ADMIN)
router.post('/', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const { nombre, tipo, descripcion, direccion, telefono, color_institucional } = req.body;
    if (!nombre || !tipo) throw crearError('nombre y tipo son requeridos', 400);
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const sede = await Sede.create({ nombre, slug, tipo, descripcion, direccion, telefono, color_institucional });
    res.status(201).json({ sede });
  } catch (err) { next(err); }
});

module.exports = router;
