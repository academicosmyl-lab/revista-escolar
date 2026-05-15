/**
 * server.js — Instituto Técnico Industrial Santander
 * Revista Digital v3.0 — Punto de entrada
 *
 * Responsabilidad: DB sync + seed + app.listen
 * La configuración de Express está en app.js
 */
require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./config/database');
const { emailService } = require('./services/email.service');
const { sincronizarNoticiasExternas } = require('./jobs/noticias-externas.job');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    // Sincronizar base de datos
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    } else {
      await sequelize.sync({ force: false });
    }
    console.log('✅ Base de datos sincronizada');

    // Auto-seed demo si la BD está vacía
    try {
      const { Usuario } = require('./models');
      const total = await Usuario.count();
      if (total === 0) {
        console.log('⚡ BD vacía — ejecutando seed demo automático...');
        const { seedDemo } = require('./utils/seed-demo');
        await seedDemo();
        console.log('✅ Seed demo completado automáticamente');
      }
    } catch (seedErr) {
      console.error('⚠️  Auto-seed falló (no crítico):', seedErr.message);
    }

    // Verificar email (no bloqueante)
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });

    // Cron en producción: noticias externas cada hora
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
