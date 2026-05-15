/**
 * services/cloudinary.service.js
 * Manejo de imágenes con Cloudinary (plan gratis = 25 GB)
 * Las imágenes NO se guardan en el servidor — van directo a la nube
 * Así no se pierden cuando Railway reinicia el contenedor
 */
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configurar Cloudinary con las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage para multer — sube directo a Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const folder = req.body.tipo === 'perfil'
      ? 'its-santander/perfiles'
      : req.body.tipo === 'inclusion'
      ? 'its-santander/inclusion'
      : 'its-santander/noticias';

    return {
      folder,
      format: ['jpg','jpeg','png','webp'].includes(ext) ? 'webp' : ext,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  },
});

// Validar tipos permitidos
const fileFilter = (req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
  }
};

// Upload para noticias (máx 2 fotos, 5 MB c/u)
const uploadNoticias = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
});

// Upload para perfil (1 foto)
const uploadPerfil = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});

// Upload para documentos (PDF, Word, Excel — va a Cloudinary raw)
const storageDocumentos = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'its-santander/documentos',
    resource_type: 'raw',
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
  },
});

const uploadDocumento = multer({
  storage: storageDocumentos,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
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
  },
});

/**
 * Eliminar imagen de Cloudinary por public_id
 */
async function eliminarImagen(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Imagen eliminada de Cloudinary: ${publicId}`);
  } catch (err) {
    console.error('Error eliminando imagen de Cloudinary:', err.message);
  }
}

/**
 * Obtener URL optimizada para una imagen
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
  eliminarImagen,
  urlOptimizada,
};
