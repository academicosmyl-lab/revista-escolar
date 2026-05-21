/**
 * routes/areas.routes.js
 * Endpoint público: lista de áreas del ITS Santander.
 * Incluye las áreas del seed + las personalizadas que docentes han registrado.
 * Sin autenticación — es información pública de referencia.
 */
const { Router } = require('express');
const { Area } = require('../models');

const router = Router();

// Áreas base del ITS (si la BD está vacía, se usan como fallback)
const AREAS_BASE = [
  'Artística',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Corte y Confección',
  'Diseño Digital',
  'Educación Especial',
  'Educación Física',
  'Electricidad',
  'Electrónica',
  'Electrónica Industrial',
  'Emprendimiento',
  'Español y Literatura',
  'Ética y Valores',
  'Filosofía',
  'Física',
  'Historia y Geografía',
  'Inglés Comunicativo',
  'Matemáticas',
  'Mecánica Industrial',
  'Medios Audiovisuales',
  'Orientación Escolar',
  'Química',
  'Religión',
  'Sistemas',
  'Técnica Industrial',
  'Tecnología e Informática',
];

// GET /api/v1/areas
// Devuelve la lista ordenada alfabéticamente: BD + personalizadas, sin duplicados.
router.get('/', async (req, res) => {
  try {
    const registros = await Area.findAll({
      where: { activa: true },
      order: [['nombre', 'ASC']],
    });

    if (registros.length === 0) {
      // BD vacía → seed automático con las áreas base
      for (const nombre of AREAS_BASE) {
        await Area.findOrCreate({ where: { nombre }, defaults: { nombre, activa: true } });
      }
      return res.json(AREAS_BASE);
    }

    const nombres = registros.map(a => a.nombre);
    res.json(nombres);
  } catch (err) {
    console.error('areas.routes GET / error:', err.message);
    res.json(AREAS_BASE); // fallback silencioso
  }
});

module.exports = router;
