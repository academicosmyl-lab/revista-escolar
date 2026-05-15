/**
 * models/index.js — v3.0
 * Roles: ADMIN | RECTOR | COORDINADOR | ORIENTADORA | DOCENTE | PERSONAL
 * Nuevos módulos: Personal, Inclusión, seguimiento docente por materia
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ─── SEDE ─────────────────────────────────────────────────
const Sede = sequelize.define('Sede', {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre:              { type: DataTypes.STRING(150), allowNull: false },
  slug:                { type: DataTypes.STRING(80),  allowNull: false, unique: true },
  tipo:                { type: DataTypes.ENUM('bachillerato','basica_primaria','rural'), allowNull: false },
  descripcion:         { type: DataTypes.TEXT },
  direccion:           { type: DataTypes.STRING(255) },
  telefono:            { type: DataTypes.STRING(30) },
  color_institucional: { type: DataTypes.STRING(7), defaultValue: '#1E40AF' },
  imagen_portada:      { type: DataTypes.STRING(500) },
  activa:              { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'sedes', underscored: true });

// ─── USUARIO ──────────────────────────────────────────────
// Roles disponibles:
//   ADMIN        → acceso total al sistema
//   RECTOR       → acceso total a su sede + aprueba contenido
//   COORDINADOR  → gestiona cursos/docentes de su sede
//   ORIENTADORA  → acceso a inclusión de las 3 sedes
//   DOCENTE      → panel personal + noticias + perfil
//   PERSONAL     → perfil básico (servicios, seguridad, portería)
const Usuario = sequelize.define('Usuario', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre:            { type: DataTypes.STRING(100), allowNull: false },
  email:             { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password_hash:     { type: DataTypes.STRING(255), allowNull: false },
  rol: {
    type: DataTypes.ENUM('ADMIN','RECTOR','COORDINADOR','ORIENTADORA','DOCENTE','PERSONAL'),
    defaultValue: 'DOCENTE',
  },
  activo:            { type: DataTypes.BOOLEAN, defaultValue: true },
  es_raiz:           { type: DataTypes.BOOLEAN, defaultValue: false },
  ultimo_login:      { type: DataTypes.DATE },
  sede_principal_id: { type: DataTypes.UUID },
}, { tableName: 'usuarios', underscored: true });

// ─── PERFIL DOCENTE (aplica a DOCENTE y PERSONAL) ─────────
const PerfilDocente = sequelize.define('PerfilDocente', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuario_id:  { type: DataTypes.UUID, allowNull: false, unique: true },
  foto_url:    { type: DataTypes.STRING(500) },
  titulo_profesional: { type: DataTypes.STRING(200) },
  cargo:       { type: DataTypes.STRING(100) },  // ej: "Vigilante", "Secretaria", "Aseador"
  bio:         { type: DataTypes.TEXT },
  estudios:               { type: DataTypes.JSON },
  cualidades_intelectuales: { type: DataTypes.JSON },
  cualidades_fisicas:     { type: DataTypes.JSON },
  logros:      { type: DataTypes.JSON },
  proyectos:   { type: DataTypes.JSON },
  url_blog:          { type: DataTypes.STRING(500) },
  url_linkedin:      { type: DataTypes.STRING(500) },
  url_researchgate:  { type: DataTypes.STRING(500) },
  url_orcid:         { type: DataTypes.STRING(200) },
  perfil_publico:    { type: DataTypes.BOOLEAN, defaultValue: true },
  ultima_actualizacion: { type: DataTypes.DATE },
}, { tableName: 'perfiles_docentes', underscored: true });

// ─── ÁREA DE CONOCIMIENTO ────────────────────────────────
const Area = sequelize.define('Area', {
  id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  color:  { type: DataTypes.STRING(7), defaultValue: '#6366F1' },
  icono:  { type: DataTypes.STRING(50) },
  activa: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'areas', underscored: true });

// ─── CURSO ────────────────────────────────────────────────
const Curso = sequelize.define('Curso', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre:       { type: DataTypes.STRING(80), allowNull: false },
  nivel:        { type: DataTypes.STRING(50) },
  jornada:      { type: DataTypes.ENUM('manana','tarde','noche','unica'), defaultValue: 'manana' },
  sede_id:      { type: DataTypes.UUID, allowNull: false },
  director_id:  { type: DataTypes.UUID },
  anio_lectivo: { type: DataTypes.INTEGER, defaultValue: new Date().getFullYear() },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'cursos', underscored: true });

// ─── DOCENTE ↔ SEDE (many-to-many) ───────────────────────
const DocenteSede = sequelize.define('DocenteSede', {
  usuario_id: { type: DataTypes.UUID, allowNull: false },
  sede_id:    { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'docentes_sedes', underscored: true, timestamps: false });

// ─── CURSO ↔ DOCENTE ↔ ÁREA ───────────────────────────────
const CursoDocente = sequelize.define('CursoDocente', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  curso_id:   { type: DataTypes.UUID, allowNull: false },
  usuario_id: { type: DataTypes.UUID, allowNull: false },
  area_id:    { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'cursos_docentes', underscored: true, timestamps: false });

// ─── SEGUIMIENTO DOCENTE POR MATERIA ─────────────────────
// El docente sube lo que hizo en cada área: imágenes, docs, avance
const SeguimientoMateria = sequelize.define('SeguimientoMateria', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  docente_id:   { type: DataTypes.UUID, allowNull: false },
  curso_id:     { type: DataTypes.UUID, allowNull: false },
  area_id:      { type: DataTypes.UUID, allowNull: false },
  semana:       { type: DataTypes.INTEGER, allowNull: false },  // 1-40
  titulo:       { type: DataTypes.STRING(200) },
  descripcion:  { type: DataTypes.TEXT },
  avance_pct:   { type: DataTypes.INTEGER, defaultValue: 0 },  // 0-100
  estado:       { type: DataTypes.ENUM('pendiente','en_progreso','completado'), defaultValue: 'pendiente' },
  logro_destacado: { type: DataTypes.TEXT },
  aprobado_admin:  { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'seguimiento_materia', underscored: true });

// ─── DOCUMENTO DEL DOCENTE (por materia) ─────────────────
const DocumentoDocente = sequelize.define('DocumentoDocente', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  seguimiento_id:  { type: DataTypes.UUID },
  perfil_id:       { type: DataTypes.UUID },
  docente_id:      { type: DataTypes.UUID, allowNull: false },
  nombre:          { type: DataTypes.STRING(255), allowNull: false },
  filename:        { type: DataTypes.STRING(255), allowNull: false },
  url:             { type: DataTypes.STRING(500),  allowNull: false },
  tipo:            { type: DataTypes.ENUM('imagen','documento','reporte'), defaultValue: 'documento' },
  tamaño_bytes:    { type: DataTypes.INTEGER },
  descripcion:     { type: DataTypes.TEXT },
  publico:         { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'documentos_docentes', underscored: true });

// ─── PANEL DE INCLUSIÓN ───────────────────────────────────
// Acceso: orientadora (todas las sedes) + docentes del estudiante + rector de su sede
const EstudianteInclusion = sequelize.define('EstudianteInclusion', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre_completo: { type: DataTypes.STRING(150), allowNull: false },
  fecha_nacimiento: { type: DataTypes.DATEONLY },
  curso_id:     { type: DataTypes.UUID, allowNull: false },
  sede_id:      { type: DataTypes.UUID, allowNull: false },
  // Tipo de condición (puede tener varias)
  condiciones:  { type: DataTypes.JSON },
  // [{ tipo: 'cognitiva|motriz|sensorial|psicosocial|multiple', descripcion: '...' }]
  diagnostico:  { type: DataTypes.TEXT },
  piar_url:     { type: DataTypes.STRING(500) },  // Plan Individual de Ajustes Razonables
  observaciones: { type: DataTypes.TEXT },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_por:   { type: DataTypes.UUID },         // ID del usuario que registró
}, { tableName: 'estudiantes_inclusion', underscored: true });

// ─── SEGUIMIENTO DE INCLUSIÓN ─────────────────────────────
const SeguimientoInclusion = sequelize.define('SeguimientoInclusion', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  estudiante_id:  { type: DataTypes.UUID, allowNull: false },
  registrado_por: { type: DataTypes.UUID, allowNull: false },
  fecha:          { type: DataTypes.DATEONLY, allowNull: false },
  tipo:           { type: DataTypes.ENUM('academico','conductual','medico','familiar','logro'), defaultValue: 'academico' },
  descripcion:    { type: DataTypes.TEXT, allowNull: false },
  acciones:       { type: DataTypes.TEXT },
  requiere_atencion: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'seguimiento_inclusion', underscored: true });

// ─── CATEGORÍA ────────────────────────────────────────────
const Categoria = sequelize.define('Categoria', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nombre:      { type: DataTypes.STRING(80), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  color:       { type: DataTypes.STRING(7), defaultValue: '#3B82F6' },
  sede_id:     { type: DataTypes.UUID },
  activa:      { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'categorias', underscored: true });

// ─── NOTICIA ──────────────────────────────────────────────
const Noticia = sequelize.define('Noticia', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo:       { type: DataTypes.STRING(200), allowNull: false },
  resumen:      { type: DataTypes.STRING(500) },
  contenido:    { type: DataTypes.TEXT, allowNull: false },
  contenido_ia: { type: DataTypes.TEXT },
  estado:       { type: DataTypes.ENUM('borrador','pendiente','publicada','rechazada'), defaultValue: 'borrador' },
  motivo_rechazo: { type: DataTypes.TEXT },
  destacada:    { type: DataTypes.BOOLEAN, defaultValue: false },
  visitas:      { type: DataTypes.INTEGER, defaultValue: 0 },
  fecha_publicacion: { type: DataTypes.DATE },
  autor_id:     { type: DataTypes.UUID, allowNull: false },
  categoria_id: { type: DataTypes.UUID },
  sede_id:      { type: DataTypes.UUID },
}, { tableName: 'noticias', underscored: true });

// ─── IMAGEN ───────────────────────────────────────────────
const Imagen = sequelize.define('Imagen', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  noticia_id:       { type: DataTypes.UUID },
  perfil_id:        { type: DataTypes.UUID },
  seguimiento_id:   { type: DataTypes.UUID },
  filename:         { type: DataTypes.STRING(255), allowNull: false },
  url:              { type: DataTypes.STRING(500),  allowNull: false },
  alt_text:         { type: DataTypes.STRING(300) },
  tamaño_bytes:     { type: DataTypes.INTEGER },
  es_portada:       { type: DataTypes.BOOLEAN, defaultValue: false },
  posicion_galeria: { type: DataTypes.INTEGER },
  procesada_por_ia: { type: DataTypes.BOOLEAN, defaultValue: false },
  score_visual:     { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'imagenes', underscored: true });

// ─── VIDEO YOUTUBE ────────────────────────────────────────
const VideoYoutube = sequelize.define('VideoYoutube', {
  id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo:        { type: DataTypes.STRING(200), allowNull: false },
  descripcion:   { type: DataTypes.TEXT },
  youtube_id:    { type: DataTypes.STRING(30),  allowNull: false },
  youtube_url:   { type: DataTypes.STRING(500), allowNull: false },
  thumbnail_url: { type: DataTypes.STRING(500) },
  duracion:      { type: DataTypes.STRING(20) },
  autor_id:      { type: DataTypes.UUID, allowNull: false },
  sede_id:       { type: DataTypes.UUID },
  noticia_id:    { type: DataTypes.UUID },
  estado:        { type: DataTypes.ENUM('pendiente','aprobado','rechazado'), defaultValue: 'pendiente' },
}, { tableName: 'videos_youtube', underscored: true });

// ─── NOTICIA EXTERNA ──────────────────────────────────────
const NoticiaExterna = sequelize.define('NoticiaExterna', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  titulo:            { type: DataTypes.STRING(300), allowNull: false },
  resumen:           { type: DataTypes.TEXT },
  url_original:      { type: DataTypes.STRING(1000), allowNull: false, unique: true },
  fuente:            { type: DataTypes.STRING(100) },
  imagen_url:        { type: DataTypes.STRING(500) },
  fecha_publicacion: { type: DataTypes.DATE },
  activa:            { type: DataTypes.BOOLEAN, defaultValue: true },
  relevancia_score:  { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'noticias_externas', underscored: true });

// ─── GALERÍA AUTOMATIZADA ─────────────────────────────────
const GaleriaItem = sequelize.define('GaleriaItem', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  imagen_id:        { type: DataTypes.UUID },
  video_id:         { type: DataTypes.UUID },
  sede_id:          { type: DataTypes.UUID },
  seccion:          { type: DataTypes.STRING(50) },
  posicion:         { type: DataTypes.INTEGER, defaultValue: 0 },
  activo:           { type: DataTypes.BOOLEAN, defaultValue: true },
  asignado_por_ia:  { type: DataTypes.BOOLEAN, defaultValue: true },
  score_relevancia: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'galeria_items', underscored: true });

const KnowledgeBase = sequelize.define('KnowledgeBase', {
  id:    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tipo:  { type: DataTypes.STRING(50),  allowNull: false },
  clave: { type: DataTypes.STRING(100), allowNull: false },
  datos: { type: DataTypes.TEXT,        allowNull: false },
}, { tableName: 'knowledge_base', underscored: true });

const ErrorPattern = sequelize.define('ErrorPattern', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tipo:           { type: DataTypes.STRING(50) },
  gravedad:       { type: DataTypes.ENUM('baja','media','alta','critica') },
  descripcion:    { type: DataTypes.TEXT },
  regla:          { type: DataTypes.TEXT },
  veces_repetido: { type: DataTypes.INTEGER, defaultValue: 1 },
  resuelto:       { type: DataTypes.BOOLEAN, defaultValue: false },
  docente_id:     { type: DataTypes.UUID },
}, { tableName: 'error_patterns', underscored: true });

// ═══ RELACIONES ══════════════════════════════════════════
Sede.hasMany(Curso,       { foreignKey: 'sede_id', as: 'cursos' });
Curso.belongsTo(Sede,    { foreignKey: 'sede_id', as: 'sede' });
Sede.hasMany(Categoria,  { foreignKey: 'sede_id', as: 'categorias' });
Categoria.belongsTo(Sede,{ foreignKey: 'sede_id', as: 'sede' });
Sede.hasMany(Noticia,    { foreignKey: 'sede_id', as: 'noticias' });
Noticia.belongsTo(Sede,  { foreignKey: 'sede_id', as: 'sede' });
Sede.hasMany(EstudianteInclusion, { foreignKey: 'sede_id', as: 'estudiantes_inclusion' });
EstudianteInclusion.belongsTo(Sede, { foreignKey: 'sede_id', as: 'sede' });

Usuario.hasMany(Curso,   { foreignKey: 'director_id', as: 'cursos_director' });
Curso.belongsTo(Usuario, { foreignKey: 'director_id', as: 'director' });
Usuario.hasOne(PerfilDocente,   { foreignKey: 'usuario_id', as: 'perfil' });
PerfilDocente.belongsTo(Usuario,{ foreignKey: 'usuario_id', as: 'usuario' });
Usuario.belongsToMany(Sede, { through: DocenteSede, foreignKey: 'usuario_id', as: 'sedes' });
Sede.belongsToMany(Usuario, { through: DocenteSede, foreignKey: 'sede_id',    as: 'docentes' });

Curso.hasMany(CursoDocente,    { foreignKey: 'curso_id', as: 'asignaciones' });
CursoDocente.belongsTo(Curso,  { foreignKey: 'curso_id' });
CursoDocente.belongsTo(Usuario,{ foreignKey: 'usuario_id', as: 'docente' });
CursoDocente.belongsTo(Area,   { foreignKey: 'area_id',    as: 'area' });

SeguimientoMateria.belongsTo(Usuario, { foreignKey: 'docente_id', as: 'docente' });
SeguimientoMateria.belongsTo(Curso,   { foreignKey: 'curso_id',   as: 'curso' });
SeguimientoMateria.belongsTo(Area,    { foreignKey: 'area_id',    as: 'area' });
SeguimientoMateria.hasMany(Imagen,    { foreignKey: 'seguimiento_id', as: 'imagenes' });
SeguimientoMateria.hasMany(DocumentoDocente, { foreignKey: 'seguimiento_id', as: 'documentos' });

EstudianteInclusion.belongsTo(Curso,  { foreignKey: 'curso_id', as: 'curso' });
EstudianteInclusion.hasMany(SeguimientoInclusion, { foreignKey: 'estudiante_id', as: 'seguimientos' });
SeguimientoInclusion.belongsTo(EstudianteInclusion, { foreignKey: 'estudiante_id', as: 'estudiante' });
SeguimientoInclusion.belongsTo(Usuario, { foreignKey: 'registrado_por', as: 'registrador' });

Noticia.hasMany(Imagen,      { foreignKey: 'noticia_id', as: 'imagenes' });
Imagen.belongsTo(Noticia,    { foreignKey: 'noticia_id' });
Noticia.hasMany(VideoYoutube,{ foreignKey: 'noticia_id', as: 'videos' });
VideoYoutube.belongsTo(Noticia, { foreignKey: 'noticia_id' });
Noticia.belongsTo(Usuario,   { foreignKey: 'autor_id',    as: 'autor' });
Usuario.hasMany(Noticia,     { foreignKey: 'autor_id',    as: 'noticias' });
Noticia.belongsTo(Categoria, { foreignKey: 'categoria_id',as: 'categoria' });
PerfilDocente.hasMany(Imagen,{ foreignKey: 'perfil_id',   as: 'fotos' });
GaleriaItem.belongsTo(Imagen,      { foreignKey: 'imagen_id', as: 'imagen' });
GaleriaItem.belongsTo(VideoYoutube,{ foreignKey: 'video_id',  as: 'video' });
GaleriaItem.belongsTo(Sede,        { foreignKey: 'sede_id',   as: 'sede' });

module.exports = {
  sequelize,
  Sede, Area, Curso, CursoDocente, DocenteSede,
  Usuario, PerfilDocente,
  SeguimientoMateria, DocumentoDocente,
  EstudianteInclusion, SeguimientoInclusion,
  Categoria, Noticia, Imagen,
  VideoYoutube, NoticiaExterna,
  GaleriaItem, KnowledgeBase, ErrorPattern,
};
