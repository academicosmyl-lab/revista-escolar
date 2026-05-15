/**
 * services/excel.service.js
 * Exportación de datos a Excel (.xlsx) para consumo en Power BI
 * Genera hojas: Noticias, Docentes, Categorías, Visitas
 */
const ExcelJS = require('exceljs');
const { Noticia, Usuario, Categoria } = require('../models');

const excelService = {

  async generarReporteCompleto() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Revista Digital Escolar';
    workbook.created = new Date();

    // ─── Hoja 1: Noticias ────────────────────────────────
    const hojaNoticias = workbook.addWorksheet('Noticias');
    hojaNoticias.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Autor', key: 'autor', width: 25 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Visitas', key: 'visitas', width: 10 },
      { header: 'Fecha Publicación', key: 'fecha_publicacion', width: 20 },
      { header: 'Fecha Creación', key: 'created_at', width: 20 },
    ];

    // Estilo encabezados
    hojaNoticias.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hojaNoticias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    const noticias = await Noticia.findAll({
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
      ],
      order: [['created_at', 'DESC']],
    });

    noticias.forEach(n => {
      hojaNoticias.addRow({
        id: n.id,
        titulo: n.titulo,
        estado: n.estado,
        autor: n.autor?.nombre || 'Sin autor',
        categoria: n.categoria?.nombre || 'Sin categoría',
        visitas: n.visitas,
        fecha_publicacion: n.fecha_publicacion ? new Date(n.fecha_publicacion).toLocaleDateString('es-CO') : '',
        created_at: new Date(n.created_at).toLocaleDateString('es-CO'),
      });
    });

    // ─── Hoja 2: Docentes ─────────────────────────────────
    const hojaDocentes = workbook.addWorksheet('Docentes');
    hojaDocentes.columns = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Activo', key: 'activo', width: 10 },
      { header: 'Fecha Registro', key: 'created_at', width: 20 },
    ];
    hojaDocentes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hojaDocentes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };

    const docentes = await Usuario.findAll({ where: { rol: 'DOCENTE' } });
    docentes.forEach(d => {
      hojaDocentes.addRow({
        nombre: d.nombre,
        email: d.email,
        activo: d.activo ? 'Sí' : 'No',
        created_at: new Date(d.created_at).toLocaleDateString('es-CO'),
      });
    });

    // ─── Hoja 3: Resumen ─────────────────────────────────
    const hojaResumen = workbook.addWorksheet('Resumen Power BI');
    hojaResumen.addRow(['Métrica', 'Valor', 'Actualizado']);
    hojaResumen.getRow(1).font = { bold: true };

    const totalNoticias = await Noticia.count();
    const publicadas = await Noticia.count({ where: { estado: 'publicada' } });
    const pendientes = await Noticia.count({ where: { estado: 'pendiente' } });
    const totalDocentes = await Usuario.count({ where: { rol: 'DOCENTE' } });

    const hoy = new Date().toLocaleDateString('es-CO');
    hojaResumen.addRow(['Total Noticias', totalNoticias, hoy]);
    hojaResumen.addRow(['Noticias Publicadas', publicadas, hoy]);
    hojaResumen.addRow(['Noticias Pendientes', pendientes, hoy]);
    hojaResumen.addRow(['Total Docentes', totalDocentes, hoy]);

    console.log('✅ Reporte Excel generado para Power BI');
    return workbook;
  },
};

module.exports = { excelService };
