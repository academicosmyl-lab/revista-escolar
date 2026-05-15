/**
 * services/knowledge.service.js
 * Sistema de aprendizaje — adaptado de M&L para la Revista Escolar
 * Aprende el estilo de cada docente y qué noticias tienen más éxito
 */
const { KnowledgeBase } = require('../models');

const knowledgeService = {

  /**
   * Buscar contexto previo para un docente o categoría
   * @param {Object} params - { tipo: 'docente'|'categoria'|'global', clave: string }
   * @returns {string} contexto formateado para inyectar al agente
   */
  async buscarContexto({ tipo, clave }) {
    try {
      const registros = await KnowledgeBase.findAll({
        where: { tipo, clave },
        order: [['updated_at', 'DESC']],
        limit: 3,
      });

      if (registros.length === 0) return '';

      let contexto = `=== HISTORIAL PREVIO (${tipo}: ${clave}) ===\n`;
      registros.forEach(r => {
        try {
          const datos = JSON.parse(r.datos);
          if (datos.aprendizajes?.length) {
            contexto += datos.aprendizajes.map(a => `- ${a}`).join('\n') + '\n';
          }
          if (datos.estilo) {
            contexto += `Estilo preferido: ${datos.estilo}\n`;
          }
        } catch { /* JSON inválido — ignorar */ }
      });

      return contexto;
    } catch (error) {
      console.error('Error en knowledgeService.buscarContexto:', error.message);
      return '';
    }
  },

  /**
   * Guardar aprendizaje de una noticia aprobada
   * @param {Object} params - { docenteId, email, noticiaId, aprendizajes, estilo }
   */
  async guardarAprendizaje({ docenteId, email, noticiaId, aprendizajes = [], estilo = '' }) {
    try {
      await KnowledgeBase.create({
        tipo: 'docente',
        clave: email || docenteId,
        datos: JSON.stringify({
          noticia_id: noticiaId,
          fecha: new Date().toISOString().split('T')[0],
          aprendizajes,
          estilo,
        }),
      });
      console.log(`📚 Aprendizaje guardado para docente: ${email}`);
    } catch (error) {
      console.error('Error guardando aprendizaje:', error.message);
    }
  },
};

module.exports = { knowledgeService };
