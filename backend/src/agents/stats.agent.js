/**
 * agents/stats.agent.js
 * Agente de estadísticas — prepara datos para Power BI y reportes Excel
 */
const { Noticia, Usuario, Categoria } = require('../models');
const { Op } = require('sequelize');

/**
 * Generar resumen estadístico completo
 * @param {Object} datos - { periodo: 'semana' | 'mes' | 'año' }
 */
async function statsAgent(datos = {}, usuario) {
  const { periodo = 'mes' } = datos;

  try {
    // Calcular fecha de inicio según periodo
    const ahora = new Date();
    const fechaInicio = new Date();
    if (periodo === 'semana') fechaInicio.setDate(ahora.getDate() - 7);
    else if (periodo === 'mes') fechaInicio.setMonth(ahora.getMonth() - 1);
    else if (periodo === 'año') fechaInicio.setFullYear(ahora.getFullYear() - 1);

    // Consultas paralelas para eficiencia
    const [
      totalNoticias,
      noticiasPublicadas,
      noticiasPendientes,
      totalDocentes,
      docentesActivos,
      noticiasPorCategoria,
      ultimasNoticias,
    ] = await Promise.all([
      Noticia.count(),
      Noticia.count({ where: { estado: 'publicada' } }),
      Noticia.count({ where: { estado: 'pendiente' } }),
      Usuario.count({ where: { rol: 'DOCENTE' } }),
      Usuario.count({ where: { rol: 'DOCENTE', activo: true } }),
      Noticia.findAll({
        attributes: ['categoria_id'],
        include: [{ model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] }],
        where: { estado: 'publicada', created_at: { [Op.gte]: fechaInicio } },
        group: ['categoria_id', 'categoria.id'],
      }),
      Noticia.findAll({
        where: { estado: 'publicada' },
        order: [['fecha_publicacion', 'DESC']],
        limit: 5,
        attributes: ['id', 'titulo', 'visitas', 'fecha_publicacion'],
        include: [
          { model: Usuario, as: 'autor', attributes: ['nombre'] },
          { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        ],
      }),
    ]);

    const estadisticas = {
      generado_en: ahora.toISOString(),
      periodo,
      resumen: {
        total_noticias: totalNoticias,
        noticias_publicadas: noticiasPublicadas,
        noticias_pendientes: noticiasPendientes,
        total_docentes: totalDocentes,
        docentes_activos: docentesActivos,
      },
      por_categoria: noticiasPorCategoria.map(n => ({
        categoria: n.categoria?.nombre || 'Sin categoría',
        color: n.categoria?.color || '#888',
        total: n.dataValues.count || 1,
      })),
      ultimas_noticias: ultimasNoticias.map(n => ({
        id: n.id,
        titulo: n.titulo,
        autor: n.autor?.nombre,
        categoria: n.categoria?.nombre,
        visitas: n.visitas,
        fecha: n.fecha_publicacion,
      })),
    };

    console.log(`📊 Estadísticas generadas — Periodo: ${periodo}`);
    return estadisticas;

  } catch (error) {
    console.error('❌ Error en statsAgent:', error.message);
    throw error;
  }
}

module.exports = { statsAgent };
