/**
 * routes/admin.routes.js — Panel de administración
 */
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { Noticia, Usuario, Categoria, Imagen } = require('../models');
const { autenticar, requiereRol } = require('../middlewares/auth.middleware');
const { excelService } = require('../services/excel.service');
const { errorLearningService } = require('../services/error-learning.service');
const { knowledgeService } = require('../services/knowledge.service');
const { crearError } = require('../middlewares/error.middleware');
const Joi = require('joi');

const router = Router();
router.use(autenticar, requiereRol('ADMIN', 'RECTOR'));

// GET /api/v1/admin/noticias — todas las noticias (con pendientes)
router.get('/noticias', async (req, res, next) => {
  try {
    const { estado, pagina = 1, limite = 20 } = req.query;
    const where = estado ? { estado } : {};

    const { count, rows } = await Noticia.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'autor', attributes: ['nombre', 'email'] },
        { model: Categoria, as: 'categoria', attributes: ['nombre', 'color'] },
        { model: Imagen, as: 'imagenes', attributes: ['url', 'es_portada'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limite),
      offset: (parseInt(pagina) - 1) * parseInt(limite),
    });

    res.json({ total: count, noticias: rows });
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/noticias/:id/aprobar
router.put('/noticias/:id/aprobar', async (req, res, next) => {
  try {
    const noticia = await Noticia.findByPk(req.params.id, {
      include: [{ model: Usuario, as: 'autor' }],
    });
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    await noticia.update({
      estado: 'publicada',
      fecha_publicacion: new Date(),
      motivo_rechazo: null,
    });

    // Guardar aprendizaje positivo
    await knowledgeService.guardarAprendizaje({
      docenteId: noticia.autor_id,
      email: noticia.autor?.email,
      noticiaId: noticia.id,
      aprendizajes: [`Noticia sobre "${noticia.titulo}" fue aprobada exitosamente`],
      estilo: 'Contenido aprobado por admin',
    });

    res.json({ mensaje: 'Noticia publicada exitosamente', noticia });
  } catch (err) { next(err); }
});

// PUT /api/v1/admin/noticias/:id/rechazar
router.put('/noticias/:id/rechazar', async (req, res, next) => {
  try {
    const { motivo } = req.body;
    if (!motivo) throw crearError('El motivo de rechazo es requerido', 400);

    const noticia = await Noticia.findByPk(req.params.id, {
      include: [{ model: Usuario, as: 'autor' }],
    });
    if (!noticia) throw crearError('Noticia no encontrada', 404);

    await noticia.update({ estado: 'rechazada', motivo_rechazo: motivo });

    // Registrar error para que el sistema aprenda
    await errorLearningService.registrarRechazo({
      docenteId: noticia.autor_id,
      motivoRechazo: motivo,
      noticiaId: noticia.id,
    });

    res.json({ mensaje: 'Noticia rechazada. Docente notificado.', noticia });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/estadisticas
router.get('/estadisticas', async (req, res, next) => {
  try {
    const { coordinador } = require('../agents/coordinator.agent');
    const stats = await coordinador({
      tipo: 'estadisticas',
      datos: { periodo: req.query.periodo || 'mes' },
      usuario: req.usuario,
    });
    res.json({ estadisticas: stats });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/exportar — exportar Excel para Power BI
router.get('/exportar', async (req, res, next) => {
  try {
    const workbook = await excelService.generarReporteCompleto();
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `revista-escolar-${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

// POST /api/v1/admin/usuarios — crear docente
router.post('/usuarios', async (req, res, next) => {
  try {
    const schema = Joi.object({
      nombre: Joi.string().min(3).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      rol: Joi.string().valid('DOCENTE', 'ADMIN').default('DOCENTE'),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw crearError(error.details[0].message, 400);

    const existe = await Usuario.findOne({ where: { email: value.email } });
    if (existe) throw crearError('Este email ya está registrado', 409);

    const password_hash = await bcrypt.hash(value.password, 12);
    const usuario = await Usuario.create({ ...value, password_hash });

    const { password_hash: _, ...usuarioLimpio } = usuario.dataValues;
    res.status(201).json({ usuario: usuarioLimpio });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/usuarios
router.get('/usuarios', async (req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });
    res.json({ usuarios });
  } catch (err) { next(err); }
});

// POST /api/v1/admin/seed-demo — poblar base de datos con datos de demostración
router.post('/seed-demo', async (req, res, next) => {
  try {
    const { seedDemo } = require('../utils/seed-demo');
    await seedDemo();
    res.json({
      ok: true,
      mensaje: 'Seed demo ejecutado correctamente.',
      datos: {
        sedes: 3, usuarios: 14, cursos: 19,
        noticias: 15, galeria: 15, videos: 3,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
