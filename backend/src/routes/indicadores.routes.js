/**
 * indicadores.routes.js
 * Endpoints públicos de indicadores académicos.
 * Sin auth — datos institucionales agregados.
 */

const express = require('express');
const router  = express.Router();
const svc     = require('../services/indicadores.service');

// Helper respuesta estándar
const ok  = (res, data)  => res.json({ ok: true,  data });
const err = (res, msg, code = 500) => res.status(code).json({ ok: false, error: msg });

// Extraer filtros comunes del query
function parseFiltros(q) {
  return {
    sede:    q.sede    || null,
    jornada: q.jornada || null,
    grado:   q.grado   || null,
    grupo:   q.grupo   || null,
    area:    q.area    || null,
    periodo: q.periodo || null,
  };
}

// ── GET /metadata ─────────────────────────────────────────────────────────────
// Devuelve listas para poblar filtros en el frontend
router.get('/metadata', (req, res) => {
  try {
    const { sede, jornada, grado } = req.query;
    ok(res, {
      sedes:    svc.getSedes(),
      jornadas: svc.getJornadas(sede),
      grados:   svc.getGrados(sede, jornada),
      grupos:   svc.getGrupos(sede, jornada, grado),
      areas:    svc.getAreas(parseFiltros(req.query)),
      listo:    svc.estaListo(),
    });
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /resumen ──────────────────────────────────────────────────────────────
router.get('/resumen', (req, res) => {
  try {
    ok(res, svc.getResumen(parseFiltros(req.query)));
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /areas ────────────────────────────────────────────────────────────────
router.get('/areas', (req, res) => {
  try {
    ok(res, svc.getPromediosPorArea(parseFiltros(req.query)));
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /evolucion ────────────────────────────────────────────────────────────
router.get('/evolucion', (req, res) => {
  try {
    ok(res, svc.getEvolucionPeriodos(parseFiltros(req.query)));
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /heatmap ──────────────────────────────────────────────────────────────
router.get('/heatmap', (req, res) => {
  try {
    ok(res, svc.getHeatmap(parseFiltros(req.query)));
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /comparacion ─────────────────────────────────────────────────────────
// Query: tipo=grado|area|grupo, a=valorA, b=valorB, sede, jornada, grado
router.get('/comparacion', (req, res) => {
  try {
    const filtros = {
      ...parseFiltros(req.query),
      tipo: req.query.tipo || 'grado',
      a:    req.query.a    || null,
      b:    req.query.b    || null,
    };
    const resultado = svc.getComparacion(filtros);
    if (!resultado) return err(res, 'Parámetros de comparación inválidos', 400);
    ok(res, resultado);
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /ranking ──────────────────────────────────────────────────────────────
router.get('/ranking', (req, res) => {
  try {
    ok(res, svc.getRanking(parseFiltros(req.query)));
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /estudiante ───────────────────────────────────────────────────────────
// Query: nombre, sede, jornada, grado, grupo
router.get('/estudiante', (req, res) => {
  try {
    const { nombre, ...rest } = req.query;
    if (!nombre) return err(res, 'Parámetro nombre requerido', 400);
    const perfil = svc.getEstudiante(nombre, parseFiltros(rest));
    if (!perfil) return err(res, 'Estudiante no encontrado', 404);
    ok(res, perfil);
  } catch (e) {
    err(res, e.message);
  }
});

// ── GET /buscar ───────────────────────────────────────────────────────────────
// Query: q=nombre_parcial
router.get('/buscar', (req, res) => {
  try {
    const q = req.query.q || '';
    ok(res, svc.getBuscadorEstudiantes(q));
  } catch (e) {
    err(res, e.message);
  }
});

module.exports = router;
