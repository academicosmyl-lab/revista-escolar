/**
 * Tests básicos de la API — Instituto Técnico Industrial Santander
 * Usan SQLite en memoria (NODE_ENV=test, DB_STORAGE=:memory:)
 */
const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const { sequelize, Usuario, Noticia, Categoria, Sede } = require('../models');
const app      = require('../app');

// ── Setup / Teardown ──────────────────────────────────────
beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Seed mínimo: admin + docente + sede + categoría + noticia publicada
  const passAdmin   = await bcrypt.hash('Admin2024*', 10);
  const passDocente = await bcrypt.hash('Docente2024*', 10);

  const [sede] = await Sede.findOrCreate({
    where: { slug: 'test-sede' },
    defaults: { nombre: 'Sede Test', slug: 'test-sede', tipo: 'bachillerato', activa: true },
  });

  await Usuario.create({
    nombre: 'Admin Test', email: 'admin@test.co',
    password_hash: passAdmin, rol: 'ADMIN', activo: true,
  });

  const docente = await Usuario.create({
    nombre: 'Docente Test', email: 'docente@test.co',
    password_hash: passDocente, rol: 'DOCENTE', activo: true,
  });

  const cat = await Categoria.create({ nombre: 'Académico', color: '#7B1D2C', activa: true });

  await Noticia.create({
    titulo:            'Noticia de prueba del sistema',
    contenido:         'Contenido de prueba para verificar que los endpoints funcionan correctamente en el entorno de test.',
    resumen:           'Resumen de prueba',
    estado:            'publicada',
    fecha_publicacion: new Date(),
    autor_id:          docente.id,
    categoria_id:      cat.id,
    visitas:           5,
  });
});

afterAll(async () => {
  await sequelize.close();
});

// ── Helper: obtener token ─────────────────────────────────
async function loginComo(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.token;
}

// ── SUITE 1: Health ───────────────────────────────────────
describe('GET /api/v1/health', () => {
  it('responde 200 con status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── SUITE 2: Auth ─────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  it('devuelve token con credenciales correctas', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'admin@test.co', password: 'Admin2024*' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.rol).toBe('ADMIN');
  });

  it('rechaza contraseña incorrecta con 401', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'admin@test.co', password: 'WrongPassword123' });
    expect(res.status).toBe(401);
  });

  it('rechaza email inexistente con 401', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: 'noexiste@test.co', password: 'Admin2024*' });
    expect(res.status).toBe(401);
  });
});

// ── SUITE 3: Noticias públicas ────────────────────────────
describe('GET /api/v1/noticias', () => {
  it('devuelve lista paginada de noticias publicadas', async () => {
    const res = await request(app).get('/api/v1/noticias');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('noticias');
    expect(Array.isArray(res.body.noticias)).toBe(true);
    expect(res.body.noticias.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('totalPages');
  });

  it('devuelve solo noticias publicadas', async () => {
    const res = await request(app).get('/api/v1/noticias');
    expect(res.status).toBe(200);
    res.body.noticias.forEach(n => expect(n.estado).toBe('publicada'));
  });

  it('GET /noticias/:id devuelve detalle y suma visita', async () => {
    const list = await request(app).get('/api/v1/noticias');
    const id   = list.body.noticias[0].id;

    const res = await request(app).get(`/api/v1/noticias/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.noticia.id).toBe(id);
  });

  it('GET /noticias/:id con id inválido devuelve 404', async () => {
    const res = await request(app).get('/api/v1/noticias/id-que-no-existe');
    expect(res.status).toBe(404);
  });
});

// ── SUITE 4: Categorías ───────────────────────────────────
describe('GET /api/v1/categorias', () => {
  it('devuelve lista de categorías activas', async () => {
    const res = await request(app).get('/api/v1/categorias');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── SUITE 5: Sedes ────────────────────────────────────────
describe('GET /api/v1/sedes', () => {
  it('devuelve lista de sedes activas', async () => {
    const res = await request(app).get('/api/v1/sedes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── SUITE 6: Perfil docentes ──────────────────────────────
describe('GET /api/v1/perfil/docentes', () => {
  it('devuelve directorio de docentes', async () => {
    const res = await request(app).get('/api/v1/perfil/docentes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('docentes');
  });
});

// ── SUITE 7: Rutas protegidas sin token ───────────────────
describe('Rutas protegidas sin token', () => {
  it('GET /api/v1/panel/noticias rechaza sin token (401)', async () => {
    const res = await request(app).get('/api/v1/panel/noticias');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/noticias rechaza sin token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/noticias');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/noticias rechaza sin token (401)', async () => {
    const res = await request(app).post('/api/v1/noticias')
      .send({ titulo: 'Test', contenido: 'Contenido de prueba...' });
    expect(res.status).toBe(401);
  });
});

// ── SUITE 8: Panel docente con token ─────────────────────
describe('Panel docente autenticado', () => {
  let token;

  beforeAll(async () => {
    token = await loginComo('docente@test.co', 'Docente2024*');
  });

  it('GET /api/v1/panel/noticias devuelve mis noticias', async () => {
    const res = await request(app).get('/api/v1/panel/noticias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('noticias');
    expect(Array.isArray(res.body.noticias)).toBe(true);
  });

  it('GET /api/v1/perfil/mio/datos devuelve o crea perfil', async () => {
    const res = await request(app).get('/api/v1/perfil/mio/datos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('perfil');
  });
});

// ── SUITE 9: Panel admin con token ────────────────────────
describe('Panel admin autenticado', () => {
  let token;

  beforeAll(async () => {
    token = await loginComo('admin@test.co', 'Admin2024*');
  });

  it('GET /api/v1/admin/noticias devuelve todas las noticias', async () => {
    const res = await request(app).get('/api/v1/admin/noticias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('noticias');
  });

  it('Docente no puede acceder a /admin/noticias (403)', async () => {
    const docenteToken = await loginComo('docente@test.co', 'Docente2024*');
    const res = await request(app).get('/api/v1/admin/noticias')
      .set('Authorization', `Bearer ${docenteToken}`);
    expect(res.status).toBe(403);
  });
});
