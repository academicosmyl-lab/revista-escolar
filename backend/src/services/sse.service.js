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
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.flushHeaders();

    const clienteId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    clientes.set(clienteId, res);
    console.log(`📡 SSE: cliente conectado [${clienteId}] — total: ${clientes.size}`);

    // Ping cada 30 segundos para mantener la conexión viva
    const ping = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 30000);

    // Mensaje inicial de confirmación
    res.write(`event: conectado\ndata: ${JSON.stringify({ clienteId, mensaje: 'Conectado a la Revista ITS' })}\n\n`);

    // Limpiar al desconectar
    req.on('close', () => {
      clearInterval(ping);
      clientes.delete(clienteId);
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
