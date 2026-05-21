/**
 * routes/formulario.routes.js
 * Endpoint público para mejorar ortografía del formulario de registro docente.
 * Sin autenticación — solo mejora texto, no guarda nada.
 * Rate limit: 10 req/min por IP (heredado del rate limiter global de /api/).
 */
const { Router } = require('express');
const { mejorarTextoFormulario } = require('../agents/formulario.agent');

const router = Router();

// POST /api/v1/formulario/mejorar-texto
// Recibe campos de texto del formulario y devuelve versión corregida.
// Si la IA falla, devuelve los textos originales (fallo silencioso).
router.post('/mejorar-texto', async (req, res) => {
  const { nombre, titulo, bioCorta, bioCompleta, rol } = req.body;

  // Validación mínima — debe haber al menos un texto para mejorar
  if (!titulo?.trim() && !bioCorta?.trim() && !bioCompleta?.trim()) {
    return res.json({
      titulo:       titulo       || '',
      bioCorta:     bioCorta     || '',
      bioCompleta:  bioCompleta  || '',
      observaciones: 'Completa al menos el título o la biografía para usar la revisión automática.',
    });
  }

  try {
    const resultado = await mejorarTextoFormulario({ nombre, titulo, bioCorta, bioCompleta, rol });
    res.json(resultado);
  } catch (err) {
    console.error('formulario.agent error (no crítico):', err.message);
    // Fail gracefully — el formulario sigue funcionando
    res.json({
      titulo:       titulo       || '',
      bioCorta:     bioCorta     || '',
      bioCompleta:  bioCompleta  || '',
      observaciones: null,
    });
  }
});

module.exports = router;
