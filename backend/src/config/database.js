/**
 * config/database.js
 * Configuración de Sequelize — PostgreSQL (Neon) en producción, SQLite en desarrollo
 */
const { Sequelize } = require('sequelize');

// En producción SIEMPRE debe existir DATABASE_URL — si no, el servidor no debe arrancar
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL no está configurada en producción.');
  console.error('   Ve al dashboard de Render → Environment → agrega DATABASE_URL con la URL de Neon.');
  process.exit(1);
}

let sequelize;

if (process.env.DATABASE_URL || process.env.DB_DIALECT === 'postgres') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  });
  console.log('🐘 Base de datos: PostgreSQL (Neon)');
} else {
  // SQLite — solo para desarrollo local, NUNCA en producción
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
  console.log('📁 Base de datos: SQLite (desarrollo local)');
}

module.exports = { sequelize, dialect: process.env.DATABASE_URL ? 'postgres' : 'sqlite' };
