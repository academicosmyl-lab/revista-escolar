/**
 * routes/auth.routes.js — Login y autenticación
 */
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Usuario } = require('../models');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();

const schemaLogin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = schemaLogin.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    const usuario = await Usuario.findOne({ where: { email: value.email, activo: true } });
    if (!usuario) throw crearError('Credenciales incorrectas', 401);

    const passwordValida = await bcrypt.compare(value.password, usuario.password_hash);
    if (!passwordValida) throw crearError('Credenciales incorrectas', 401);

    // Actualizar último login
    await usuario.update({ ultimo_login: new Date() });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/perfil (verificar token)
router.get('/perfil', require('../middlewares/auth.middleware').autenticar, (req, res) => {
  const { password_hash, ...usuario } = req.usuario.dataValues;
  res.json({ usuario });
});

module.exports = router;
