# CLAUDE.md — Instituto Técnico Industrial Santander
# Revista Digital Institucional
> Todo el código de este proyecto fue desarrollado por Claude (Anthropic).
> Este archivo es la fuente de verdad. Leer COMPLETO antes de tocar cualquier archivo.
> Ante cualquier duda de implementación, este archivo manda.

---

## ⚠️ REGLA ABSOLUTA — CLAUDE ESCRIBE TODO EL CÓDIGO

> **El desarrollador de este proyecto es Claude (Anthropic).**
> Ronald Medina es el arquitecto y director del proyecto.
> Claude escribe, revisa, corrige y despliega todo el código.
>
> Flujo obligatorio:
> ```
> Ronald define → Claude implementa → git commit → git push → CI/CD → Producción
> ```
> - NUNCA trabajar en local como solución final
> - NUNCA decirle a Ronald "pruébalo en localhost" sin antes tener el CI/CD listo
> - Cada push a main dispara el pipeline automáticamente

---

## 0. IDENTIDAD DEL PROYECTO

**Institución:** Instituto Técnico Industrial Santander
**Producto:** Revista Digital Institucional
**Dominio temporal:** `institutotecnicosantander.com.co` (mientras se tramita el `.edu.co`)
**Repositorio:** GitHub nuevo e independiente (no relacionado con asesoria-pro)
**Deploy:** Railway (backend) + Vercel (frontend) + Supabase (BD) + Cloudinary (imágenes)

---

## 1. ESTADO ACTUAL (2026-05-14)

| Módulo | Estado | Archivos clave |
|---|---|---|
| Backend Express base | ✅ | `src/server.js` |
| Modelos Sequelize (15 tablas) | ✅ | `src/models/index.js` |
| Sistema de agentes IA (5) | ✅ | `src/agents/` |
| Cloudinary (imágenes nube) | ✅ | `src/services/cloudinary.service.js` |
| Email Nodemailer | ✅ | `src/services/email.service.js` |
| SSE tiempo real | ✅ | `src/services/sse.service.js` |
| Sistema aprendizaje errores | ✅ | `src/services/knowledge.service.js` |
| Noticias externas Colombia | ✅ | `src/jobs/noticias-externas.job.js` |
| Panel de inclusión | ✅ | `src/routes/inclusion.routes.js` |
| Panel docente por materia | ✅ | `src/routes/panel-docente.routes.js` |
| Auth JWT (6 roles) | ✅ | `src/middlewares/auth.middleware.js` |
| CI/CD GitHub Actions | ✅ | `.github/workflows/ci.yml` |
| Script instalación PowerShell | ✅ | `instalar.ps1` |
| Frontend Angular | ⏳ | Pendiente — Ronald trae los diseños |

---

## 2. STACK TECNOLÓGICO

### Backend
- **Framework:** Express.js + Node.js 20
- **Base de datos:** SQLite (desarrollo) → PostgreSQL Supabase (producción)
- **ORM:** Sequelize — `sync({ alter: true })` en dev, `authenticate()` en prod
- **Imágenes:** Cloudinary (nunca guardar en el servidor local)
- **Email:** Nodemailer + Gmail SMTP (gratis)
- **Tiempo real:** Server-Sent Events (SSE) — no WebSockets
- **IA:** Anthropic Claude API
  - `claude-sonnet-4-5` para redacción de noticias
  - `claude-haiku-4-5-20251001` para evaluación de imágenes (más económico)
- **Seguridad:** Helmet + CORS + express-rate-limit + JWT

### Frontend (pendiente)
- **Framework:** Angular (versión a confirmar con Ronald)
- **Estilo:** Ronald trae diseños de referencia
- **Comunicación:** HttpClient + EventSource (SSE para tiempo real)

### Despliegue (económico)
- **Backend:** Railway ~$5 USD/mes
- **Frontend:** Vercel $0 (plan gratis)
- **Base de datos:** Supabase PostgreSQL $0 (500 MB gratis)
- **Imágenes:** Cloudinary $0 (25 GB gratis)
- **Email:** Gmail SMTP $0
- **Dominio:** `institutotecnicosantander.com.co` ~$35.000 COP/año
- **Total mensual:** $5–$15 USD (~$20.000–$60.000 COP)

---

## 3. ESTRUCTURA DE ARCHIVOS

```
revista-escolar/
├── instalar.ps1                    ← Script PowerShell de instalación
├── CLAUDE.md                       ← Este archivo (fuente de verdad)
├── README.md                       ← Guía para el equipo
├── .gitignore
├── docker-compose.yml              ← Desarrollo local con Docker
├── docker-compose.prod.yml         ← Producción
├── nginx/nginx.conf                ← Reverse proxy
├── .github/workflows/ci.yml        ← CI/CD automático
│
├── backend/
│   ├── package.json
│   ├── .env.example                ← Plantilla (SÍ va al repo)
│   ├── .env                        ← Credenciales reales (NUNCA al repo)
│   ├── Dockerfile
│   └── src/
│       ├── server.js               ← Punto de entrada
│       ├── agents/
│       │   ├── coordinator.agent.js ← Punto de entrada único de agentes
│       │   ├── news.agent.js        ← Mejora redacción noticias (Sonnet)
│       │   ├── image.agent.js       ← ALT text accesible (Haiku)
│       │   ├── gallery.agent.js     ← Galería automatizada (Haiku)
│       │   └── stats.agent.js       ← Estadísticas Power BI
│       ├── config/
│       │   └── database.js          ← Sequelize config
│       ├── jobs/
│       │   └── noticias-externas.job.js ← RSS Colombia cada hora
│       ├── middlewares/
│       │   ├── auth.middleware.js   ← JWT + 6 roles
│       │   ├── error.middleware.js  ← Manejo global errores
│       │   └── upload.middleware.js ← Multer (ya no usado, reemplazado por Cloudinary)
│       ├── models/
│       │   └── index.js             ← 15 tablas + relaciones
│       ├── prompts/
│       │   └── news.prompt.js       ← System prompt del agente de noticias
│       ├── routes/
│       │   ├── health.routes.js
│       │   ├── auth.routes.js
│       │   ├── noticias.routes.js
│       │   ├── categorias.routes.js
│       │   ├── sedes.routes.js
│       │   ├── cursos.routes.js
│       │   ├── perfil.routes.js
│       │   ├── galeria.routes.js
│       │   ├── admin.routes.js
│       │   ├── agentes.routes.js
│       │   ├── noticias-externas.routes.js
│       │   ├── inclusion.routes.js
│       │   ├── panel-docente.routes.js
│       │   └── sse.routes.js        ← Tiempo real
│       ├── services/
│       │   ├── cloudinary.service.js ← Manejo imágenes en nube
│       │   ├── email.service.js      ← Notificaciones Gmail
│       │   ├── sse.service.js        ← Tiempo real
│       │   ├── excel.service.js      ← Export Power BI
│       │   ├── knowledge.service.js  ← Sistema aprendizaje
│       │   └── error-learning.service.js ← Sistema errores
│       └── utils/
│           └── seed.js              ← Datos iniciales
│
└── frontend-angular/               ← Pendiente (Ronald trae diseños)
```

---

## 4. MODELOS DE BASE DE DATOS (15 tablas)

```
sedes               — 3 sedes del instituto
areas               — 10 áreas de conocimiento
usuarios            — 6 roles: ADMIN RECTOR COORDINADOR ORIENTADORA DOCENTE PERSONAL
perfiles_docentes   — perfil público editable por el docente
docentes_sedes      — many-to-many: docente puede estar en varias sedes
cursos              — grupos/grados con director y sede
cursos_docentes     — qué docente dicta qué área en qué curso
seguimiento_materia — seguimiento semanal del docente por materia
documentos_docentes — archivos subidos por docentes (Cloudinary)
estudiantes_inclusion — panel de condiciones especiales
seguimiento_inclusion — historial de acompañamiento
categorias          — secciones de la revista (por sede o globales)
noticias            — artículos con flujo pendiente→publicada→rechazada
imagenes            — metadata de imágenes en Cloudinary
videos_youtube      — solo el ID de YouTube, thumbnail automático
noticias_externas   — RSS automático de Colombia
galeria_items       — posicionamiento automático por IA (portada/destacados/recientes)
knowledge_base      — aprendizaje por docente
error_patterns      — errores para no repetir
```

---

## 5. ROLES Y PERMISOS

| Rol | Qué puede hacer |
|---|---|
| `ADMIN` | Todo el sistema, todas las sedes |
| `RECTOR` | Todo en su sede + aprueba noticias y logros |
| `COORDINADOR` | Gestiona cursos y docentes de su sede |
| `ORIENTADORA` | Panel de inclusión de las 3 sedes completo |
| `DOCENTE` | Panel personal: noticias, perfil, seguimiento por materia |
| `PERSONAL` | Perfil básico (portería, servicios, aseadores) |

---

## 6. AGENTES DE IA

| Agente | Archivo | Modelo | Cuándo se activa |
|---|---|---|---|
| Coordinador | `coordinator.agent.js` | — | Siempre, enruta a los demás |
| Noticias | `news.agent.js` | Sonnet | Al crear/editar noticia |
| Imágenes | `image.agent.js` | Haiku | Al subir imagen |
| Galería | `gallery.agent.js` | Haiku | Al aprobar imagen o video |
| Estadísticas | `stats.agent.js` | — | Al pedir reporte |

**Estrategia de costo IA:**
- Haiku para evaluaciones simples (imágenes, relevancia RSS) — 8× más barato
- Sonnet solo para redacción de noticias — calidad periodística
- Prompt caching activado para el system prompt de noticias
- Budget cap de $10 USD/mes en Anthropic Console

---

## 7. ENDPOINTS PRINCIPALES

```
# Públicos (sin auth)
GET  /api/v1/health                      → estado del sistema
GET  /api/v1/noticias                    → lista revista pública
GET  /api/v1/noticias/:id                → detalle + suma visita
GET  /api/v1/sedes                       → las 3 sedes
GET  /api/v1/sedes/:slug                 → detalle sede con cursos
GET  /api/v1/categorias                  → categorías activas
GET  /api/v1/perfil/docentes             → directorio público de docentes
GET  /api/v1/perfil/:id                  → perfil público completo
GET  /api/v1/noticias-externas           → noticias Colombia
GET  /api/v1/sse/noticias                → stream tiempo real (SSE)

# Docentes (JWT cualquier rol staff)
POST /api/v1/noticias                    → crear noticia (IA mejora)
POST /api/v1/noticias/:id/fotos          → subir fotos → Cloudinary
POST /api/v1/galeria/video               → registrar video YouTube
GET  /api/v1/perfil/mio/datos            → ver mi perfil
PUT  /api/v1/perfil/mio/datos            → editar mi perfil
POST /api/v1/perfil/mio/foto             → foto de perfil → Cloudinary
GET  /api/v1/panel/seguimiento           → mis seguimientos por materia
POST /api/v1/panel/seguimiento           → crear seguimiento semanal
POST /api/v1/panel/seguimiento/:id/imagenes → subir fotos de clase
POST /api/v1/panel/documentos            → subir documento
GET  /api/v1/panel/reporte               → descargar Excel de actividad

# Inclusión (orientadora + docentes del estudiante + rector)
GET  /api/v1/inclusion                   → lista estudiantes
GET  /api/v1/inclusion/:id               → detalle + seguimientos
POST /api/v1/inclusion                   → registrar estudiante (ORIENTADORA/ADMIN)
POST /api/v1/inclusion/:id/seguimiento   → agregar nota de seguimiento
POST /api/v1/inclusion/:id/piar          → subir PIAR

# Admin/Rector
GET  /api/v1/admin/noticias              → todas (incluye pendientes)
PUT  /api/v1/admin/noticias/:id/aprobar  → publicar → email docente → SSE
PUT  /api/v1/admin/noticias/:id/rechazar → rechazar → email docente → aprende error
GET  /api/v1/admin/estadisticas          → métricas
GET  /api/v1/admin/exportar              → Excel para Power BI
POST /api/v1/admin/usuarios              → crear usuario → email bienvenida
GET  /api/v1/galeria/video/:id/aprobar   → aprobar video YouTube
POST /api/v1/noticias-externas/sincronizar → forzar sync RSS
```

---

## 8. FLUJOS CRÍTICOS

### Publicar una noticia
```
Docente crea noticia
  → IA (Sonnet) mejora título y contenido
  → Estado: "pendiente"
  → Email automático al admin/rector: "hay noticia para revisar"
  → Admin aprueba
    → Estado: "publicada"
    → Email al docente: "tu noticia fue publicada"
    → SSE emite "noticia_publicada" → frontend actualiza sin recargar
    → Sistema de aprendizaje registra el estilo aprobado
  → Admin rechaza con motivo
    → Email al docente con el motivo
    → Sistema registra el error para no repetirlo
```

### Subir imagen
```
Docente sube imagen
  → Multer-Cloudinary la sube directo a la nube (no al servidor)
  → Agente de imágenes (Haiku) genera ALT text accesible
  → Agente de galería (Haiku) evalúa score 0-1
  → Imagen ubicada automáticamente: portada (≥0.80) / destacados (≥0.55) / recientes
  → SSE emite "galeria_actualizada"
```

### Video YouTube
```
Docente pega URL de YouTube
  → Sistema extrae el ID automáticamente
  → Thumbnail generado: https://img.youtube.com/vi/{ID}/hqdefault.jpg
  → Estado: "pendiente"
  → Admin aprueba → video aparece en galería "destacados"
  → En la revista: embed directo de YouTube (no consume storage)
```

---

## 9. VARIABLES DE ENTORNO CRÍTICAS

```env
JWT_SECRET              → mínimo 64 caracteres aleatorios
ANTHROPIC_API_KEY       → console.anthropic.com
CLAUDE_MODEL_NOTICIAS   → claude-sonnet-4-5
CLAUDE_MODEL_IMAGENES   → claude-haiku-4-5-20251001
CLOUDINARY_CLOUD_NAME   → cloudinary.com (gratis)
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
EMAIL_USER              → cuenta Gmail
EMAIL_PASS              → contraseña de aplicación Gmail
```

---

## 10. REGLAS ABSOLUTAS — NUNCA VIOLAR

1. NUNCA subir `.env` al repositorio — tiene credenciales reales
2. NUNCA hardcodear API keys — siempre `process.env.NOMBRE`
3. NUNCA guardar imágenes en el servidor — siempre Cloudinary
4. NUNCA publicar noticia sin revisión del admin/rector
5. NUNCA mezclar lógica de dos agentes distintos en un archivo
6. NUNCA mostrar datos del panel de inclusión sin verificar el rol
7. NUNCA usar `synchronize: true` en producción — solo en desarrollo
8. NUNCA inventar datos estadísticos — siempre consultar la BD
9. NUNCA guardar videos en el servidor — solo URLs de YouTube
10. NUNCA romper rutas que ya funcionan

---

## 11. COMANDOS DE DESARROLLO

```powershell
# Instalar todo (primera vez)
.\instalar.ps1

# Iniciar servidor en desarrollo (con reinicio automático)
cd backend
npm run dev

# Crear datos iniciales
npm run seed

# Verificar que funciona
# Abrir en el navegador: http://localhost:3000/api/v1/health
```

---

## 12. CI/CD — PIPELINE AUTOMÁTICO

```
git push origin main
  → Job 1: lint (ESLint)
  → Job 2: tests básicos
  → Job 3: build Docker imagen
  → Job 4: deploy automático a Railway (backend)
           deploy automático a Vercel (frontend)
```

---

*Instituto Técnico Industrial Santander — Revista Digital*
*Código desarrollado por Claude (Anthropic) · Director: Ronald Medina*
*Versión 3.0 · 2026-05-14*
*Actualizar este archivo con cada cambio de arquitectura o módulo nuevo.*
