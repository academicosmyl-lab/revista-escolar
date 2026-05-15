/**
 * agents/news.agent.js
 * Agente especializado en redacción y validación de noticias escolares
 * Usa Claude API para mejorar el contenido del docente
 */
const Anthropic = require('@anthropic-ai/sdk');
const { NEWS_PROMPT } = require('../prompts/news.prompt');
const { knowledgeService } = require('../services/knowledge.service');
const { errorLearningService } = require('../services/error-learning.service');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Mejorar y validar una noticia con IA
 * @param {Object} datos - { titulo, contenido, categoria, docente_nombre }
 * @param {Object} usuario - usuario que genera la noticia
 * @returns {Object} - { titulo_mejorado, contenido_mejorado, resumen, sugerencias }
 */
async function newsAgent(datos, usuario) {
  const { titulo, contenido, categoria, docente_nombre } = datos;

  // 1. Obtener conocimiento previo (estilo del docente, noticias exitosas)
  const contextoConocimiento = await knowledgeService.buscarContexto({
    tipo: 'docente',
    clave: usuario?.email || docente_nombre,
  });

  // 2. Obtener errores a evitar
  const reglasErrores = await errorLearningService.obtenerReglas({
    docenteId: usuario?.id,
  });

  // 3. Construir system prompt completo
  const systemPrompt = `${NEWS_PROMPT}

${contextoConocimiento ? `\n=== CONTEXTO PREVIO DEL DOCENTE ===\n${contextoConocimiento}` : ''}
${reglasErrores ? `\n=== ERRORES A EVITAR ===\n${reglasErrores}` : ''}
`.trim();

  try {
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Docente: ${docente_nombre || usuario?.nombre}
Categoría: ${categoria || 'General'}
Título original: ${titulo}
Contenido original:
${contenido}

Por favor mejora esta noticia escolar manteniendo toda la información real del docente.
Responde SOLO en JSON con esta estructura:
{
  "titulo_mejorado": "título atractivo y claro",
  "contenido_mejorado": "contenido completo mejorado con párrafos bien estructurados",
  "resumen": "resumen de máximo 2 oraciones para la portada",
  "sugerencias": ["sugerencia 1 para el docente", "sugerencia 2"]
}`,
      }],
    });

    const texto = response.content[0].text;
    const limpio = texto.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(limpio);

    console.log(`✅ Noticia mejorada por IA — Docente: ${usuario?.email}`);
    return resultado;

  } catch (error) {
    console.error('❌ Error en newsAgent:', error.message);
    // Fallback: devolver el contenido original sin modificar
    return {
      titulo_mejorado: titulo,
      contenido_mejorado: contenido,
      resumen: contenido.substring(0, 200) + '...',
      sugerencias: ['No se pudo procesar con IA. Contenido original conservado.'],
    };
  }
}

module.exports = { newsAgent };
