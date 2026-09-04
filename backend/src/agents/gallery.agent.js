/**
 * agents/gallery.agent.js
 * Agente de galería automatizada
 * Evalúa cada imagen subida, le asigna un score de relevancia y la coloca
 * automáticamente en la sección correcta de la página (portada, destacados, recientes).
 * El docente solo sube la imagen — el agente hace el resto.
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { Imagen, GaleriaItem, VideoYoutube } = require('../models');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Umbrales de score para asignar sección
const SECCIONES = {
  portada:    { minScore: 0.80, maxItems: 3  },
  destacados: { minScore: 0.55, maxItems: 8  },
  recientes:  { minScore: 0.00, maxItems: 20 },
};

/**
 * Procesar nueva imagen: evaluar calidad y ubicar en galería
 * @param {Object} params - { imagenId, filename, buffer, noticiaId, sedeId, contexto }
 *   buffer — Buffer en memoria (preferido). Si no viene, intenta leer desde disco.
 */
async function galleryAgent({ imagenId, filename, buffer, noticiaId, sedeId, contexto = '' }) {
  try {
    console.log(`🖼️  Gallery Agent procesando: ${filename}`);

    // 1. Evaluar imagen con IA
    const evaluacion = await _evaluarImagen(filename, contexto, buffer);

    // 2. Actualizar registro de imagen con score y ALT text
    await Imagen.update(
      {
        alt_text: evaluacion.alt_text,
        score_visual: evaluacion.score,
        procesada_por_ia: true,
      },
      { where: { id: imagenId } }
    );

    // 3. Determinar sección según score
    const seccion = _determinarSeccion(evaluacion.score);

    // 4. Verificar si hay cupo en esa sección para esta sede
    const itemsEnSeccion = await GaleriaItem.count({
      where: { sede_id: sedeId, seccion, activo: true },
    });

    const limite = SECCIONES[seccion].maxItems;

    if (itemsEnSeccion >= limite) {
      // Si la sección está llena, desplazar el de menor score a 'recientes'
      await _desplazarMenosRelevante(sedeId, seccion);
    }

    // 5. Insertar en galería
    const posicion = await _siguientePosicion(sedeId, seccion);
    await GaleriaItem.create({
      imagen_id: imagenId,
      sede_id: sedeId,
      seccion,
      posicion,
      activo: true,
      asignado_por_ia: true,
      score_relevancia: evaluacion.score,
    });

    console.log(`✅ Imagen colocada en [${seccion}] — Score: ${evaluacion.score} — Sede: ${sedeId}`);
    return { seccion, score: evaluacion.score, alt_text: evaluacion.alt_text };

  } catch (error) {
    console.error('❌ Error en galleryAgent:', error.message);
    // Fallback: colocar en recientes sin evaluación
    await GaleriaItem.create({
      imagen_id: imagenId,
      sede_id: sedeId,
      seccion: 'recientes',
      posicion: 999,
      activo: true,
      asignado_por_ia: false,
      score_relevancia: 0,
    });
    return { seccion: 'recientes', score: 0, alt_text: 'Imagen escolar' };
  }
}

/**
 * Procesar video de YouTube: registrar y ubicar en galería
 * @param {Object} params - { videoId, sedeId }
 */
async function galleryVideoAgent({ videoId, sedeId }) {
  try {
    const video = await VideoYoutube.findByPk(videoId);
    if (!video) throw new Error('Video no encontrado');

    // Extraer thumbnail automático de YouTube
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
    await video.update({ thumbnail_url: thumbnailUrl });

    // Videos siempre van a 'destacados' si están aprobados
    const posicion = await _siguientePosicion(sedeId, 'destacados');
    await GaleriaItem.create({
      video_id: videoId,
      sede_id: sedeId,
      seccion: 'destacados',
      posicion,
      activo: true,
      asignado_por_ia: true,
      score_relevancia: 0.70,
    });

    console.log(`✅ Video YouTube colocado en [destacados] — ${video.youtube_id}`);
    return { seccion: 'destacados', youtube_id: video.youtube_id };
  } catch (error) {
    console.error('❌ Error en galleryVideoAgent:', error.message);
    throw error;
  }
}

/**
 * Reorganizar galería completa de una sede (cron o manual)
 * Reevalúa scores y redistribuye secciones
 */
async function reorganizarGaleria(sedeId) {
  try {
    console.log(`🔄 Reorganizando galería sede: ${sedeId}`);

    const items = await GaleriaItem.findAll({
      where: { sede_id: sedeId, activo: true },
      include: [{ model: Imagen, as: 'imagen' }],
      order: [['score_relevancia', 'DESC']],
    });

    // Reasignar secciones según score actualizado
    let idx = { portada: 0, destacados: 0, recientes: 0 };
    for (const item of items) {
      const seccion = _determinarSeccion(item.score_relevancia);
      const limite = SECCIONES[seccion].maxItems;

      if (idx[seccion] < limite) {
        await item.update({ seccion, posicion: idx[seccion] });
        idx[seccion]++;
      } else {
        await item.update({ seccion: 'recientes', posicion: idx.recientes });
        idx.recientes++;
      }
    }

    console.log(`✅ Galería reorganizada — Portada: ${idx.portada} | Destacados: ${idx.destacados} | Recientes: ${idx.recientes}`);
    return idx;
  } catch (error) {
    console.error('❌ Error reorganizando galería:', error.message);
    throw error;
  }
}

// ── HELPERS PRIVADOS ─────────────────────────────────────

async function _evaluarImagen(filename, contexto, buffer = null) {
  try {
    let imageBuffer;
    const ext = path.extname(filename || '').toLowerCase();
    const mediaType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg';

    if (buffer) {
      imageBuffer = buffer;
    } else {
      // Fallback legacy: leer desde disco
      const imagePath = path.join(__dirname, '../../uploads', filename);
      if (!fs.existsSync(imagePath)) {
        return { score: 0.5, alt_text: 'Imagen de actividad escolar' };
      }
      imageBuffer = fs.readFileSync(imagePath);
    }

    const base64 = imageBuffer.toString('base64');

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Eres el curador visual de una revista escolar colombiana.
Evalúa esta imagen para determinar su relevancia y calidad visual.
Contexto adicional: "${contexto || 'Actividad escolar'}"

Criterios de evaluación:
- Calidad visual (nitidez, iluminación, composición)
- Relevancia educativa / escolar
- Presencia de personas (estudiantes, docentes, eventos)
- Impacto visual para portada de revista

Responde SOLO en JSON:
{
  "score": 0.0 a 1.0,
  "alt_text": "descripción accesible máximo 120 caracteres en español",
  "razon": "por qué ese score en máximo 15 palabras"
}`,
          },
        ],
      }],
    });

    const texto = response.content[0].text.replace(/```json|```/g, '').trim();
    const resultado = JSON.parse(texto);
    return {
      score: Math.max(0, Math.min(1, resultado.score || 0.5)),
      alt_text: resultado.alt_text || 'Imagen de actividad escolar',
    };
  } catch {
    return { score: 0.5, alt_text: 'Imagen de actividad escolar' };
  }
}

function _determinarSeccion(score) {
  if (score >= SECCIONES.portada.minScore)    return 'portada';
  if (score >= SECCIONES.destacados.minScore) return 'destacados';
  return 'recientes';
}

async function _siguientePosicion(sedeId, seccion) {
  const ultimo = await GaleriaItem.findOne({
    where: { sede_id: sedeId, seccion, activo: true },
    order: [['posicion', 'DESC']],
  });
  return ultimo ? ultimo.posicion + 1 : 0;
}

async function _desplazarMenosRelevante(sedeId, seccion) {
  const menosRelevante = await GaleriaItem.findOne({
    where: { sede_id: sedeId, seccion, activo: true },
    order: [['score_relevancia', 'ASC']],
  });
  if (menosRelevante) {
    const posRecientes = await _siguientePosicion(sedeId, 'recientes');
    await menosRelevante.update({ seccion: 'recientes', posicion: posRecientes });
  }
}

module.exports = { galleryAgent, galleryVideoAgent, reorganizarGaleria };
