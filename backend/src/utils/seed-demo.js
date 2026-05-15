/**
 * utils/seed-demo.js — Datos de demostración completos
 * Instituto Técnico Industrial Santander
 *
 * Crea: sedes · 14 usuarios · 19 cursos · asignaciones docente-área ·
 *       15 noticias · galería · 3 videos YouTube
 *
 * Requiere: npm run seed (seed base) ejecutado previamente
 * Uso:      npm run seed:demo
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize,
  Sede, Area, Categoria,
  Usuario, PerfilDocente, DocenteSede,
  Curso, CursoDocente,
  Noticia, Imagen, GaleriaItem, VideoYoutube,
} = require('../models');

// ── Helpers ───────────────────────────────────────────────
const BACKEND = process.env.BACKEND_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'http://localhost:3000');
const IMG_NEWS = (seed, w = 800, h = 500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Fotos demo con pravatar.cc — caras reales, siempre disponibles (se reemplazan en producción)
const AVATARS = {
  'patricia-diaz':    'https://i.pravatar.cc/200?img=5',
  'roberto-suarez':   'https://i.pravatar.cc/200?img=12',
  'elena-pacheco':    'https://i.pravatar.cc/200?img=9',
  'diana-solano':     'https://i.pravatar.cc/200?img=23',
  'luz-rios':         'https://i.pravatar.cc/200?img=47',
  'maria-gomez':      'https://i.pravatar.cc/200?img=44',
  'carlos-rodriguez': 'https://i.pravatar.cc/200?img=15',
  'andres-torres':    'https://i.pravatar.cc/200?img=33',
  'liliana-mosquera': 'https://i.pravatar.cc/200?img=56',
  'jorge-perez':      'https://i.pravatar.cc/200?img=61',
  'sandra-rivas':     'https://i.pravatar.cc/200?img=38',
  'hernando-castillo':'https://i.pravatar.cc/200?img=68',
  'rosa-vargas':      'https://i.pravatar.cc/200?img=25',
  'felipe-mantilla':  'https://i.pravatar.cc/200?img=52',
};
const AVATAR = (slug) => AVATARS[slug] || `https://i.pravatar.cc/200?img=1`;

// ═══════════════════════════════════════════════════════════
async function seedDemo() {
  await sequelize.authenticate();
  console.log('✅ Conectado a la base de datos\n');

  // ── 0. BASE SEED (crea lo que falte, no sobrescribe) ─────
  const sedesBase = [
    { nombre: 'Técnico Industrial Bachillerato',        slug: 'tecnico-industrial-bachillerato',        tipo: 'bachillerato',    color_institucional: '#7B1D2C' },
    { nombre: 'Técnico Industrial Básica Primaria',     slug: 'tecnico-industrial-basica-primaria',     tipo: 'basica_primaria', color_institucional: '#1A5C3A' },
    { nombre: 'Técnico Industrial Rural Los Sauces',    slug: 'tecnico-industrial-rural-los-sauces',    tipo: 'rural',           color_institucional: '#92400E' },
  ];
  for (const s of sedesBase) await Sede.findOrCreate({ where: { slug: s.slug }, defaults: s });

  const areasBase = [
    { nombre: 'Matemáticas',           color: '#3B82F6' },
    { nombre: 'Ciencias Naturales',    color: '#10B981' },
    { nombre: 'Lenguaje',              color: '#8B5CF6' },
    { nombre: 'Ciencias Sociales',     color: '#F59E0B' },
    { nombre: 'Tecnología e Informática', color: '#06B6D4' },
    { nombre: 'Inglés',                color: '#EC4899' },
    { nombre: 'Educación Física',      color: '#EF4444' },
    { nombre: 'Artes',                 color: '#F97316' },
    { nombre: 'Ética y Valores',       color: '#64748B' },
    { nombre: 'Técnica Industrial',    color: '#78716C' },
  ];
  for (const a of areasBase) await Area.findOrCreate({ where: { nombre: a.nombre }, defaults: a });

  const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin2024*', 12);
  await Usuario.findOrCreate({
    where: { email: process.env.ADMIN_EMAIL || 'admin@revista.edu.co' },
    defaults: {
      nombre: 'Administrador', email: process.env.ADMIN_EMAIL || 'admin@revista.edu.co',
      password_hash: adminPass, rol: 'ADMIN', activo: true, es_raiz: true,
    },
  });
  console.log('✅ Base seed verificada (sedes · áreas · admin)\n');

  // ── 1. SEDES (actualizar descripciones) ──────────────────
  const sedesMap = {
    'tecnico-industrial-bachillerato': {
      descripcion: 'Sede principal con énfasis en formación técnica industrial y bachillerato académico para grados 6° a 11°. Cuenta con laboratorio de tecnología, sala de robótica y biblioteca especializada.',
      direccion: 'Calle 5 # 7-20, Fusagasugá, Cundinamarca',
      telefono: '(601) 867-1234',
      imagen_portada: IMG_NEWS('school-main', 1200, 600),
      color_institucional: '#7B1D2C',
    },
    'tecnico-industrial-basica-primaria': {
      descripcion: 'Sede de básica primaria con enfoque en el desarrollo integral de niños desde preescolar hasta grado 5°. Espacios lúdicos, huerta escolar y programa de lectura temprana.',
      direccion: 'Carrera 12 # 3-45, Fusagasugá, Cundinamarca',
      telefono: '(601) 867-5678',
      imagen_portada: IMG_NEWS('primary-building', 1200, 600),
      color_institucional: '#1A5C3A',
    },
    'tecnico-industrial-rural-los-sauces': {
      descripcion: 'Sede rural en vereda Los Sauces con proyecto agropecuario activo y énfasis en educación ambiental. Modelo de escuela nueva multigrado reconocido por la Secretaría de Educación.',
      direccion: 'Vereda Los Sauces km 8, vía Silvania, Fusagasugá',
      telefono: '(601) 867-9012',
      imagen_portada: IMG_NEWS('rural-landscape', 1200, 600),
      color_institucional: '#92400E',
    },
  };

  const sedes = {};
  for (const [slug, data] of Object.entries(sedesMap)) {
    const sede = await Sede.findOne({ where: { slug } });
    await sede.update(data);
    sedes[slug] = sede;
    console.log(`  🏫 ${sede.nombre}`);
  }
  const s1 = sedes['tecnico-industrial-bachillerato'];
  const s2 = sedes['tecnico-industrial-basica-primaria'];
  const s3 = sedes['tecnico-industrial-rural-los-sauces'];
  console.log('✅ 3 sedes actualizadas\n');

  // ── 2. ÁREAS ──────────────────────────────────────────────
  const areaNames = [
    'Matemáticas', 'Ciencias Naturales', 'Lenguaje', 'Ciencias Sociales',
    'Tecnología e Informática', 'Inglés', 'Educación Física',
    'Artes', 'Ética y Valores', 'Técnica Industrial',
  ];
  const areas = {};
  for (const nombre of areaNames) {
    const area = await Area.findOne({ where: { nombre } });
    if (area) areas[nombre] = area;
  }
  console.log(`✅ ${Object.keys(areas).length} áreas cargadas\n`);

  // ── 3. CATEGORÍAS ─────────────────────────────────────────
  const catsData = [
    { nombre: 'Académico',  color: '#7B1D2C', descripcion: 'Logros y noticias del ámbito académico' },
    { nombre: 'Deportivo',  color: '#1A5C3A', descripcion: 'Torneos, competencias y logros deportivos' },
    { nombre: 'Cultural',   color: '#C9A84C', descripcion: 'Arte, festivales y expresión cultural' },
    { nombre: 'Tecnología', color: '#0891B2', descripcion: 'Proyectos tecnológicos y robótica' },
    { nombre: 'Comunidad',  color: '#059669', descripcion: 'Proyectos con impacto en la comunidad' },
    { nombre: 'Logros',     color: '#7C3AED', descripcion: 'Reconocimientos y premios institucionales' },
    { nombre: 'Anuncios',   color: '#4A4A4A', descripcion: 'Avisos y comunicados oficiales' },
  ];
  const cats = {};
  for (const c of catsData) {
    const [cat] = await Categoria.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
    await cat.update({ color: c.color, descripcion: c.descripcion });
    cats[c.nombre] = cat;
  }
  console.log('✅ 7 categorías actualizadas\n');

  // ── 4. USUARIOS ───────────────────────────────────────────
  const passDocente = await bcrypt.hash('Docente2024*', 10);
  const passRector  = await bcrypt.hash('Rector2024*', 10);
  const passCoord   = await bcrypt.hash('Coord2024*', 10);

  const usuariosData = [
    // ─ RECTORES ─────────────────────────────────────────────
    {
      email: 'patricia.diaz@itssantander.edu.co',
      nombre: 'Patricia Díaz Morales', password_hash: passRector,
      rol: 'RECTOR', sede_id: s1.id,
      slug: 'patricia-diaz',
      cargo: 'Rectora Sede Bachillerato',
      titulo: 'Mg. en Educación — Universidad de los Andes',
      bio: 'Magíster en Educación con 18 años de trayectoria en liderazgo educativo. Impulsora del modelo de educación técnica con énfasis en innovación y pensamiento crítico. Coordinadora del proyecto Revista Digital ITS Santander.',
      areas_json: ['Gestión Educativa', 'Liderazgo Pedagógico', 'Innovación'],
      logros_json: [
        { año: 2026, texto: 'Reconocimiento Departamental a la Innovación Pedagógica' },
        { año: 2025, texto: 'Convenio Marco con el SENA Cundinamarca' },
        { año: 2024, texto: 'Certificación de calidad ICONTEC para la institución' },
      ],
      sedes: [s1],
    },
    {
      email: 'roberto.suarez@itssantander.edu.co',
      nombre: 'Roberto Suárez Peña', password_hash: passRector,
      rol: 'RECTOR', sede_id: s2.id,
      slug: 'roberto-suarez',
      cargo: 'Rector Sede Básica Primaria',
      titulo: 'Esp. en Pedagogía — Universidad Pedagógica Nacional',
      bio: 'Especialista en Pedagogía Infantil con 14 años dirigiendo la sede de primaria. Pionero en la implementación del programa de lectura temprana y de actividades lúdico-pedagógicas en los primeros grados.',
      areas_json: ['Pedagogía Infantil', 'Lectura y Escritura', 'Lúdica'],
      logros_json: [
        { año: 2026, texto: 'Ganadores Prueba Saber 3° más alta de Fusagasugá' },
        { año: 2025, texto: 'Programa de lectura reconocido por el MEN' },
      ],
      sedes: [s2],
    },
    {
      email: 'elena.pacheco@itssantander.edu.co',
      nombre: 'Elena Pacheco Álvarez', password_hash: passRector,
      rol: 'RECTOR', sede_id: s3.id,
      slug: 'elena-pacheco',
      cargo: 'Rectora Sede Rural Los Sauces',
      titulo: 'Lic. en Educación Rural — Universidad del Tolima',
      bio: 'Licenciada en Educación Rural con 20 años trabajando en comunidades campesinas. Creadora del Proyecto Huerta Viva, modelo agropecuario escolar premiado a nivel departamental.',
      areas_json: ['Educación Rural', 'Proyectos Agropecuarios', 'Comunidad'],
      logros_json: [
        { año: 2026, texto: 'Proyecto Huerta Viva seleccionado como modelo Cundinamarca' },
        { año: 2024, texto: 'Premio Maestro que Deja Huella — Gobernación Cundinamarca' },
      ],
      sedes: [s3],
    },
    // ─ COORDINADORA ─────────────────────────────────────────
    {
      email: 'diana.solano@itssantander.edu.co',
      nombre: 'Diana Solano Ortiz', password_hash: passCoord,
      rol: 'COORDINADOR', sede_id: s1.id,
      slug: 'diana-solano',
      cargo: 'Coordinadora Académica',
      titulo: 'Mg. en Dirección y Gestión de Instituciones Educativas',
      bio: 'Coordinadora académica con enfoque en convivencia escolar y evaluación por competencias. Lidera el sistema de seguimiento académico y el proceso de autoevaluación institucional.',
      areas_json: ['Gestión Académica', 'Convivencia Escolar', 'Evaluación'],
      logros_json: [],
      sedes: [s1],
    },
    // ─ ORIENTADORA ───────────────────────────────────────────
    {
      email: 'luz.rios@itssantander.edu.co',
      nombre: 'Luz Myriam Ríos Quintero', password_hash: passDocente,
      rol: 'ORIENTADORA', sede_id: s1.id,
      slug: 'luz-rios',
      cargo: 'Orientadora Escolar',
      titulo: 'Psicóloga — Universidad Javeriana · Esp. Psicología Educativa',
      bio: 'Psicóloga con especialización en psicología educativa. Atiende las tres sedes del instituto con enfoque en bienestar emocional, proyectos de vida y acompañamiento a estudiantes con necesidades educativas especiales.',
      areas_json: ['Orientación Escolar', 'Inclusión', 'Proyectos de Vida'],
      logros_json: [
        { año: 2025, texto: 'Implementación del programa de salud mental escolar' },
      ],
      sedes: [s1, s2, s3],
    },
    // ─ DOCENTES ──────────────────────────────────────────────
    {
      email: 'maria.gomez@itssantander.edu.co',
      nombre: 'María Fernanda Gómez López', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'maria-gomez',
      cargo: 'Docente de Lenguaje y Literatura',
      titulo: 'Lic. en Literatura — Universidad Nacional de Colombia',
      bio: 'Licenciada en Literatura con 10 años de experiencia. Apasionada por la lectura crítica y la escritura creativa. Directora del periódico escolar y coordinadora del Club de Poesía.',
      areas_json: ['Lenguaje', 'Literatura', 'Humanidades'],
      logros_json: [
        { año: 2026, texto: 'Estudiantes ganadores del concurso departamental de cuento' },
        { año: 2025, texto: 'Proyecto Escritores del Sumapaz publicado en libro físico' },
      ],
      sedes: [s1, s2],
    },
    {
      email: 'carlos.rodriguez@itssantander.edu.co',
      nombre: 'Carlos Eduardo Rodríguez', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'carlos-rodriguez',
      cargo: 'Docente de Matemáticas y Técnica Industrial',
      titulo: 'Ing. Industrial — Universidad Distrital Francisco José de Caldas',
      bio: 'Ingeniero Industrial y docente con 12 años en el aula. Fundador del Club de Robótica ITS. Especialista en metodologías STEM y en el uso de impresión 3D como herramienta pedagógica.',
      areas_json: ['Matemáticas', 'Técnica Industrial', 'Robótica', 'STEM'],
      logros_json: [
        { año: 2026, texto: 'Equipo Bots ITS clasifica al Torneo Nacional de Robótica' },
        { año: 2025, texto: 'Medalla de plata equipo Matemáticas olimpiada nacional' },
      ],
      sedes: [s1],
    },
    {
      email: 'andres.torres@itssantander.edu.co',
      nombre: 'Andrés Felipe Torres', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'andres-torres',
      cargo: 'Docente de Ciencias Naturales y Biología',
      titulo: 'Biólogo — Pontificia Universidad Javeriana',
      bio: 'Biólogo con maestría en educación ambiental. Lidera el proyecto de huerta escolar y forma estudiantes con conciencia ambiental y amor por los ecosistemas colombianos. Asesor del proyecto Huerta Viva en Los Sauces.',
      areas_json: ['Ciencias Naturales', 'Biología', 'Educación Ambiental', 'Química'],
      logros_json: [
        { año: 2026, texto: 'Huerta escolar modelo reconocida por Secretaría Educación' },
        { año: 2025, texto: 'Proyecto ambiental ganador feria de ciencias departamental' },
      ],
      sedes: [s1, s3],
    },
    {
      email: 'liliana.mosquera@itssantander.edu.co',
      nombre: 'Liliana Mosquera Reyes', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'liliana-mosquera',
      cargo: 'Docente de Inglés e Idiomas',
      titulo: 'Lic. en Idiomas — UPTC · Cambridge CELTA',
      bio: 'Licenciada en Idiomas certificada en Cambridge CELTA. Promueve la inmersión en inglés a través del Festival de Lenguas anual. Coach del equipo de debate en inglés del instituto.',
      areas_json: ['Inglés', 'Idiomas', 'Cultura Internacional'],
      logros_json: [
        { año: 2026, texto: 'Festival de Lenguas con 4 idiomas por primera vez' },
        { año: 2024, texto: 'Estudiantes nivel B1 en examen Cambridge' },
      ],
      sedes: [s1, s2],
    },
    {
      email: 'jorge.perez@itssantander.edu.co',
      nombre: 'Jorge Arturo Pérez Suárez', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'jorge-perez',
      cargo: 'Docente de Educación Física y Deportes',
      titulo: 'Lic. en Educación Física — Universidad Pedagógica Nacional',
      bio: 'Licenciado en Educación Física y ex-jugador profesional. Forma valores como el trabajo en equipo, la disciplina y la perseverancia. Entrenador del equipo de fútbol que llegó a la final municipal.',
      areas_json: ['Educación Física', 'Deportes', 'Salud y Bienestar'],
      logros_json: [
        { año: 2026, texto: 'Equipo de fútbol finalista Campeonato Municipal Cundinamarca' },
        { año: 2025, texto: 'Equipo de atletismo campeón inter-colegial Sumapaz' },
      ],
      sedes: [s1, s2],
    },
    {
      email: 'sandra.rivas@itssantander.edu.co',
      nombre: 'Sandra Milena Rivas', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s2.id,
      slug: 'sandra-rivas',
      cargo: 'Docente de Artes y Expresión Cultural',
      titulo: 'Artista Plástica — Universidad de Bellas Artes de Colombia',
      bio: 'Artista plástica egresada de Bellas Artes. Integrante del colectivo de muralistas de Fusagasugá. Transforma los espacios del colegio con arte participativo y lleva a sus estudiantes al Festival Nacional de Danza.',
      areas_json: ['Artes Plásticas', 'Danza', 'Cultura', 'Expresión Creativa'],
      logros_json: [
        { año: 2026, texto: '3er lugar Nacional Festival de Danza Escolar Bogotá' },
        { año: 2025, texto: 'Cuatro murales estudiantiles en corredores del instituto' },
      ],
      sedes: [s1, s2],
    },
    {
      email: 'hernando.castillo@itssantander.edu.co',
      nombre: 'Hernando Castillo Parra', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s3.id,
      slug: 'hernando-castillo',
      cargo: 'Docente de Ciencias Sociales e Historia',
      titulo: 'Historiador — Universidad de Antioquia · Esp. Educación Rural',
      bio: 'Historiador especializado en educación rural. Conecta a sus estudiantes con la identidad del territorio cundinamarqués a través de recorridos históricos, trabajo de memoria oral y proyectos de identidad local.',
      areas_json: ['Ciencias Sociales', 'Historia', 'Geografía', 'Democracia'],
      logros_json: [
        { año: 2026, texto: 'Libro de historia local escrito con estudiantes de Los Sauces' },
        { año: 2025, texto: 'Proyecto Memoria Viva ganador concurso Colciencias' },
      ],
      sedes: [s3, s1],
    },
    {
      email: 'rosa.vargas@itssantander.edu.co',
      nombre: 'Rosa Elena Vargas', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'rosa-vargas',
      cargo: 'Docente de Ética, Valores y Filosofía',
      titulo: 'Lic. en Filosofía y Ciencias Religiosas — Universidad de La Salle',
      bio: 'Licenciada en Filosofía con énfasis en ética aplicada. Lidera los proyectos de convivencia escolar y el programa de habilidades socioemocionales. Mediadora certificada de conflictos escolares.',
      areas_json: ['Ética y Valores', 'Filosofía', 'Convivencia Escolar'],
      logros_json: [
        { año: 2025, texto: 'Programa de mediación escolar reduce conflictos en 60%' },
      ],
      sedes: [s1, s2],
    },
    {
      email: 'felipe.mantilla@itssantander.edu.co',
      nombre: 'Felipe Andrés Mantilla López', password_hash: passDocente,
      rol: 'DOCENTE', sede_id: s1.id,
      slug: 'felipe-mantilla',
      cargo: 'Docente Técnica Industrial y Electrónica',
      titulo: 'Ing. Electrónico — Universidad Antonio Nariño',
      bio: 'Ingeniero electrónico con especialización en automatización industrial. Docente de técnica con enfoque en electrónica básica, soldadura, metrología y proyectos de emprendimiento técnico.',
      areas_json: ['Técnica Industrial', 'Electrónica', 'Automatización', 'Emprendimiento'],
      logros_json: [
        { año: 2026, texto: 'Taller de electrónica dotado con banco de trabajo profesional' },
      ],
      sedes: [s1],
    },
  ];

  const usuarios = {};
  for (const d of usuariosData) {
    const { cargo, titulo, bio, areas_json, logros_json, sede_id, sedes: docSedes, slug, ...userData } = d;
    const [u] = await Usuario.findOrCreate({
      where: { email: userData.email },
      defaults: { ...userData, activo: true, sede_principal_id: sede_id },
    });
    await u.update({ nombre: userData.nombre, rol: userData.rol, activo: true, sede_principal_id: sede_id });

    const [perfil] = await PerfilDocente.findOrCreate({
      where: { usuario_id: u.id },
      defaults: {
        usuario_id: u.id,
        foto_url: AVATAR(slug),
        titulo_profesional: titulo,
        cargo,
        bio,
        estudios: areas_json,
        logros: logros_json,
        perfil_publico: true,
        ultima_actualizacion: new Date(),
      },
    });
    await perfil.update({
      foto_url: AVATAR(slug),
      titulo_profesional: titulo,
      cargo, bio,
      estudios: areas_json,
      logros: logros_json,
      perfil_publico: true,
      ultima_actualizacion: new Date(),
    });

    for (const sede of docSedes) {
      if (sede) await DocenteSede.findOrCreate({ where: { usuario_id: u.id, sede_id: sede.id } });
    }
    usuarios[userData.email] = u;
    console.log(`  👤 ${userData.nombre} (${userData.rol})`);
  }
  console.log(`\n✅ ${usuariosData.length} usuarios creados/actualizados\n`);

  // ── Referencias rápidas ───────────────────────────────────
  const rector   = usuarios['patricia.diaz@itssantander.edu.co'];
  const maria    = usuarios['maria.gomez@itssantander.edu.co'];
  const carlos   = usuarios['carlos.rodriguez@itssantander.edu.co'];
  const andres   = usuarios['andres.torres@itssantander.edu.co'];
  const liliana  = usuarios['liliana.mosquera@itssantander.edu.co'];
  const jorge    = usuarios['jorge.perez@itssantander.edu.co'];
  const sandra   = usuarios['sandra.rivas@itssantander.edu.co'];
  const hernando = usuarios['hernando.castillo@itssantander.edu.co'];
  const rosa     = usuarios['rosa.vargas@itssantander.edu.co'];
  const felipe   = usuarios['felipe.mantilla@itssantander.edu.co'];

  // ── 5. CURSOS ─────────────────────────────────────────────
  // ─ Bachillerato (s1): grado 6-11, jornada manana/tarde ─
  const cursosData = [
    // Básica Secundaria 6°
    { nombre: 'Grado 6-A', nivel: 'Básica Secundaria', jornada: 'manana', sede_id: s1.id, director_id: maria.id, anio_lectivo: 2026 },
    { nombre: 'Grado 6-B', nivel: 'Básica Secundaria', jornada: 'tarde',  sede_id: s1.id, director_id: carlos.id, anio_lectivo: 2026 },
    // 7°
    { nombre: 'Grado 7-A', nivel: 'Básica Secundaria', jornada: 'manana', sede_id: s1.id, director_id: andres.id, anio_lectivo: 2026 },
    { nombre: 'Grado 7-B', nivel: 'Básica Secundaria', jornada: 'tarde',  sede_id: s1.id, director_id: liliana.id, anio_lectivo: 2026 },
    // 8°
    { nombre: 'Grado 8-A', nivel: 'Básica Secundaria', jornada: 'manana', sede_id: s1.id, director_id: jorge.id, anio_lectivo: 2026 },
    { nombre: 'Grado 8-B', nivel: 'Básica Secundaria', jornada: 'tarde',  sede_id: s1.id, director_id: maria.id, anio_lectivo: 2026 },
    // 9°
    { nombre: 'Grado 9-A', nivel: 'Básica Secundaria', jornada: 'manana', sede_id: s1.id, director_id: carlos.id, anio_lectivo: 2026 },
    { nombre: 'Grado 9-B', nivel: 'Básica Secundaria', jornada: 'tarde',  sede_id: s1.id, director_id: andres.id, anio_lectivo: 2026 },
    // Media Académica 10°
    { nombre: 'Grado 10-A', nivel: 'Media Académica', jornada: 'manana', sede_id: s1.id, director_id: liliana.id, anio_lectivo: 2026 },
    { nombre: 'Grado 10-B', nivel: 'Media Académica', jornada: 'tarde',  sede_id: s1.id, director_id: jorge.id, anio_lectivo: 2026 },
    // 11°
    { nombre: 'Grado 11-A', nivel: 'Media Técnica', jornada: 'manana', sede_id: s1.id, director_id: carlos.id, anio_lectivo: 2026 },
    { nombre: 'Grado 11-B', nivel: 'Media Técnica', jornada: 'tarde',  sede_id: s1.id, director_id: hernando.id, anio_lectivo: 2026 },
    // ─ Básica Primaria (s2) ──
    { nombre: 'Grado 1°', nivel: 'Básica Primaria', jornada: 'manana', sede_id: s2.id, director_id: sandra.id, anio_lectivo: 2026 },
    { nombre: 'Grado 2°', nivel: 'Básica Primaria', jornada: 'manana', sede_id: s2.id, director_id: maria.id, anio_lectivo: 2026 },
    { nombre: 'Grado 3°', nivel: 'Básica Primaria', jornada: 'manana', sede_id: s2.id, director_id: rosa.id, anio_lectivo: 2026 },
    { nombre: 'Grado 4°', nivel: 'Básica Primaria', jornada: 'manana', sede_id: s2.id, director_id: liliana.id, anio_lectivo: 2026 },
    { nombre: 'Grado 5°', nivel: 'Básica Primaria', jornada: 'manana', sede_id: s2.id, director_id: jorge.id, anio_lectivo: 2026 },
    // ─ Rural Los Sauces (s3) ─
    { nombre: 'Multigrado 1°-3°', nivel: 'Básica Multigrado', jornada: 'unica', sede_id: s3.id, director_id: andres.id, anio_lectivo: 2026 },
    { nombre: 'Multigrado 4°-5°', nivel: 'Básica Multigrado', jornada: 'unica', sede_id: s3.id, director_id: hernando.id, anio_lectivo: 2026 },
  ];

  const cursos = {};
  for (const c of cursosData) {
    const [curso] = await Curso.findOrCreate({
      where: { nombre: c.nombre, sede_id: c.sede_id, anio_lectivo: c.anio_lectivo },
      defaults: c,
    });
    await curso.update({ director_id: c.director_id, nivel: c.nivel, jornada: c.jornada });
    cursos[c.nombre] = curso;
    console.log(`  📚 ${c.nombre} (${c.nivel} · ${c.jornada})`);
  }
  console.log(`\n✅ ${cursosData.length} cursos creados/actualizados\n`);

  // ── 6. ASIGNACIONES DOCENTE ↔ CURSO ↔ ÁREA ───────────────
  // Helper: crea CursoDocente si no existe
  const asignar = async (curso, usuario, areaNombre) => {
    const area = areas[areaNombre];
    if (!curso || !usuario || !area) return;
    await CursoDocente.findOrCreate({
      where: { curso_id: curso.id, usuario_id: usuario.id, area_id: area.id },
    });
  };

  const bach = (n) => cursos[`Grado ${n}`];
  const c6A  = cursos['Grado 6-A'],  c6B  = cursos['Grado 6-B'];
  const c7A  = cursos['Grado 7-A'],  c7B  = cursos['Grado 7-B'];
  const c8A  = cursos['Grado 8-A'],  c8B  = cursos['Grado 8-B'];
  const c9A  = cursos['Grado 9-A'],  c9B  = cursos['Grado 9-B'];
  const c10A = cursos['Grado 10-A'], c10B = cursos['Grado 10-B'];
  const c11A = cursos['Grado 11-A'], c11B = cursos['Grado 11-B'];
  const p1   = cursos['Grado 1°'],   p2   = cursos['Grado 2°'];
  const p3   = cursos['Grado 3°'],   p4   = cursos['Grado 4°'];
  const p5   = cursos['Grado 5°'];
  const r13  = cursos['Multigrado 1°-3°'];
  const r45  = cursos['Multigrado 4°-5°'];

  const todoBach = [c6A,c6B,c7A,c7B,c8A,c8B,c9A,c9B,c10A,c10B,c11A,c11B];
  const todoPrim = [p1,p2,p3,p4,p5];
  const todoRural = [r13,r45];

  // Carlos — Matemáticas en todo bachillerato + Técnica en 8°-11°
  for (const c of todoBach) await asignar(c, carlos, 'Matemáticas');
  for (const c of [c8A,c8B,c9A,c9B,c10A,c10B,c11A,c11B]) await asignar(c, carlos, 'Tecnología e Informática');
  for (const c of [c10A,c10B,c11A,c11B]) await asignar(c, carlos, 'Técnica Industrial');

  // María — Lenguaje en 6°-8° bachillerato + toda primaria
  for (const c of [c6A,c6B,c7A,c7B,c8A,c8B]) await asignar(c, maria, 'Lenguaje');
  for (const c of todoPrim) await asignar(c, maria, 'Lenguaje');

  // Andrés — Ciencias Naturales en 6°-9° + rural
  for (const c of [c6A,c6B,c7A,c7B,c8A,c8B,c9A,c9B]) await asignar(c, andres, 'Ciencias Naturales');
  for (const c of todoRural) await asignar(c, andres, 'Ciencias Naturales');

  // Liliana — Inglés en todo bachillerato + 4°-5° primaria
  for (const c of todoBach) await asignar(c, liliana, 'Inglés');
  for (const c of [p4,p5]) await asignar(c, liliana, 'Inglés');

  // Jorge — Ed. Física en todo bachillerato + toda primaria
  for (const c of todoBach) await asignar(c, jorge, 'Educación Física');
  for (const c of todoPrim) await asignar(c, jorge, 'Educación Física');

  // Sandra — Artes en toda primaria + 6°-8° bachillerato
  for (const c of todoPrim) await asignar(c, sandra, 'Artes');
  for (const c of [c6A,c6B,c7A,c7B,c8A,c8B]) await asignar(c, sandra, 'Artes');

  // Hernando — Sociales en 9°-11° + rural
  for (const c of [c9A,c9B,c10A,c10B,c11A,c11B]) await asignar(c, hernando, 'Ciencias Sociales');
  for (const c of todoRural) await asignar(c, hernando, 'Ciencias Sociales');

  // Rosa — Ética en todo bachillerato + primaria
  for (const c of todoBach) await asignar(c, rosa, 'Ética y Valores');
  for (const c of [p3,p4,p5]) await asignar(c, rosa, 'Ética y Valores');

  // Felipe — Técnica Industrial en 8°-9°
  for (const c of [c8A,c8B,c9A,c9B]) await asignar(c, felipe, 'Técnica Industrial');

  console.log('✅ Asignaciones docente-curso-área creadas\n');

  // ── 7. NOTICIAS ───────────────────────────────────────────
  const noticiasData = [
    {
      titulo: 'Estudiantes de grado 11° brillan en la Olimpiada Nacional de Matemáticas',
      resumen: 'Tres estudiantes obtuvieron medalla de plata en la competencia nacional, posicionando al instituto como referente académico en Cundinamarca.',
      contenido: `<p>Con enorme orgullo, el Instituto Técnico Industrial Santander celebra el extraordinario logro de tres estudiantes de grado undécimo, quienes obtuvieron <strong>medalla de plata</strong> en la Olimpiada Nacional de Matemáticas 2026, realizada en Bogotá.</p>
<h2>Un esfuerzo de meses</h2>
<p>Los jóvenes Sebastián Moreno, Valentina Quintero y David Angarita dedicaron cuatro meses de preparación intensiva bajo la tutoría del profesor Carlos Eduardo Rodríguez, quien diseñó un plan de estudio personalizado combinando teoría de números, geometría analítica y álgebra avanzada.</p>
<blockquote>«Estos estudiantes demostraron que la disciplina y el amor por el conocimiento no tienen límites geográficos. Fusagasugá le habla al país.»</blockquote>
<p>La competencia contó con más de 320 equipos de todo el país. El ITS Santander fue la única institución del Sumapaz en alcanzar el podio.</p>`,
      cat: 'Académico', sede: s1, autor: carlos,
      imgSeed: 'math-competition', alt: 'Estudiantes del ITS con medalla de plata en Olimpiada Nacional de Matemáticas',
      fecha: new Date('2026-05-08'), visitas: 142, destacada: true,
    },
    {
      titulo: 'Inauguramos el nuevo Laboratorio de Tecnología e Informática',
      resumen: 'Con 30 computadores de última generación y acceso a plataformas de programación, el laboratorio transforma las posibilidades de más de 800 estudiantes.',
      contenido: `<p>Este martes fue un día histórico para el Instituto. En una emotiva ceremonia, se inauguró el <strong>nuevo Laboratorio de Tecnología e Informática</strong>, dotado con 30 computadores de alta gama, fibra óptica y licencias para software de diseño y programación.</p>
<h2>Inversión en el futuro</h2>
<p>El proyecto fue posible gracias a la gestión conjunta de la rectoría, la Alcaldía de Fusagasugá y el Ministerio de Educación en el marco del programa <em>Aulas Conectadas</em>. La inversión total superó los 180 millones de pesos.</p>
<ul>
<li>Plataforma Scratch y Python para programación básica y avanzada</li>
<li>Suite Adobe para diseño gráfico y multimedia</li>
<li>Simuladores de procesos industriales</li>
<li>Herramientas de robótica con Arduino y Lego Mindstorms</li>
</ul>
<blockquote>«El laboratorio no es solo tecnología. Es la puerta de entrada al mundo digital para los jóvenes de Fusagasugá.»</blockquote>`,
      cat: 'Tecnología', sede: s1, autor: carlos,
      imgSeed: 'computer-lab', alt: 'Estudiantes explorando el nuevo laboratorio de tecnología del ITS Santander',
      fecha: new Date('2026-05-06'), visitas: 98, destacada: true,
    },
    {
      titulo: 'Festival de las Lenguas 2026: nuestros estudiantes conquistan el escenario',
      resumen: 'El festival reunió a más de 400 estudiantes que presentaron obras, canciones y debates en inglés, francés y portugués.',
      contenido: `<p>El auditorio del ITS vibró dos días enteros con el <strong>Festival de las Lenguas 2026</strong>, la celebración anual que promueve el aprendizaje de idiomas a través del arte, la música y el teatro.</p>
<h2>Cuatro idiomas, una comunidad</h2>
<p>Este año, por primera vez, se incorporó el portugués como cuarto idioma. Más de 400 estudiantes de todos los grados participaron en debate académico, canción original, obra de teatro y presentación cultural.</p>
<h2>Ganadores 2026</h2>
<ul>
<li><strong>Mejor obra de teatro:</strong> Grado 9° con "The Last Garden"</li>
<li><strong>Mejor canción original:</strong> Valentina Cruz, grado 10°</li>
<li><strong>Mejor debate:</strong> Equipo de grado 11°</li>
</ul>`,
      cat: 'Cultural', sede: s1, autor: liliana,
      imgSeed: 'language-festival', alt: 'Estudiantes del ITS durante el Festival de las Lenguas 2026',
      fecha: new Date('2026-05-02'), visitas: 87, destacada: true,
    },
    {
      titulo: 'Equipo de fútbol del ITS llega a la gran final del campeonato municipal',
      resumen: 'Los Técnicos golearon 3-1 en semifinales y se preparan para la final del próximo sábado contra La Presentación.',
      contenido: `<p>Los pasillos retumbaron de alegría cuando se conoció el resultado: <strong>ITS Santander 3 – Colegio Fusagasugá 1</strong>. El equipo masculino sub-17 clasificó a la gran final del Campeonato Intermunicipal de Cundinamarca.</p>
<p>Los goles llegaron por cuenta de Julián Espitia (2) y Kevin Pulido, en lo que el entrenador Jorge Pérez calificó como «la mejor actuación colectiva de muchos años».</p>
<p>Más de 200 estudiantes y docentes acompañaron al equipo en el estadio, convirtiendo las gradas en un mar de los colores del instituto.</p>
<blockquote>«Este equipo lleva el corazón del instituto en cada partido. La final la ganamos con actitud y trabajo.»</blockquote>`,
      cat: 'Deportivo', sede: s1, autor: jorge,
      imgSeed: 'soccer-stadium', alt: 'Equipo de fútbol del ITS celebrando clasificación a la final municipal',
      fecha: new Date('2026-04-28'), visitas: 203, destacada: false,
    },
    {
      titulo: 'Proyecto Huerta Viva de Los Sauces es modelo de educación ambiental en Cundinamarca',
      resumen: 'La Secretaría de Educación departamental seleccionó el proyecto agropecuario de la sede rural como referente de buenas prácticas pedagógicas.',
      contenido: `<p>La sede rural Los Sauces recibió una visita especial: un equipo de la <strong>Secretaría de Educación de Cundinamarca</strong> llegó para documentar el proyecto Huerta Viva como modelo de buenas prácticas en educación ambiental.</p>
<p>El proyecto, liderado por el docente Andrés Felipe Torres, lleva tres años transformando un lote abandonado en una huerta productiva con más de 20 variedades de hortalizas, plantas medicinales y frutas nativas.</p>
<ul>
<li>Más de 60 estudiantes participan activamente cada semana</li>
<li>2.500 kg de alimentos producidos en el año escolar</li>
<li>Reducción del 40% en residuos orgánicos enviados a relleno sanitario</li>
</ul>
<blockquote>«Los niños aprenden que la tierra da lo que uno le cuida. Y eso es una lección para toda la vida.»</blockquote>`,
      cat: 'Comunidad', sede: s3, autor: andres,
      imgSeed: 'garden-school', alt: 'Estudiantes de Los Sauces trabajando en la huerta escolar Proyecto Huerta Viva',
      fecha: new Date('2026-04-22'), visitas: 76, destacada: false,
    },
    {
      titulo: 'Arte urbano transforma los corredores del instituto con murales estudiantiles',
      resumen: 'Cuatro murales gigantes diseñados y pintados por estudiantes decoran los pasillos, convirtiendo el instituto en una galería a cielo abierto.',
      contenido: `<p>Los corredores del ITS se convirtieron en una vibrante galería de arte urbano. <strong>Cuatro murales de gran formato</strong> adornan ahora las paredes principales, diseñados y pintados por estudiantes bajo la dirección de la docente Sandra Milena Rivas.</p>
<ul>
<li><strong>"Raíces":</strong> La identidad campesina y técnica del municipio</li>
<li><strong>"Código y Sueño":</strong> La tecnología como camino al futuro</li>
<li><strong>"La Selva que Somos":</strong> La biodiversidad colombiana</li>
<li><strong>"Juntos":</strong> La diversidad de nuestra comunidad educativa</li>
</ul>
<p>La docente Rivas contó que el proyecto fue «un ejercicio de democracia y creatividad. El colegio ahora les pertenece aún más a ellos».</p>`,
      cat: 'Cultural', sede: s2, autor: sandra,
      imgSeed: 'mural-art', alt: 'Murales estudiantiles coloridos en los corredores del ITS Santander',
      fecha: new Date('2026-04-18'), visitas: 115, destacada: false,
    },
    {
      titulo: 'Convenio con el SENA abre educación dual para nuestros egresados',
      resumen: 'El acuerdo permite a los egresados acceder a programas técnicos del SENA con reconocimiento de competencias previas.',
      contenido: `<p>El ITS Santander firmó un <strong>Convenio Marco de Articulación con el SENA regional Cundinamarca</strong>, que beneficiará a los egresados con acceso preferencial y reconocimiento de competencias.</p>
<p>A partir de 2027, los graduados del ITS podrán:</p>
<ul>
<li>Ingresar a programas técnicos del SENA <strong>sin prueba de admisión</strong></li>
<li>Recibir reconocimiento de hasta el 30% de los módulos</li>
<li>Acceder a becas de formación dual desde grado 10°</li>
<li>Conectarse con la bolsa de empleo del SENA desde grado 10°</li>
</ul>
<blockquote>«Nuestros estudiantes no solo van a obtener su grado. Van a salir con una ventaja real para su futuro.»</blockquote>`,
      cat: 'Académico', sede: s1, autor: rector,
      imgSeed: 'agreement-education', alt: 'Firma del convenio entre ITS Santander y el SENA Cundinamarca',
      fecha: new Date('2026-04-15'), visitas: 134, destacada: false,
    },
    {
      titulo: 'Acto de grado: 85 bachilleres técnicos listos para transformar el futuro',
      resumen: 'En emotiva ceremonia, el ITS celebró la graduación de la Promoción 2025 con presencia de autoridades municipales.',
      contenido: `<p>En una emotiva ceremonia, <strong>85 jóvenes bachilleres técnicos</strong> recibieron su diploma de la Promoción 2025, la decimocuarta en la historia del instituto.</p>
<p>Esta generación lleva el nombre <em>"Generación Raíces"</em>, elegido por los propios estudiantes como símbolo de arraigo e identidad. La estudiante más destacada, Valeria Suárez Mendoza, obtuvo 385 puntos en las Pruebas Saber 11.</p>
<blockquote>«Nos formaron para pensar, para crear y para servir. Llevamos el Instituto en el alma.»</blockquote>
<p>El alcalde de Fusagasugá, el personero municipal y el director de la JUME estuvieron presentes en la ceremonia.</p>`,
      cat: 'Logros', sede: s1, autor: rector,
      imgSeed: 'graduation-school', alt: 'Egresados del ITS Santander en la ceremonia de grado Promoción 2025',
      fecha: new Date('2026-04-10'), visitas: 189, destacada: false,
    },
    {
      titulo: 'Brigada de salud atiende a más de 200 familias de la comunidad',
      resumen: 'Estudiantes de grado 10° y 11° organizaron con la Alcaldía una jornada con toma de tensión, odontología preventiva y orientación nutricional.',
      contenido: `<p>Estudiantes del ITS Santander, en alianza con la Secretaría de Salud de Fusagasugá, realizaron una <strong>brigada de salud integral</strong> en el barrio La Palma.</p>
<p>La jornada ofreció de forma gratuita toma de presión arterial, revisión odontológica, orientación nutricional, vacunación para niños y charlas sobre salud mental.</p>
<p>Más de 200 personas se beneficiaron. Los estudiantes auxiliares recibieron horas de servicio social y diploma de reconocimiento.</p>
<blockquote>«Esto es educación en el sentido más amplio: aprender a cuidar a los demás.»</blockquote>`,
      cat: 'Comunidad', sede: s1, autor: maria,
      imgSeed: 'health-community', alt: 'Estudiantes del ITS en brigada de salud comunitaria en Fusagasugá',
      fecha: new Date('2026-04-05'), visitas: 67, destacada: false,
    },
    {
      titulo: 'Club de Robótica clasifica al Torneo Nacional con robot autónomo',
      resumen: 'El equipo Bots ITS clasificó al Torneo Nacional de Robótica Educativa con un robot que navega laberintos y evita obstáculos en tiempo real.',
      contenido: `<p>El equipo <em>Bots ITS</em> clasificó al <strong>Torneo Nacional de Robótica Educativa 2026</strong> tras obtener el primer lugar en la fase regional en Bogotá.</p>
<p>El equipo presentó un robot autónomo capaz de navegar laberintos, identificar colores y evitar obstáculos. Construido con Lego Mindstorms y programado en Python bajo la tutoría del docente Carlos Rodríguez.</p>
<ul>
<li>Tomás Herrera (11°) — Programación</li>
<li>Isabella Morales (10°) — Diseño mecánico</li>
<li>Camilo Ruiz (10°) — Electrónica</li>
<li>Sofía Quintero (9°) — Pruebas y calidad</li>
</ul>
<p>El torneo nacional se realizará en Medellín en agosto. El ITS será el único representante de Cundinamarca Sur.</p>`,
      cat: 'Tecnología', sede: s1, autor: carlos,
      imgSeed: 'robotics-competition', alt: 'Equipo Bots ITS con su robot autónomo clasificado al Torneo Nacional',
      fecha: new Date('2026-03-28'), visitas: 156, destacada: false,
    },
    {
      titulo: 'Danza folclórica del ITS representa a Fusagasugá en el Festival Nacional',
      resumen: 'El grupo Danzas Raíces actuó ante 3.000 personas en el Teatro Jorge Eliécer Gaitán de Bogotá, obteniendo tercer lugar nacional.',
      contenido: `<p>Ante un teatro lleno, el grupo <em>Danzas Raíces</em> del ITS Santander presentó un espectáculo de folclor colombiano en el <strong>Festival Nacional de Danza Escolar</strong> en el Teatro Jorge Eliécer Gaitán.</p>
<p>La coreografía presentó cuatro regiones: cumbia costeña, bambuco andino, joropo llanero y mapalé, hilados por la narrativa de un estudiante que descubre su país a través del baile.</p>
<blockquote>«Cuando vimos el teatro lleno, supe que todo el sacrificio valió la pena.»</blockquote>
<p>El grupo obtuvo el tercer lugar nacional, el mejor resultado histórico para una institución de Fusagasugá.</p>`,
      cat: 'Cultural', sede: s1, autor: sandra,
      imgSeed: 'dance-performance', alt: 'Grupo Danzas Raíces del ITS actuando en el Teatro Jorge Eliécer Gaitán de Bogotá',
      fecha: new Date('2026-03-20'), visitas: 212, destacada: false,
    },
    {
      titulo: 'Reconocimiento departamental a prácticas pedagógicas innovadoras del ITS',
      resumen: 'La Gobernación de Cundinamarca distinguió al ITS como una de las cinco instituciones con mejores prácticas pedagógicas del departamento.',
      contenido: `<p>La Gobernación de Cundinamarca entregó al ITS Santander el <strong>Reconocimiento Departamental a la Innovación Pedagógica 2026</strong> en una ceremonia donde participaron los 116 municipios del departamento.</p>
<p>El instituto fue seleccionado por tres prácticas ejemplares:</p>
<ol>
<li><strong>El Laboratorio Vivo:</strong> integración de huerta escolar con ciencias y matemáticas</li>
<li><strong>Código para Todos:</strong> programación básica desde grado 3°</li>
<li><strong>La Revista Digital:</strong> espacio de escritura y comunicación estudiantil</li>
</ol>
<blockquote>«Este reconocimiento no es de la rectoría. Es de cada docente que innova todos los días en su salón.»</blockquote>`,
      cat: 'Logros', sede: s1, autor: rector,
      imgSeed: 'award-ceremony', alt: 'Rectora del ITS recibiendo reconocimiento departamental de la Gobernación de Cundinamarca',
      fecha: new Date('2026-03-15'), visitas: 178, destacada: false,
    },
    {
      titulo: 'Feria de proyectos muestra el talento investigativo de los estudiantes',
      resumen: 'La Feria de Proyectos 2026 reunió 18 propuestas de grado 10° y 11° con jurado externo de la Universidad de Cundinamarca.',
      contenido: `<p>Por noveno año consecutivo, el ITS realizó su <strong>Feria de Proyectos de Grado</strong>, donde estudiantes de últimos años presentan propuestas investigativas ante docentes y jurado externo.</p>
<p>Los proyectos más destacados:</p>
<ol>
<li><strong>"App para seguimiento de residuos en la huerta escolar"</strong> — tecnología ambiental</li>
<li><strong>"Plan de emprendimiento para productores de panela de Los Sauces"</strong> — economía rural</li>
<li><strong>"Diseño de prótesis de bajo costo con impresión 3D"</strong> — ingeniería social</li>
</ol>
<p>Los tres proyectos fueron recomendados para la Feria de Ciencias de Cundinamarca.</p>`,
      cat: 'Académico', sede: s1, autor: andres,
      imgSeed: 'science-fair-students', alt: 'Estudiantes presentando proyectos de grado en la Feria 2026 del ITS Santander',
      fecha: new Date('2026-03-05'), visitas: 84, destacada: false,
    },
    {
      titulo: 'Estudiantes de primaria son protagonistas del Día del Idioma',
      resumen: 'Con poesía, cuentos y canciones, más de 280 niños celebraron el Día del Idioma en la sede de básica primaria.',
      contenido: `<p>El 23 de abril, la sede de Básica Primaria se llenó de letras y sonrisas. <strong>Más de 280 niños</strong> participaron en el festival literario que celebra la riqueza del español.</p>
<p>Las actividades incluyeron La Hora del Cuento, el rincón de la poesía, la carrera de los refranes y El Cuento Sin Fin, una historia construida colectivamente entre todos los grados.</p>
<blockquote>«Cuando los niños descubren que las palabras tienen poder, descubren que ellos mismos lo tienen.»</blockquote>`,
      cat: 'Cultural', sede: s2, autor: maria,
      imgSeed: 'kids-reading', alt: 'Niños de primaria del ITS celebrando el Día del Idioma con poesía y cuentos',
      fecha: new Date('2026-04-24'), visitas: 61, destacada: false,
    },
    {
      titulo: 'Intercambio académico con colegio bogotano enriquece la experiencia estudiantil',
      resumen: '40 estudiantes del Colegio Nicolás Esguerra visitaron el ITS por tres días en un intercambio sobre educación técnica y emprendimiento.',
      contenido: `<p>Durante tres días, 40 estudiantes y 4 docentes del <strong>Colegio Nacional Nicolás Esguerra de Bogotá</strong> visitaron el ITS en un intercambio que dejó aprendizajes profundos en ambas comunidades.</p>
<p>Las actividades incluyeron talleres conjuntos de robótica y programación, sesiones de proyectos de vida, visita a las tres sedes del ITS y conversatorios sobre educación técnica y emprendimiento.</p>
<blockquote>«Vine pensando que el colegio del pueblo sería más pequeño en todo. Me voy pensando que es más grande en lo que importa.»</blockquote>`,
      cat: 'Académico', sede: s1, autor: maria,
      imgSeed: 'students-collaboration', alt: 'Estudiantes del ITS y del colegio bogotano en actividades de intercambio académico',
      fecha: new Date('2026-03-10'), visitas: 93, destacada: false,
    },
  ];

  const galeriaImages = [];
  let nCreadas = 0;
  for (const n of noticiasData) {
    const [noticia, created] = await Noticia.findOrCreate({
      where: { titulo: n.titulo },
      defaults: {
        titulo: n.titulo,
        resumen: n.resumen,
        contenido: n.contenido,
        estado: 'publicada',
        destacada: n.destacada,
        visitas: n.visitas,
        fecha_publicacion: n.fecha,
        autor_id: n.autor.id,
        categoria_id: cats[n.cat]?.id || null,
        sede_id: n.sede.id,
      },
    });
    if (!created) {
      await noticia.update({ estado: 'publicada', destacada: n.destacada, visitas: n.visitas });
    }

    let imagen = await Imagen.findOne({ where: { noticia_id: noticia.id, es_portada: true } });
    if (!imagen) {
      imagen = await Imagen.create({
        noticia_id: noticia.id,
        filename: `demo-${n.imgSeed}.jpg`,
        url: IMG_NEWS(n.imgSeed),
        alt_text: n.alt,
        es_portada: true,
        score_visual: 0.75 + Math.random() * 0.2,
        procesada_por_ia: true,
      });
    }
    galeriaImages.push({ imagen, noticia, sede: n.sede });
    nCreadas++;
  }
  console.log(`✅ ${nCreadas} noticias creadas/actualizadas\n`);

  // ── 8. GALERÍA ────────────────────────────────────────────
  const secciones = ['portada', 'destacados', 'destacados', 'recientes', 'recientes',
    'recientes', 'recientes', 'recientes', 'recientes', 'recientes',
    'recientes', 'recientes', 'recientes', 'recientes', 'recientes'];
  for (let i = 0; i < galeriaImages.length; i++) {
    const { imagen, sede } = galeriaImages[i];
    await GaleriaItem.findOrCreate({
      where: { imagen_id: imagen.id },
      defaults: {
        imagen_id: imagen.id,
        sede_id: sede.id,
        seccion: secciones[i] || 'recientes',
        posicion: i,
        activo: true,
        asignado_por_ia: true,
        score_relevancia: imagen.score_visual || 0.8,
      },
    });
  }
  console.log(`✅ ${galeriaImages.length} items de galería creados\n`);

  // ── 9. VIDEOS YOUTUBE ─────────────────────────────────────
  const videosData = [
    {
      titulo: 'Acto de Grado Promoción 2025 — ITS Santander',
      descripcion: 'Emotiva ceremonia de graduación de los 85 bachilleres técnicos de la Promoción 2025 "Generación Raíces".',
      youtube_id: 'M7lc1UVf-VE',
      youtube_url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      thumbnail_url: 'https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg',
      duracion: '28:45',
      autor_id: rector.id, sede_id: s1.id, estado: 'aprobado',
    },
    {
      titulo: 'Festival Cultural ITS 2026 — Presentación de Danza Folclórica',
      descripcion: 'El grupo Danzas Raíces presenta su coreografía ganadora del tercer lugar en el Festival Nacional de Danza Escolar.',
      youtube_id: 'kJQP7kiw5Fk',
      youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
      duracion: '15:22',
      autor_id: sandra.id, sede_id: s1.id, estado: 'aprobado',
    },
    {
      titulo: 'Torneo Municipal de Fútbol — ITS vs Colegio Fusagasugá',
      descripcion: 'Partido de semifinales del Campeonato Intermunicipal de Cundinamarca. Los Técnicos ganan 3-1 y clasifican a la final.',
      youtube_id: 'dQw4w9WgXcQ',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      duracion: '47:03',
      autor_id: jorge.id, sede_id: s1.id, estado: 'aprobado',
    },
  ];

  for (const v of videosData) {
    await VideoYoutube.findOrCreate({ where: { youtube_id: v.youtube_id }, defaults: v });
  }
  console.log(`✅ ${videosData.length} videos YouTube creados\n`);

  // ── Resumen ───────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEED DEMO COMPLETADO — ITS Santander
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏫 3 sedes actualizadas
  📚 ${Object.keys(areas).length} áreas
  🏷️  7 categorías
  👤 ${usuariosData.length} usuarios (3 rectores · 1 coord · 1 orient · 9 docentes)
  📖 19 cursos (12 bachillerato · 5 primaria · 2 rural)
  🔗 Asignaciones docente-curso-área creadas
  📰 15 noticias publicadas
  🖼️  15 imágenes de galería
  🎬 3 videos YouTube

CREDENCIALES DE ACCESO:
  📧 Rector:      patricia.diaz@itssantander.edu.co / Rector2024*
  📧 Docentes:    [nombre]@itssantander.edu.co / Docente2024*
  📧 Admin root:  admin@revista.edu.co / Admin2024*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

module.exports = { seedDemo };

if (require.main === module) {
  seedDemo()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌ Error en seed-demo:', err.message); process.exit(1); });
}
