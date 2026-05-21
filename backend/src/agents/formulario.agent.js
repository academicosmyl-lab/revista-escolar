/**
 * agents/formulario.agent.js
 * Agente de mejora ortográfica para el formulario de registro docente.
 *
 * Modelo: claude-haiku (económico — ~0.001 USD por envío)
 * Responsabilidad: corrección ortográfica + tildes + mayúsculas
 * NO cambia el tono ni el contenido, solo la forma.
 *
 * Si falla (sin API key, timeout), devuelve los textos originales
 * para que el formulario siga funcionando sin IA.
 */
const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `Eres un corrector ortográfico especializado en perfiles profesionales de docentes colombianos.

REGLAS ABSOLUTAS:
1. Corrige SOLO: ortografía, tildes, mayúsculas al inicio de oración y nombres propios, puntuación básica.
2. NO añadas ni elimines información.
3. NO cambies el tono, la voz ni el estilo personal.
4. NO reformules frases, solo corrígelas.
5. Respeta vocabulario técnico, institucional y colombiano (ITS Santander, ICBF, SENA, etc.)
6. Si un campo está vacío o es null, devuélvelo como string vacío "".
7. Las observaciones son OPCIONALES. Solo inclúyelas si hay algo importante que el docente deba saber. Máximo 1 frase corta.

RESPONDE ÚNICAMENTE con JSON válido, sin texto adicional antes ni después:
{
  "titulo": "string",
  "bioCorta": "string",
  "bioCompleta": "string",
  "observaciones": "string o null"
}`;

async function mejorarTextoFormulario({ nombre, titulo, bioCorta, bioCompleta, rol }) {
  // Si no hay API key configurada, devolver originales
  if (!process.env.ANTHROPIC_API_KEY) {
    return { titulo: titulo || '', bioCorta: bioCorta || '', bioCompleta: bioCompleta || '', observaciones: null };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMsg = [
    `Rol: ${rol || 'Docente'}`,
    `Nombre: ${nombre || ''}`,
    `Título profesional: ${titulo || ''}`,
    `Bio corta (tarjeta): ${bioCorta || ''}`,
    `Bio completa (perfil): ${bioCompleta || ''}`,
  ].join('\n');

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL_IMAGENES || 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });

  const raw = response.content[0]?.text?.trim() || '{}';

  // Extraer JSON aunque venga con texto alrededor
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { titulo: titulo || '', bioCorta: bioCorta || '', bioCompleta: bioCompleta || '', observaciones: null };
  }

  const resultado = JSON.parse(jsonMatch[0]);

  return {
    titulo:        resultado.titulo        ?? titulo        ?? '',
    bioCorta:      resultado.bioCorta      ?? bioCorta      ?? '',
    bioCompleta:   resultado.bioCompleta   ?? bioCompleta   ?? '',
    observaciones: resultado.observaciones ?? null,
  };
}

module.exports = { mejorarTextoFormulario };
