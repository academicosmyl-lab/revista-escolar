/**
 * routes/health.routes.js — Estado del sistema
 */
const { Router } = require('express');
const { sequelize } = require('../config/database');
const router = Router();

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      database: 'connected',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: error.message });
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
