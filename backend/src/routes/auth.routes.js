/**
 * routes/auth.routes.js — Login y autenticación
 */
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const { crearError } = require('../middlewares/error.middleware');
const emailService = require('../services/email.service');

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
      { expiresIn: '7d' }
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

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw crearError('El correo es requerido', 400);

    const usuario = await Usuario.findOne({ where: { email: email.toLowerCase().trim(), activo: true } });
    // Respuesta genérica siempre — no revelar si el email existe
    if (!usuario) return res.json({ ok: true, mensaje: 'Si el correo está registrado, recibirás un enlace en breve.' });

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    await usuario.update({ reset_token: token, reset_token_expires: expires });
    await emailService.recuperarContrasena({ email: usuario.email, nombre: usuario.nombre, token });

    res.json({ ok: true, mensaje: 'Si el correo está registrado, recibirás un enlace en breve.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw crearError('Token y contraseña son requeridos', 400);
    if (password.length < 6) throw crearError('La contraseña debe tener mínimo 6 caracteres', 400);

    const usuario = await Usuario.findOne({
      where: {
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
        activo: true,
      },
    });
    if (!usuario) throw crearError('El enlace no es válido o ya expiró. Solicita uno nuevo.', 400);

    const hash = await bcrypt.hash(password, 12);
    await usuario.update({
      password_hash:       hash,
      password_plain:      password,
      reset_token:         null,
      reset_token_expires: null,
    });

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
