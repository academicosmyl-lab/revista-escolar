/**
 * server.js — Instituto Técnico Industrial Santander
 * Revista Digital v3.0 — VERSIÓN FINAL
 *
 * Stack: Express · Sequelize · Cloudinary · Nodemailer · SSE
 * Agentes: Noticias · Imágenes · Galería · Estadísticas · Externas
 * Roles: ADMIN · RECTOR · COORDINADOR · ORIENTADORA · DOCENTE · PERSONAL
 */
require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./config/database');
const { errorHandler } = require('./middlewares/error.middleware');
const { emailService } = require('./services/email.service');
const { sincronizarNoticiasExternas } = require('./jobs/noticias-externas.job');

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

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Seguridad ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Angular maneja su propio CSP
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Cache-Control'],
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
}));
app.use('/api/v1/auth', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login.' },
}));

// ── Parsers ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/v1',                   healthRoutes);
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
app.use('/api/v1/sse',               sseRoutes);  // tiempo real

// ── Errores ───────────────────────────────────────────────
app.use(errorHandler);
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

// ── Iniciar ───────────────────────────────────────────────
async function iniciar() {
  try {
    // Sincronizar base de datos
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    } else {
      await sequelize.sync({ force: false }); // crea tablas si no existen, nunca las borra
    }
    console.log('✅ Base de datos sincronizada');

    // Verificar email (no bloqueante — no retrasa el arranque del servidor)
    emailService.verificar().then(emailOk => {
      console.log(emailOk.ok ? '✅ Email configurado' : `⚠️  Email: ${emailOk.error}`);
    }).catch(() => console.log('⚠️  Email: no se pudo verificar'));

    app.listen(PORT, () => {
      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫  Instituto Técnico Industrial Santander
📰  Revista Digital v3.0 — ${process.env.NODE_ENV}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  Servidor: http://localhost:${PORT}
🔗  Health:   http://localhost:${PORT}/api/v1/health
📡  SSE:      http://localhost:${PORT}/api/v1/sse/noticias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫  Sedes:    Bachillerato · Básica Primaria · Los Sauces
👥  Roles:    ADMIN · RECTOR · COORDINADOR · ORIENTADORA · DOCENTE · PERSONAL
🤖  Agentes:  Noticias · Imágenes · Galería · Estadísticas · Externas
♿  Inclusión: Panel de condiciones especiales activo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });

    // Cron en producción: noticias externas de Colombia cada hora
    if (process.env.NODE_ENV === 'production') {
      console.log('⏰ Iniciando cron de noticias externas...');
      setTimeout(() => {
        sincronizarNoticiasExternas().catch(e => console.error('Error noticias externas:', e.message));
        setInterval(sincronizarNoticiasExternas, 60 * 60 * 1000);
      }, 5000);
    }

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();
module.exports = app;
