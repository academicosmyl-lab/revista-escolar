/**
 * routes/categorias.routes.js
 */
const { Router } = require('express');
const { Categoria } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { crearError } = require('../middlewares/error.middleware');
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.findAll({ where: { activa: true }, order: [['nombre', 'ASC']] });
    res.json({ data: categorias });
  } catch (err) { next(err); }
});

router.post('/', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const { nombre, descripcion, color } = req.body;
    if (!nombre) throw crearError('El nombre es requerido', 400);
    const categoria = await Categoria.create({ nombre, descripcion, color });
    res.status(201).json({ categoria });
  } catch (err) { next(err); }
});

module.exports = router;
