/**
 * services/error-learning.service.js
 * Sistema de aprendizaje de errores — adaptado de M&L para la Revista Escolar
 * Registra noticias rechazadas y genera reglas para evitar repetirlas
 */
const Anthropic = require('@anthropic-ai/sdk');
const { ErrorPattern } = require('../models');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const errorLearningService = {

  /**
   * Registrar error cuando una noticia es rechazada por el admin
   */
  async registrarRechazo({ docenteId, motivoRechazo, noticiaId }) {
    try {
      // Clasificar el error con IA
      const clasificacion = await this._clasificarError(motivoRechazo);

      // Verificar si ya existe patrón similar
      const existente = await ErrorPattern.findOne({
        where: {
          docente_id: docenteId,
          tipo: clasificacion.tipo,
          resuelto: false,
        },
      });

      if (existente) {
        await existente.increment('veces_repetido');
        console.log(`⚠️ Error repetido para docente ${docenteId}`);
        return;
      }

      await ErrorPattern.create({
        tipo: clasificacion.tipo,
        gravedad: clasificacion.gravedad,
        descripcion: motivoRechazo,
        regla: clasificacion.regla,
        docente_id: docenteId,
      });

      console.log(`✅ Error aprendido: ${clasificacion.regla}`);
    } catch (error) {
      console.error('Error en errorLearningService.registrarRechazo:', error.message);
    }
  },

  /**
   * Obtener reglas de errores para inyectar al agente
   */
  async obtenerReglas({ docenteId }) {
    try {
      const errores = await ErrorPattern.findAll({
        where: { docente_id: docenteId, resuelto: false },
        order: [['veces_repetido', 'DESC']],
        limit: 5,
      });

      if (errores.length === 0) return '';

      let reglas = `=== ERRORES ANTERIORES — NO REPETIR ===\n`;
      errores.forEach(e => {
        reglas += `× ${e.regla}`;
        if (e.veces_repetido > 1) reglas += ` ← ocurrió ${e.veces_repetido} veces`;
        reglas += `\n`;
      });

      return reglas;
    } catch (error) {
      console.error('Error obteniendo reglas:', error.message);
      return '';
    }
  },

  /**
   * Clasificar error con IA
   */
  async _clasificarError(descripcion) {
    try {
      const response = await client.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Clasifica este error en una noticia escolar: "${descripcion}"
Responde SOLO en JSON:
{
  "tipo": "contenido|formato|tono|datos|imagen",
  "gravedad": "baja|media|alta",
  "regla": "NUNCA [acción específica] porque [razón breve]"
}`,
        }],
      });

      const texto = response.content[0].text.replace(/```json|```/g, '').trim();
      return JSON.parse(texto);
    } catch {
      return { tipo: 'contenido', gravedad: 'media', regla: `EVITAR: ${descripcion}` };
    }
  },
};

module.exports = { errorLearningService };
