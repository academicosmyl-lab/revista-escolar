/**
 * routes/noticias-externas.routes.js — Noticias automáticas de Colombia
 */
const { Router } = require('express');
const { NoticiaExterna } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { sincronizarNoticiasExternas } = require('../jobs/noticias-externas.job');

const router = Router();

// GET /api/v1/noticias-externas — lista pública de noticias de Colombia
router.get('/', async (req, res, next) => {
  try {
    const { pagina = 1, limite = 10 } = req.query;
    const { count, rows } = await NoticiaExterna.findAndCountAll({
      where: { activa: true },
      order: [['fecha_publicacion', 'DESC'], ['relevancia_score', 'DESC']],
      limit: parseInt(limite),
      offset: (parseInt(pagina) - 1) * parseInt(limite),
    });
    res.json({ total: count, pagina: parseInt(pagina), noticias: rows });
  } catch (err) { next(err); }
});

// POST /api/v1/noticias-externas/sincronizar — sincronización manual (ADMIN)
router.post('/sincronizar', autenticar, requiereRol('ADMIN'), async (req, res, next) => {
  try {
    const resultado = await sincronizarNoticiasExternas();
    res.json({ resultado, mensaje: 'Sincronización completada' });
  } catch (err) { next(err); }
});

module.exports = router;
