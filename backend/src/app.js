/**
 * app.js — Express app (sin listen ni sync)
 * Importado por server.js (producción) y por los tests
 */
require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const { errorHandler } = require('./middlewares/error.middleware');

// ── Rutas ─────────────────────────────────────────────────
const healthRoutes           = require('./routes/health.routes');
const authRoutes             = require('./routes/auth.routes');
const noticiasRoutes         = require('./routes/noticias.routes');
const categoriasRoutes       = require('./routes/categorias.routes');
const adminRoutes            = require('./routes/admin.routes');
const agentesRoutes          = require('./routes/agentes.routes');
const sedesRoutes            = require('./routes/sedes.routes');
const cursosRoutes           = require('./routes/cursos.routes');
const perfilRoutes           = require('./routes/perfil.routes');
const galeriaRoutes          = require('./routes/galeria.routes');
const noticiasExternasRoutes = require('./routes/noticias-externas.routes');
const inclusionRoutes        = require('./routes/inclusion.routes');
const panelDocenteRoutes     = require('./routes/panel-docente.routes');
const sseRoutes              = require('./routes/sse.routes');
const superAdminRoutes       = require('./routes/super-admin.routes');
const formularioRoutes       = require('./routes/formulario.routes');
const areasRoutes            = require('./routes/areas.routes');
const indicadoresRoutes      = require('./routes/indicadores.routes');
const publicarRoutes         = require('./routes/publicar.routes');

const app = express();

// Render y Cloudflare actúan como proxy — necesario para express-rate-limit
app.set('trust proxy', 1);

// ── Seguridad ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const CORS_ALLOWED = [
  'https://revista-escolar-zeta.vercel.app',
  'https://academicosmyl-lab.github.io',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT,
  'http://localhost:4200',
  'http://localhost:4000',
].filter(Boolean);

console.log('🌐 CORS orígenes permitidos:', CORS_ALLOWED);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Lista exacta + cualquier preview de Vercel
    if (CORS_ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+-academicosmyl-lab\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cache-Control'],
  credentials: true,
}));

// ── Parsers ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Archivos estáticos ─────────────────────────────────────
app.use('/public', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../public')));

// ── Health (antes del rate limiter para que Render pueda verificar el deploy) ──
app.use('/api/v1',                   healthRoutes);

// Rate limiting (desactivado en test para no interferir)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
  }));
  // Auth: máximo 5 intentos por minuto para dificultar fuerza bruta
  app.use('/api/v1/auth', rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: { error: 'Demasiados intentos de login. Espera un minuto.' },
  }));
}

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/v1/auth',              authRoutes);
app.use('/api/v1/noticias',          noticiasRoutes);
app.use('/api/v1/categorias',        categoriasRoutes);
app.use('/api/v1/admin',             adminRoutes);
app.use('/api/v1/agentes',           agentesRoutes);
app.use('/api/v1/sedes',             sedesRoutes);
app.use('/api/v1/cursos',            cursosRoutes);
app.use('/api/v1/perfil',            perfilRoutes);
app.use('/api/v1/galeria',           galeriaRoutes);
app.use('/api/v1/noticias-externas', noticiasExternasRoutes);
app.use('/api/v1/inclusion',         inclusionRoutes);
app.use('/api/v1/panel',             panelDocenteRoutes);
app.use('/api/v1/sse',               sseRoutes);
app.use('/api/v1/super-admin',      superAdminRoutes);
app.use('/api/v1/formulario',       formularioRoutes);
app.use('/api/v1/areas',           areasRoutes);
app.use('/api/v1/indicadores',    indicadoresRoutes);
app.use('/api/v1/publicar',       publicarRoutes);

// ── Errores ───────────────────────────────────────────────
app.use(errorHandler);
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

module.exports = app;