/**
 * routes/publicar.routes.js
 * Publicación de contenido — requiere login.
 * El rector/admin aprueba antes de publicar en la revista.
 */
const { Router } = require('express');
const { Noticia, Imagen, Sede } = require('../models');
const cloudinary = require('../services/cloudinary.service');
const emailService = require('../services/email.service');
const multer = require('multer');
const { autenticar, puedePublicar } = require('../middlewares/auth.middleware');

const router = Router();

// Multer en memoria — las imágenes van directo a Cloudinary
const uploadMem = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo JPG, PNG o WEBP'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// Elimina etiquetas HTML para prevenir XSS almacenado
function sanitize(str) {
  return String(str || '').replace(/<[^>]*>/g, '').trim();
}

// Helper para extraer ID de YouTube de cualquier URL
function extraerYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Helper respuesta
const ok  = (res, data, msg = '') => res.json({ ok: true, data, mensaje: msg });
const err = (res, msg, code = 400) => res.status(code).json({ ok: false, error: msg });

// GET /api/v1/publicar/mis-noticias — noticias propias (cualquier estado)
router.get('/mis-noticias', autenticar, async (req, res) => {
  try {
    const noticias = await Noticia.findAll({
      where:   { autor_id: req.usuario.id },
      include: [{ model: Imagen, as: 'imagenes', attributes: ['url','es_portada'], required: false }],
      order:   [['created_at', 'DESC']],
      limit:   20,
    });
    res.json({ ok: true, total: noticias.length, data: noticias });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/publicar/sedes — lista de sedes para el formulario
router.get('/sedes', async (req, res) => {
  try {
    const sedes = await Sede.findAll({
      where: { activa: true },
      attributes: ['id','nombre','slug'],
      order: [['nombre','ASC']],
    });
    ok(res, sedes);
  } catch (e) {
    err(res, e.message, 500);
  }
});

// POST /api/v1/publicar — enviar contenido a la revista (requiere login)
router.post('/', autenticar, puedePublicar, uploadMem.array('imagenes', 5), async (req, res) => {
  try {
    const {
      titulo: tituloRaw,
      descripcion: descripcionRaw,
      tipo_contenido,
      url_youtube,
      sede_nombre,
      para_portada,
    } = req.body;

    const titulo      = sanitize(tituloRaw);
    const descripcion = sanitize(descripcionRaw);

    // Validación básica
    if (!titulo)         return err(res, 'El título es requerido');
    if (!descripcion)    return err(res, 'La descripción es requerida');
    if (!tipo_contenido) return err(res, 'El tipo de contenido es requerido');

    if (titulo.length > 200)       return err(res, 'El título no puede superar 200 caracteres');
    if (descripcion.length > 5000) return err(res, 'La descripción no puede superar 5000 caracteres');

    if (tipo_contenido === 'video') {
      const ytId = extraerYoutubeId(url_youtube);
      if (!ytId) return err(res, 'URL de YouTube inválida o no reconocida');
    }

    // Construir contenido enriquecido con metadata del usuario autenticado
    const sedeInfo = sede_nombre ? ` | Sede: ${sanitize(sede_nombre)}` : '';
    const metadataHeader = `📋 ENVIADO POR: ${req.usuario.nombre} (${req.usuario.rol}${sedeInfo})\n\n`;

    let contenidoYoutube = '';
    if (tipo_contenido === 'video' && url_youtube) {
      const ytId = extraerYoutubeId(url_youtube);
      contenidoYoutube = `\n\n🎬 VIDEO: https://www.youtube.com/watch?v=${ytId}`;
    }

    // Buscar sede en BD si se especificó
    let sedeId = null;
    if (sede_nombre) {
      const sedeReg = await Sede.findOne({ where: { nombre: sanitize(sede_nombre), activa: true } });
      if (sedeReg) sedeId = sedeReg.id;
    }

    // ADMIN y RECTOR se auto-publican; los demás quedan en pendiente
    const autoPublicar = ['ADMIN', 'RECTOR'].includes(req.usuario.rol);
    const noticia = await Noticia.create({
      titulo,
      resumen:   `Enviado por: ${req.usuario.nombre} (${req.usuario.rol})`,
      contenido: metadataHeader + descripcion + contenidoYoutube,
      estado:    autoPublicar ? 'publicada' : 'pendiente',
      destacada:  para_portada === 'true' || para_portada === true,
      autor_id:  req.usuario.id,
      sede_id:   sedeId,
      fecha_publicacion: autoPublicar ? new Date() : null,
    });
    console.log(`✅ Noticia creada: id=${noticia.id} titulo="${titulo}" estado=${noticia.estado} autor=${req.usuario.email}`);

    // Responder inmediatamente — imágenes y email en segundo plano
    const msg = autoPublicar
      ? '¡Publicado! Ya aparece en la revista.'
      : 'Tu contenido fue enviado. El rector lo revisará antes de publicarlo.';
    ok(res, { id: noticia.id }, msg);

    // ── BACKGROUND: subir imágenes a Cloudinary (no bloquea la respuesta) ──
    if (req.files && req.files.length > 0) {
      const noticiaId  = noticia.id;
      const files      = req.files;
      const tituloSnap = titulo;
      console.log(`publicar bg: iniciando upload de ${files.length} imagen(es) para noticia ${noticiaId}`);
      console.log(`publicar bg: CLOUDINARY configurado=${!!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)}`);
      setImmediate(async () => {
        for (let i = 0; i < files.length; i++) {
          try {
            console.log(`publicar bg: subiendo imagen ${i + 1}/${files.length} (${files[i].size} bytes, ${files[i].mimetype})`);
            const result = await cloudinary.subirImagen(files[i].buffer, 'noticias');
            await Imagen.create({
              noticia_id:   noticiaId,
              filename:     result.public_id,
              url:          result.secure_url,
              alt_text:     `${tituloSnap} - imagen ${i + 1}`,
              es_portada:   i === 0,
              tamaño_bytes: files[i].size,
            });
            console.log(`publicar bg: imagen ${i + 1}/${files.length} guardada → ${result.secure_url}`);
          } catch (imgErr) {
            console.error(`publicar bg: imagen ${i + 1} FALLÓ: ${imgErr.message} | http_code=${imgErr.http_code ?? 'n/a'}`);
          }
        }
      });
    }

    // ── BACKGROUND: notificación por email ──
    setImmediate(async () => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await emailService.noticiaPendiente({
            adminEmail,
            docenteNombre: req.usuario.nombre,
            noticiaId:     noticia.id,
            noticiaTitulo: titulo,
            sedeName:      sede_nombre || 'Sin especificar',
          });
        }
      } catch (emailErr) {
        console.error('publicar bg: email falló:', emailErr.message);
      }
    });
  } catch (e) {
    console.error('publicar POST error:', e.message, e.stack);
    err(res, e.message || 'Error al enviar el contenido. Inténtalo de nuevo.', 500);
  }
});

module.exports = router;
