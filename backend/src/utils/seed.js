/**
 * utils/seed.js — v3.0
 * Crea: 3 sedes · 6 roles de ejemplo · 10 áreas · categorías · admin raíz
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Sede, Area, Categoria } = require('../models');

async function seed() {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Base de datos sincronizada\n');

    const sedes = [];
    const sedesData = [
      { nombre:'Técnico Industrial Bachillerato', slug:'tecnico-industrial-bachillerato', tipo:'bachillerato', color_institucional:'#1E40AF' },
      { nombre:'Técnico Industrial Básica Primaria', slug:'tecnico-industrial-basica-primaria', tipo:'basica_primaria', color_institucional:'#065F46' },
      { nombre:'Técnico Industrial Rural Los Sauces', slug:'tecnico-industrial-rural-los-sauces', tipo:'rural', color_institucional:'#92400E' },
    ];
    for (const s of sedesData) {
      const [sede] = await Sede.findOrCreate({ where:{ slug:s.slug }, defaults:s });
      sedes.push(sede);
      console.log(`🏫 ${sede.nombre}`);
    }

    const areasData = [
      { nombre:'Matemáticas', color:'#3B82F6' }, { nombre:'Ciencias Naturales', color:'#10B981' },
      { nombre:'Lenguaje', color:'#8B5CF6' },    { nombre:'Ciencias Sociales', color:'#F59E0B' },
      { nombre:'Tecnología e Informática', color:'#06B6D4' }, { nombre:'Inglés', color:'#EC4899' },
      { nombre:'Educación Física', color:'#EF4444' }, { nombre:'Artes', color:'#F97316' },
      { nombre:'Ética y Valores', color:'#64748B' }, { nombre:'Técnica Industrial', color:'#78716C' },
    ];
    for (const a of areasData) await Area.findOrCreate({ where:{ nombre:a.nombre }, defaults:a });
    console.log(`📚 ${areasData.length} áreas creadas`);

    const cats = ['Académico','Deportivo','Cultural','Tecnología','Comunidad','Logros','Anuncios'];
    for (const n of cats) await Categoria.findOrCreate({ where:{ nombre:n }, defaults:{ nombre:n } });

    // Admin raíz
    const pass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin2024*', 12);
    await Usuario.findOrCreate({
      where: { email: process.env.ADMIN_EMAIL || 'admin@revista.edu.co' },
      defaults: { nombre:'Administrador', email: process.env.ADMIN_EMAIL || 'admin@revista.edu.co',
        password_hash:pass, rol:'ADMIN', activo:true, es_raiz:true, sede_principal_id:sedes[0].id },
    });

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Seed v3.0 completado

🏫 3 Sedes creadas
👥 Roles disponibles: ADMIN · RECTOR · COORDINADOR · ORIENTADORA · DOCENTE · PERSONAL
📚 10 Áreas de conocimiento
♿ Panel de inclusión: listo para usar

📧 Admin: ${process.env.ADMIN_EMAIL || 'admin@revista.edu.co'}
🔑 Contraseña: ${process.env.ADMIN_PASSWORD || 'Admin2024*'}
🔗 http://localhost:3000/api/v1/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    process.exit(0);
  } catch (err) {
    console.error('❌', err);
    process.exit(1);
  }
}
seed();
