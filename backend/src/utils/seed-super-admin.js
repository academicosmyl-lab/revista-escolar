/**
 * utils/seed-super-admin.js
 * Crea el usuario super admin (Ronald) si no existe aún.
 *
 * USO (una sola vez, en local o Railway console):
 *   node src/utils/seed-super-admin.js
 *
 * Las credenciales se leen de las variables de entorno:
 *   SUPER_ADMIN_EMAIL    → email de acceso
 *   SUPER_ADMIN_PASSWORD → contraseña en texto plano (se hashea con bcrypt)
 *   SUPER_ADMIN_NOMBRE   → nombre visible (default: "Ronald Medina")
 *
 * La contraseña NUNCA se escribe en código — va en .env (que está en .gitignore).
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');

async function crearSuperAdmin() {
  const { sequelize, Usuario } = require('../models');

  try {
    await sequelize.authenticate();

    // Sincroniza solo si es necesario (development)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    }

    const email    = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const nombre   = process.env.SUPER_ADMIN_NOMBRE || 'Ronald Medina';

    if (!email || !password) {
      console.error('❌  Debes definir SUPER_ADMIN_EMAIL y SUPER_ADMIN_PASSWORD en tu .env');
      process.exit(1);
    }

    // Si ya existe, no lo vuelve a crear
    const existente = await Usuario.findOne({ where: { email } });
    if (existente) {
      if (existente.rol !== 'ADMIN') {
        await existente.update({ rol: 'ADMIN', activo: true, es_raiz: true });
        console.log(`✅  Usuario "${email}" actualizado a rol ADMIN y marcado como raíz`);
      } else {
        console.log(`ℹ️   El super admin "${email}" ya existe — no se creó de nuevo`);
      }
      await sequelize.close();
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    await Usuario.create({
      nombre,
      email,
      password_hash: hash,
      rol:           'ADMIN',
      activo:        true,
      es_raiz:       true,   // Protege de eliminación accidental
    });

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Super Admin creado exitosamente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Nombre : ${nombre}
   Email  : ${email}
   Rol    : ADMIN (raíz — no se puede desactivar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Guarda el email y la contraseña en un lugar seguro.
La contraseña está hasheada en la BD y no se puede recuperar.
`);

    await sequelize.close();
  } catch (err) {
    console.error('❌  Error creando super admin:', err.message);
    process.exit(1);
  }
}

crearSuperAdmin();
