/**
 * routes/perfil.routes.js — Perfil público y edición del docente
 */
const { Router } = require('express');
const { Usuario, PerfilDocente, Noticia, Imagen } = require('../models');
const { autenticar } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { galleryAgent } = require('../agents/gallery.agent');
const { crearError } = require('../middlewares/error.middleware');

const router = Router();

// GET /api/v1/perfil/docentes — lista pública de docentes con perfil
router.get('/docentes', async (req, res, next) => {
  try {
    const { sede_id } = req.query;
    const whereUsuario = { rol: 'DOCENTE', activo: true };
    if (sede_id) whereUsuario.sede_principal_id = sede_id;

    const docentes = await Usuario.findAll({
      where: whereUsuario,
      attributes: ['id', 'nombre', 'email'],
      include: [{
        model: PerfilDocente, as: 'perfil',
        where: { perfil_publico: true },
        required: false,
        attributes: ['foto_url','titulo_profesional','bio','logros','proyectos','url_blog','url_linkedin'],
      }],
      order: [['nombre', 'ASC']],
    });

    res.json({ docentes });
  } catch (err) { next(err); }
});

// GET /api/v1/perfil/:id — perfil público completo de un docente
router.get('/:id', async (req, res, next) => {
  try {
    const docente = await Usuario.findOne({
      where: { id: req.params.id, rol: 'DOCENTE', activo: true },
      attributes: ['id', 'nombre', 'email'],
      include: [
        {
          model: PerfilDocente, as: 'perfil',
          where: { perfil_publico: true },
          required: false,
        },
        {
          model: Noticia, as: 'noticias',
          where: { estado: 'publicada' },
          required: false,
          limit: 5,
          order: [['fecha_publicacion', 'DESC']],
          include: [{ model: Imagen, as: 'imagenes', attributes: ['url','alt_text','es_portada'] }],
        },
      ],
    });

    if (!docente) throw crearError('Docente no encontrado', 404);
    res.json({ docente });
  } catch (err) { next(err); }
});

// GET /api/v1/perfil/mio/datos — el docente ve su propio perfil completo
router.get('/mio/datos', autenticar, async (req, res, next) => {
  try {
    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) {
      // Crear perfil vacío si no existe
      perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });
    }
    res.json({ perfil });
  } catch (err) { next(err); }
});

// PUT /api/v1/perfil/mio/datos — el docente actualiza su perfil
router.put('/mio/datos', autenticar, async (req, res, next) => {
  try {
    const {
      titulo_profesional, bio,
      estudios, cualidades_intelectuales, cualidades_fisicas,
      logros, proyectos,
      url_blog, url_linkedin, url_researchgate, url_orcid,
      perfil_publico,
    } = req.body;

    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) {
      perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });
    }

    await perfil.update({
      titulo_profesional, bio,
      estudios:               typeof estudios === 'string' ? JSON.parse(estudios) : estudios,
      cualidades_intelectuales: typeof cualidades_intelectuales === 'string' ? JSON.parse(cualidades_intelectuales) : cualidades_intelectuales,
      cualidades_fisicas:     typeof cualidades_fisicas === 'string' ? JSON.parse(cualidades_fisicas) : cualidades_fisicas,
      logros:     typeof logros === 'string' ? JSON.parse(logros) : logros,
      proyectos:  typeof proyectos === 'string' ? JSON.parse(proyectos) : proyectos,
      url_blog, url_linkedin, url_researchgate, url_orcid,
      perfil_publico,
      ultima_actualizacion: new Date(),
    });

    res.json({ perfil, mensaje: 'Perfil actualizado exitosamente' });
  } catch (err) { next(err); }
});

// POST /api/v1/perfil/mio/foto — subir foto de perfil (1 imagen)
router.post('/mio/foto', autenticar, upload.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) throw crearError('Debes subir una imagen', 400);

    let perfil = await PerfilDocente.findOne({ where: { usuario_id: req.usuario.id } });
    if (!perfil) perfil = await PerfilDocente.create({ usuario_id: req.usuario.id });

    // Guardar imagen y procesar con agente de galería
    const imagen = await Imagen.create({
      perfil_id: perfil.id,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      alt_text: `Foto de ${req.usuario.nombre}`,
      tamaño_bytes: req.file.size,
      es_portada: true,
    });

    // Actualizar URL en perfil
    await perfil.update({ foto_url: `/uploads/${req.file.filename}` });

    res.json({ foto_url: perfil.foto_url, imagen });
  } catch (err) { next(err); }
});

module.exports = router;
