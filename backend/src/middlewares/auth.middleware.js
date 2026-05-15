/**
 * middlewares/auth.middleware.js — v2.0
 * Roles: ADMIN | RECTOR | COORDINADOR | ORIENTADORA | DOCENTE | PERSONAL
 */
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Usuario no autorizado' });
    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Verificar uno o más roles
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.usuario.rol)) return res.status(403).json({ error: 'Sin permisos para esta acción' });
    next();
  };
}

// Puede aprobar/rechazar contenido
const puedeAprobarContenido = requiereRol('ADMIN', 'RECTOR');

// Puede gestionar cursos y docentes
const puedeGestionarCursos = requiereRol('ADMIN', 'RECTOR', 'COORDINADOR');

// Puede ver el panel de inclusión (docente solo ve sus estudiantes — filtro en la ruta)
function puedeVerInclusion(req, res, next) {
  const roles = ['ADMIN', 'RECTOR', 'COORDINADOR', 'ORIENTADORA', 'DOCENTE'];
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Sin permisos para ver inclusión' });
  }
  next();
}

// Solo orientadora y admin crean/editan registros de inclusión
const puedeGestionarInclusion = requiereRol('ADMIN', 'ORIENTADORA');

// Puede publicar noticias (cualquier staff activo)
function puedePublicar(req, res, next) {
  const roles = ['ADMIN', 'RECTOR', 'COORDINADOR', 'ORIENTADORA', 'DOCENTE'];
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({ error: 'Solo el personal de la institución puede publicar' });
  }
  next();
}

module.exports = {
  autenticar,
  requiereRol,
  puedeAprobarContenido,
  puedeGestionarCursos,
  puedeVerInclusion,
  puedeGestionarInclusion,
  puedePublicar,
};
