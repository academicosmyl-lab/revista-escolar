/**
 * middlewares/upload.middleware.js
 * Configuración de Multer para subida de imágenes
 * Máximo 2 fotos por noticia, 5MB cada una
 */
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_PATH = path.join(__dirname, '../../uploads');
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '5');
const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Crear carpeta de uploads si no existe
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreUnico = `${uuidv4()}${ext}`;
    cb(null, nombreUnico);
  },
});

const fileFilter = (req, file, cb) => {
  if (FORMATOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido. Solo se aceptan: JPG, PNG, WEBP`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 2, // máximo 2 fotos por noticia
  },
});

module.exports = { upload };
