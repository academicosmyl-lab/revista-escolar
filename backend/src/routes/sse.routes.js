/**
 * routes/sse.routes.js
 * Endpoint SSE para actualización en tiempo real
 * El frontend Angular se conecta aquí y recibe eventos automáticamente
 */
const { Router } = require('express');
const { sseService } = require('../services/sse.service');

const router = Router();

// GET /api/v1/sse/noticias — el frontend se conecta aquí
router.get('/noticias', (req, res) => {
  sseService.conectar(req, res);
});

// GET /api/v1/sse/status — ver cuántos clientes están conectados
router.get('/status', (req, res) => {
  res.json({ clientes_conectados: sseService.totalClientes() });
});

module.exports = router;
