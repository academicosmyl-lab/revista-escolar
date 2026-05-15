/**
 * agents/coordinator.agent.js — v3.0
 * Punto de entrada único para todos los agentes del sistema
 * Instituto Técnico Industrial Santander — Revista Digital
 *
 * AGENTES DISPONIBLES:
 *   noticia      → newsAgent     : mejora redacción con IA
 *   imagen       → imageAgent    : genera ALT text accesible
 *   galeria      → galleryAgent  : coloca imagen en sección automáticamente
 *   estadisticas → statsAgent    : prepara datos para Power BI
 *   externas     → externasAgent : evalúa relevancia de noticias de Colombia
 *
 * REGLA: NUNCA mezclar lógica de agentes distintos en este archivo
 */
const { newsAgent }    = require('./news.agent');
const { imageAgent }   = require('./image.agent');
const { galleryAgent, galleryVideoAgent, reorganizarGaleria } = require('./gallery.agent');
const { statsAgent }   = require('./stats.agent');

/**
 * Enrutar solicitud al agente correcto
 * @param {Object} params
 * @param {string} params.tipo - tipo de agente a invocar
 * @param {Object} params.datos - datos específicos del agente
 * @param {Object} params.usuario - usuario que hace la solicitud
 */
async function coordinador({ tipo, datos = {}, usuario = {} }) {
  const inicio = Date.now();
  console.log(`🤖 Coordinador → [${tipo}] · Usuario: ${usuario?.email || 'sistema'}`);

  try {
    let resultado;

    switch (tipo) {
      case 'noticia':
        resultado = await newsAgent(datos, usuario);
        break;

      case 'imagen':
        resultado = await imageAgent(datos, usuario);
        break;

      case 'galeria':
        resultado = await galleryAgent(datos);
        break;

      case 'galeria_video':
        resultado = await galleryVideoAgent(datos);
        break;

      case 'galeria_reorganizar':
        resultado = await reorganizarGaleria(datos.sedeId);
        break;

      case 'estadisticas':
        resultado = await statsAgent(datos, usuario);
        break;

      default:
        throw new Error(`Agente desconocido: "${tipo}". Disponibles: noticia, imagen, galeria, galeria_video, estadisticas`);
    }

    const ms = Date.now() - inicio;
    console.log(`✅ Coordinador → [${tipo}] completado en ${ms}ms`);
    return resultado;

  } catch (error) {
    const ms = Date.now() - inicio;
    console.error(`❌ Coordinador → [${tipo}] falló en ${ms}ms: ${error.message}`);
    throw error;
  }
}

module.exports = { coordinador };
