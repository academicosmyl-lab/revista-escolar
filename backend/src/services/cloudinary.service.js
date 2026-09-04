/**
 * services/cloudinary.service.js
 * Manejo de imágenes con Cloudinary v2 (plan gratis = 25 GB)
 * Las imágenes NO se guardan en el servidor — van directo a la nube
 */
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer con memoria — el buffer se sube directo a Cloudinary
const memStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (permitidos.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
};

const fileFilterDocs = (req, file, cb) => {
  const tipos = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp',
  ];
  if (tipos.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido'), false);
};

const uploadNoticias  = multer({ storage: memStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 2 } });
const uploadPerfil    = multer({ storage: memStorage, fileFilter, limits: { fileSize: 3 * 1024 * 1024, files: 1 } });
const uploadDocumento = multer({ storage: memStorage, fileFilter: fileFilterDocs, limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

/**
 * Sube un buffer a Cloudinary usando base64 (más fiable que streaming en Render)
 */
function subirBuffer(buffer, opciones = {}) {
  const mime = opciones._mimetype || 'image/jpeg';
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
  const { _mimetype, ...opts } = opciones;
  return cloudinary.uploader.upload(dataUri, opts);
}

/**
 * Sube imagen de noticia/seguimiento a Cloudinary
 */
async function subirImagen(buffer, tipo = 'noticias', mimetype = 'image/jpeg') {
  const folder = tipo === 'perfil'
    ? 'its-santander/perfiles'
    : tipo === 'inclusion'
    ? 'its-santander/inclusion'
    : tipo === 'seguimiento'
    ? 'its-santander/seguimiento'
    : 'its-santander/noticias';

  return subirBuffer(buffer, {
    folder,
    format: 'webp',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    _mimetype: mimetype,
  });
}

/**
 * Sube documento (PDF, Word, Excel) a Cloudinary como raw
 */
async function subirDocumento(buffer, nombreOriginal) {
  return subirBuffer(buffer, {
    folder: 'its-santander/documentos',
    resource_type: 'raw',
    public_id: `${Date.now()}-${nombreOriginal.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
  });
}

/**
 * Eliminar imagen de Cloudinary por public_id
 */
async function eliminarImagen(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error eliminando imagen de Cloudinary:', err.message);
  }
}

/**
 * URL optimizada para una imagen
 */
function urlOptimizada(publicId, opciones = {}) {
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto',
    ...opciones,
  });
}

module.exports = {
  cloudinary,
  uploadNoticias,
  uploadPerfil,
  uploadDocumento,
  subirImagen,
  subirDocumento,
  eliminarImagen,
  urlOptimizada,
};
