/**
 * routes/health.routes.js — Estado del sistema
 */
const { Router } = require('express');
const { sequelize, dialect } = require('../config/database');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const router = Router();

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const dialectInfo = dialect === 'postgres'
      ? 'postgres (Neon — persistente)'
      : 'sqlite (EFÍMERO — datos se pierden en cada reinicio)';
    res.json({
      status:      'ok',
      database:    'connected',
      dialect:     dialectInfo,
      anthropic:   process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      email:       process.env.EMAIL_USER && process.env.EMAIL_PASS ? 'configured' : 'missing',
      environment: process.env.NODE_ENV,
      timestamp:   new Date().toISOString(),
      version:     '1.0.0',
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

module.exports = router;
