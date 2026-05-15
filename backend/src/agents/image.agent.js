/**
 * agents/image.agent.js
 * Agente para validar imágenes y generar descripciones ALT con IA
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Procesar imagen: generar descripción ALT automática con IA
 * @param {Object} datos - { filepath, filename, noticia_titulo }
 */
async function imageAgent(datos, usuario) {
  const { filepath, filename, noticia_titulo } = datos;

  try {
    // Leer imagen y convertir a base64
    const imagePath = path.join(__dirname, '../../uploads', filename);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');

    // Detectar tipo de imagen
    const ext = path.extname(filename).toLowerCase();
    const mediaTypeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const mediaType = mediaTypeMap[ext] || 'image/jpeg';

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Esta imagen es para una noticia escolar titulada: "${noticia_titulo || 'Evento escolar'}".
Genera una descripción ALT accesible y descriptiva (máximo 150 caracteres) en español.
Responde SOLO con el texto del ALT, sin comillas ni explicaciones adicionales.`,
          },
        ],
      }],
    });

    const altText = response.content[0].text.trim().substring(0, 300);
    console.log(`✅ ALT generado para imagen: ${filename}`);

    return { altText, procesada: true };

  } catch (error) {
    console.error('❌ Error en imageAgent:', error.message);
    // Fallback: ALT genérico
    return {
      altText: `Imagen de evento escolar — ${noticia_titulo || 'Actividad académica'}`,
      procesada: false,
    };
  }
}

module.exports = { imageAgent };
