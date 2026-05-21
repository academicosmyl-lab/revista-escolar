/**
 * routes/health.routes.js — Estado del sistema
 */
const { Router } = require('express');
const { sequelize } = require('../config/database');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const router = Router();

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    // Contar solicitudes para debug
    let solicitudes = null;
    try {
      const { SolicitudPerfil } = require('../models');
      solicitudes = await SolicitudPerfil.count();
    } catch(e) { solicitudes = 'tabla no existe: ' + e.message; }

    res.json({
      status: 'ok',
      database: 'connected',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      solicitudes_perfil_total: solicitudes,
    });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// POST /api/v1/run-demo — re-ejecuta seed demo (ADMIN o RECTOR, para actualizar datos)
router.post('/run-demo', autenticar, requiereRol('ADMIN', 'RECTOR'), async (req, res) => {
  try {
    const { seedDemo } = require('../utils/seed-demo');
    await seedDemo();
    res.json({ ok: true, mensaje: 'Seed demo re-ejecutado. Datos actualizados.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/bootstrap — primera instalación: solo funciona si la BD no tiene usuarios
router.post('/bootstrap', async (req, res) => {
  try {
    const { Usuario: Usr } = require('../models');
    const total = await Usr.count();
    if (total > 0) {
      return res.status(409).json({
        error: 'El sistema ya está inicializado.',
        usuarios: total,
      });
    }
    const { seedDemo } = require('../utils/seed-demo');
    await seedDemo();
    res.json({
      ok: true,
      mensaje: 'Bootstrap completado. Sistema listo.',
      credenciales: {
        admin:   'admin@revista.edu.co / Admin2024*',
        rector:  'patricia.diaz@itssantander.edu.co / Rector2024*',
        docente: '[nombre]@itssantander.edu.co / Docente2024*',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/init-admin — crea o resetea el super admin
router.get('/init-admin', async (req, res) => {
  try {
    // Usa SUPER_ADMIN_* si existen, si no cae a ADMIN_*
    const email    = process.env.SUPER_ADMIN_EMAIL    || process.env.ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    const nombre   = process.env.SUPER_ADMIN_NOMBRE   || 'Ronald Medina';
    if (!email || !password) {
      return res.status(500).json({ error: 'No hay variables de admin configuradas' });
    }
    const bcrypt = require('bcryptjs');
    const { Usuario } = require('../models');
    const hash = await bcrypt.hash(password, 12);
    const existente = await Usuario.findOne({ where: { email } });
    if (existente) {
      await existente.update({ password_hash: hash, rol: 'ADMIN', activo: true });
      return res.json({ ok: true, accion: 'actualizado', email });
    }
    await Usuario.create({ nombre, email, password_hash: hash, rol: 'ADMIN', activo: true });
    res.json({ ok: true, accion: 'creado', email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
