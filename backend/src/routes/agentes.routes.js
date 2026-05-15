/**
 * routes/agentes.routes.js — Endpoints directos a los agentes IA
 */
const { Router } = require('express');
const { autenticar } = require('../middlewares/auth.middleware');
const { coordinador } = require('../agents/coordinator.agent');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();
router.use(autenticar);

// POST /api/v1/agentes/mejorar-noticia — mejora un borrador de noticia
router.post('/mejorar-noticia', async (req, res, next) => {
  try {
    const { titulo, contenido, categoria } = req.body;
    if (!titulo || !contenido) throw crearError('titulo y contenido son requeridos', 400);

    const resultado = await coordinador({
      tipo: 'noticia',
      datos: { titulo, contenido, categoria, docente_nombre: req.usuario.nombre },
      usuario: req.usuario,
    });
    res.json({ resultado });
  } catch (err) { next(err); }
});

// GET /api/v1/agentes/estadisticas
router.get('/estadisticas', async (req, res, next) => {
  try {
    const resultado = await coordinador({
      tipo: 'estadisticas',
      datos: { periodo: req.query.periodo || 'mes' },
      usuario: req.usuario,
    });
    res.json({ estadisticas: resultado });
  } catch (err) { next(err); }
});

module.exports = router;
