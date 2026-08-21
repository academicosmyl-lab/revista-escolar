/**
 * config/database.js
 * Configuración de Sequelize — soporta SQLite (dev) y PostgreSQL (prod)
 */
const { Sequelize } = require('sequelize');

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
} else {
  // SQLite — ideal para desarrollo, no requiere servidor
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
}

module.exports = { sequelize };
