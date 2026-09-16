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

// Evitar que errores no manejados derriben el proceso en Render
process.on('uncaughtException', err => {
  console.error('❌ uncaughtException (proceso sigue):', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection (proceso sigue):', reason);
});

async function iniciar() {
  try {
    // Sincronizar base de datos — solo crea tablas que no existen, nunca borra datos
    await sequelize.sync();
    console.log('✅ Base de datos sincronizada');

    // Auto-seed demo solo en desarrollo (nunca en producción — protege datos reales)
    if (process.env.NODE_ENV !== 'production') {
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
    }

    // Auto-seed Super Admin si las variables de entorno están definidas
    if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      try {
        const bcrypt  = require('bcryptjs');
        const { Usuario } = require('./models');
        const existente = await Usuario.findOne({ where: { email: process.env.SUPER_ADMIN_EMAIL } });
        if (!existente) {
          const hash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12);
          await Usuario.create({
            nombre:        process.env.SUPER_ADMIN_NOMBRE || 'Ronald Medina',
            email:         process.env.SUPER_ADMIN_EMAIL,
            password_hash: hash,
            rol:           'ADMIN',
            activo:        true,
            es_raiz:       true,
          });
          console.log(`✅ Super Admin creado: ${process.env.SUPER_ADMIN_EMAIL}`);
        } else if (existente.rol !== 'ADMIN' || !existente.es_raiz) {
          await existente.update({ rol: 'ADMIN', activo: true, es_raiz: true });
          console.log(`✅ Super Admin actualizado: ${process.env.SUPER_ADMIN_EMAIL}`);
        } else {
          console.log(`ℹ️  Super Admin ya existe: ${process.env.SUPER_ADMIN_EMAIL}`);
        }
      } catch (saErr) {
        console.error('⚠️  Super Admin seed falló (no crítico):', saErr.message);
      }
    }

    // Garantizar cuenta de gestión de contenidos (siempre ADMIN, activa)
    try {
      const bcrypt  = require('bcryptjs');
      const { Usuario } = require('./models');
      const CONTENT_EMAIL = 'admon.sistema@colegioitifusagasuga.edu.co';
      const CONTENT_PASS  = process.env.CONTENT_ADMIN_PASSWORD || 'Itis2025*';
      const content = await Usuario.findOne({ where: { email: CONTENT_EMAIL } });
      if (!content) {
        const hash = await bcrypt.hash(CONTENT_PASS, 12);
        await Usuario.create({
          nombre: 'Administradora Sistemas ITIS',
          email:  CONTENT_EMAIL,
          password_hash: hash,
          rol:    'ADMIN',
          activo: true,
          es_raiz: false,
        });
        console.log(`✅ Cuenta de contenidos creada: ${CONTENT_EMAIL}`);
      } else if (content.rol !== 'ADMIN' || !content.activo) {
        await content.update({ rol: 'ADMIN', activo: true });
        console.log(`✅ Cuenta de contenidos restaurada: ${CONTENT_EMAIL}`);
      }
    } catch (cErr) {
      console.error('⚠️  Cuenta de contenidos seed falló (no crítico):', cErr.message);
    }

    // Seed datos base: sedes, áreas, categorías (findOrCreate — nunca borra datos existentes)
    try {
      const { Sede, Area, Categoria } = require('./models');
      const sedesBase = [
        { nombre: 'Técnico Industrial Bachillerato',     slug: 'tecnico-industrial-bachillerato',     tipo: 'bachillerato',    activa: true, color_institucional: '#A94455' },
        { nombre: 'Técnico Industrial Básica Primaria',  slug: 'tecnico-industrial-basica-primaria',  tipo: 'basica_primaria', activa: true, color_institucional: '#3A7D5C' },
        { nombre: 'Técnico Industrial Rural Los Sauces', slug: 'tecnico-industrial-rural-los-sauces', tipo: 'rural',           activa: true, color_institucional: '#A05C2E' },
      ];
      for (const s of sedesBase) await Sede.findOrCreate({ where: { slug: s.slug }, defaults: s });

      const areasBase = [
        'Matemáticas', 'Ciencias Naturales', 'Lenguaje', 'Ciencias Sociales',
        'Tecnología e Informática', 'Inglés', 'Educación Física', 'Artes',
        'Ética y Valores', 'Técnica Industrial',
      ];
      for (const nombre of areasBase) await Area.findOrCreate({ where: { nombre }, defaults: { nombre, activa: true } });

      const catsBase = [
        { nombre: 'Académico',  color: '#A94455' }, { nombre: 'Deportivo',  color: '#3A7D5C' },
        { nombre: 'Cultural',   color: '#D4A853' }, { nombre: 'Tecnología', color: '#4A7FB5' },
        { nombre: 'Comunidad',  color: '#5BA08A' }, { nombre: 'Logros',     color: '#7C6D9F' },
        { nombre: 'Anuncios',   color: '#6B7280' },
      ];
      for (const c of catsBase) await Categoria.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
      console.log('✅ Datos base listos (sedes, áreas, categorías)');
    } catch (baseErr) {
      console.error('⚠️  Seed datos base falló (no crítico):', baseErr.message);
    }

    // Verificar email (no bloqueante)
    emailService.verificar().then(emailOk => {
      console.log(emailOk.ok ? '✅ Email configurado' : `⚠️  Email: ${emailOk.error}`);
    }).catch(() => console.log('⚠️  Email: no se pudo verificar'));

    app.listen(PORT, () => {
      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫  Instituto Técnico Industrial Santander
📰  Revista Digital v4.0 — ${process.env.NODE_ENV}
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
        setInterval(
          () => sincronizarNoticiasExternas().catch(e => console.error('Error noticias externas interval:', e.message)),
          60 * 60 * 1000
        );
      }, 5000);
    }

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();
module.exports = app;
