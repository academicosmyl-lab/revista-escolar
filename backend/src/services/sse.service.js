/**
 * services/sse.service.js
 * Server-Sent Events — actualización en tiempo real
 * El frontend Angular se conecta una vez y recibe push automático
 * cuando se publica una noticia nueva, sin recargar la página
 */

// Mapa de clientes conectados: { clienteId → response }
const clientes = new Map();

const sseService = {

  /**
   * Registrar nuevo cliente SSE
   * Llamar desde la ruta GET /api/v1/sse/noticias
   */
  conectar(req, res) {
    // Headers SSE obligatorios
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Reflejar el origen del cliente si es un dominio permitido
    const reqOrigin = req.headers.origin || '';
    const sseOrigin = (
      reqOrigin === 'http://localhost:4200' ||
      /^https:\/\/revista-escolar[a-z0-9-]*\.vercel\.app$/.test(reqOrigin) ||
      /^https:\/\/[a-z0-9-]+-academicosmyl-lab\.vercel\.app$/.test(reqOrigin)
    ) ? reqOrigin : (process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Origin', sseOrigin);
    res.flushHeaders();

    const clienteId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    clientes.set(clienteId, res);
    console.log(`📡 SSE: cliente conectado [${clienteId}] — total: ${clientes.size}`);

    const limpiar = () => {
      clearInterval(ping);
      clearTimeout(timeout);
      clientes.delete(clienteId);
    };

    // Ping con try/catch — si falla la escritura, limpia inmediatamente
    const ping = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      } catch {
        limpiar();
        console.log(`📡 SSE: ping fallido, cliente removido [${clienteId}] — total: ${clientes.size}`);
      }
    }, 30000);

    // Timeout de 5 min: el cliente debe reconectarse (evita acumulación de memoria en Render)
    const timeout = setTimeout(() => {
      try { res.end(); } catch { /* ya cerrado */ }
      limpiar();
      console.log(`📡 SSE: timeout 5 min, cliente removido [${clienteId}] — total: ${clientes.size}`);
    }, 5 * 60 * 1000);

    // Mensaje inicial de confirmación
    try {
      res.write(`event: conectado\ndata: ${JSON.stringify({ clienteId, mensaje: 'Conectado a la Revista ITS' })}\n\n`);
    } catch { limpiar(); return; }

    // Limpiar al desconectar
    req.on('close', () => {
      limpiar();
      console.log(`📡 SSE: cliente desconectado [${clienteId}] — total: ${clientes.size}`);
    });
  },

  /**
   * Emitir evento a todos los clientes conectados
   * @param {string} evento - nombre del evento (ej: 'noticia_publicada')
   * @param {Object} datos - payload a enviar
   */
  emitir(evento, datos) {
    if (clientes.size === 0) return;

    const mensaje = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
    let desconectados = [];

    clientes.forEach((res, id) => {
      try {
        res.write(mensaje);
      } catch {
        desconectados.push(id);
      }
    });

    // Limpiar clientes caídos
    desconectados.forEach(id => clientes.delete(id));

    console.log(`📡 SSE: evento "${evento}" emitido a ${clientes.size} cliente(s)`);
  },

  /**
   * Emitir nueva noticia publicada
   */
  noticiaPublicada(noticia) {
    this.emitir('noticia_publicada', {
      id:          noticia.id,
      titulo:      noticia.titulo,
      resumen:     noticia.resumen,
      autor:       noticia.autor?.nombre,
      sede:        noticia.sede?.nombre,
      categoria:   noticia.categoria?.nombre,
      imagen:      noticia.imagenes?.[0]?.url,
      fecha:       noticia.fecha_publicacion,
    });
  },

  /**
   * Emitir actualización de galería (imagen nueva colocada por IA)
   */
  galeriaActualizada(sedeId, seccion) {
    this.emitir('galeria_actualizada', { sedeId, seccion, ts: Date.now() });
  },

  /**
   * Total de clientes conectados
   */
  totalClientes() {
    return clientes.size;
  },
};

module.exports = { sseService };
