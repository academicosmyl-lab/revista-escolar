/**
 * jobs/noticias-externas.job.js
 * Cron job: cada hora busca noticias de logros académicos de Colombia
 * Fuentes: MEN, El Tiempo Educación, Colciencias, Universia Colombia, ICETEX
 * La IA evalúa relevancia y solo guarda las que superen el umbral
 */
const Anthropic = require('@anthropic-ai/sdk');
const { NoticiaExterna } = require('../models');
const { Op } = require('sequelize');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Fuentes RSS de noticias educativas de Colombia
const FUENTES_RSS = [
  {
    nombre: 'Ministerio de Educación Nacional',
    url: 'https://www.mineducacion.gov.co/portal/rss',
    tipo: 'gobierno',
  },
  {
    nombre: 'Colciencias / Minciencias',
    url: 'https://minciencias.gov.co/feed',
    tipo: 'ciencia',
  },
  {
    nombre: 'El Tiempo — Educación',
    url: 'https://www.eltiempo.com/rss/educacion.xml',
    tipo: 'prensa',
  },
  {
    nombre: 'Universia Colombia',
    url: 'https://www.universia.net/co/rss.xml',
    tipo: 'universitario',
  },
];

const RELEVANCIA_MINIMA = 0.60; // solo guardar si supera este umbral

/**
 * Ejecutar sincronización de noticias externas
 * Llamar manualmente o programar con setInterval
 */
async function sincronizarNoticiasExternas() {
  console.log('📰 Sincronizando noticias externas de Colombia...');
  let guardadas = 0;
  let descartadas = 0;

  for (const fuente of FUENTES_RSS) {
    try {
      const articulos = await _obtenerArticulosRSS(fuente.url);

      for (const articulo of articulos.slice(0, 10)) {
        // Verificar si ya existe
        const existe = await NoticiaExterna.findOne({
          where: { url_original: articulo.url },
        });
        if (existe) continue;

        // Evaluar relevancia con IA
        const score = await _evaluarRelevancia(articulo.titulo, articulo.resumen);

        if (score >= RELEVANCIA_MINIMA) {
          await NoticiaExterna.create({
            titulo: articulo.titulo.substring(0, 300),
            resumen: articulo.resumen?.substring(0, 1000),
            url_original: articulo.url,
            fuente: fuente.nombre,
            imagen_url: articulo.imagen,
            fecha_publicacion: articulo.fecha || new Date(),
            activa: true,
            relevancia_score: score,
          });
          guardadas++;
        } else {
          descartadas++;
        }
      }
    } catch (error) {
      console.error(`⚠️ Error en fuente ${fuente.nombre}:`, error.message);
    }
  }

  // Desactivar noticias externas con más de 30 días
  await NoticiaExterna.update(
    { activa: false },
    { where: { fecha_publicacion: { [Op.lt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }
  );

  console.log(`✅ Noticias externas: ${guardadas} guardadas, ${descartadas} descartadas por relevancia`);
  return { guardadas, descartadas };
}

/**
 * Obtener artículos de un feed RSS (sin dependencias externas — fetch nativo)
 */
async function _obtenerArticulosRSS(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'RevistEscolar/1.0' },
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const articulos = [];

    // Parser RSS básico con regex (sin dependencias)
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const item of items) {
      const titulo  = _extraerTag(item, 'title');
      const enlace  = _extraerTag(item, 'link') || _extraerTag(item, 'guid');
      const desc    = _extraerTag(item, 'description');
      const fecha   = _extraerTag(item, 'pubDate');
      const imagen  = item.match(/url="([^"]+\.(jpg|png|webp))"/i)?.[1] ||
                      item.match(/<media:content[^>]+url="([^"]+)"/)?.[1];

      if (titulo && enlace) {
        articulos.push({
          titulo: _limpiarHTML(titulo),
          url: enlace.trim(),
          resumen: _limpiarHTML(desc || '').substring(0, 500),
          fecha: fecha ? new Date(fecha) : new Date(),
          imagen: imagen || null,
        });
      }
    }

    return articulos;
  } catch (error) {
    console.error(`Error RSS ${url}:`, error.message);
    return [];
  }
}

/**
 * Evaluar relevancia de una noticia con IA
 * @returns {number} score 0.0 a 1.0
 */
async function _evaluarRelevancia(titulo, resumen) {
  try {
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Evalúa si esta noticia es relevante para una institución educativa técnica colombiana de bachillerato y primaria.
Criterios positivos: logros académicos, becas, olimpiadas, ciencia, tecnología, deportes escolares, cultura, educación pública en Colombia.
Criterios negativos: política, economía general, entretenimiento, noticias internacionales sin relación educativa.

Título: "${titulo}"
Resumen: "${resumen?.substring(0, 300)}"

Responde SOLO con un número decimal entre 0.0 y 1.0. Sin texto adicional.`,
      }],
    });

    const texto = response.content[0].text.trim();
    const score = parseFloat(texto);
    return isNaN(score) ? 0 : Math.max(0, Math.min(1, score));
  } catch {
    return 0;
  }
}

function _extraerTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? (match[1] || match[2] || '').trim() : '';
}

function _limpiarHTML(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

module.exports = { sincronizarNoticiasExternas };
