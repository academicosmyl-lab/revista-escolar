/**
 * routes/setup.routes.js
 * Endpoint de arranque único — crea el Super Admin si NO existe ningún ADMIN.
 * Se bloquea solo una vez creado el primer admin.
 * NUNCA expone ni devuelve credenciales.
 */
const { Router } = require('express');
const bcrypt     = require('bcryptjs');
const { Usuario } = require('../models');

const router = Router();

// POST /api/v1/setup/super-admin
// Cuerpo: { nombre, email, password }
// Solo funciona si no existe NINGÚN usuario con rol ADMIN en la BD.
router.post('/super-admin', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }

    // ── Guardia: solo si NO hay ningún ADMIN ──────────────────
    const adminExistente = await Usuario.findOne({ where: { rol: 'ADMIN' } });
    if (adminExistente) {
      return res.status(403).json({
        error: 'El Super Admin ya existe. Este endpoint está bloqueado.',
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const usuario = await Usuario.create({
      nombre:        nombre.trim(),
      email:         email.trim().toLowerCase(),
      password_hash: hash,
      rol:           'ADMIN',
      activo:        true,
      es_raiz:       true,
    });

    console.log(`✅ Super Admin creado vía /setup: ${email}`);

    res.status(201).json({
      ok:      true,
      mensaje: `Super Admin "${nombre}" creado exitosamente.`,
      id:      usuario.id,
    });
  } catch (e) {
    console.error('Error setup super-admin:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
