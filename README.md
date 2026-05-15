# 📰 Revista Digital Escolar

Plataforma web tipo revista para institución educativa con IA integrada.
Docentes publican eventos semanales. La IA mejora la redacción automáticamente.
Power BI muestra estadísticas en tiempo real.

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 20+
- Git

### Paso 1 — Clonar y configurar

```bash
git clone https://github.com/TU_USUARIO/revista-escolar.git
cd revista-escolar/backend
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY y JWT_SECRET
```

### Paso 2 — Instalar dependencias

```bash
npm install
```

### Paso 3 — Crear datos iniciales

```bash
npm run seed
```

### Paso 4 — Iniciar servidor

```bash
npm run dev
# Servidor en http://localhost:3000
# Health check: http://localhost:3000/api/v1/health
```

---

## 📁 Estructura del Proyecto

```
revista-escolar/
├── CLAUDE.md                    ← Fuente de verdad (LEER PRIMERO)
├── backend/
│   ├── src/
│   │   ├── agents/              ← Agentes de IA
│   │   │   ├── coordinator.agent.js   ← Punto de entrada
│   │   │   ├── news.agent.js          ← Mejora noticias
│   │   │   ├── image.agent.js         ← Procesa imágenes
│   │   │   └── stats.agent.js         ← Estadísticas
│   │   ├── models/              ← Modelos Sequelize
│   │   ├── routes/              ← Endpoints REST
│   │   ├── services/            ← Lógica de negocio
│   │   │   ├── knowledge.service.js   ← Sistema de aprendizaje
│   │   │   ├── error-learning.service.js ← Sistema de errores
│   │   │   └── excel.service.js       ← Exportación Power BI
│   │   ├── middlewares/         ← Auth, errores, upload
│   │   ├── prompts/             ← System prompts de IA
│   │   ├── config/              ← Base de datos
│   │   └── server.js            ← Punto de entrada
│   ├── uploads/                 ← Imágenes subidas
│   ├── .env.example             ← Plantilla de variables
│   └── Dockerfile
├── frontend-angular/            ← Frontend (pendiente diseños de Ronald)
├── nginx/nginx.conf             ← Reverse proxy
├── .github/workflows/ci.yml    ← CI/CD automático
└── docker-compose.yml
```

---

## 🤖 Agentes de IA

| Agente | Función |
|---|---|
| **Coordinador** | Punto de entrada. Enruta al agente correcto. |
| **Noticias** | Mejora redacción de noticias con tono periodístico escolar |
| **Imágenes** | Genera texto ALT accesible automáticamente |
| **Estadísticas** | Prepara datos para Power BI |

---

## 📊 Endpoints Principales

```
GET  /api/v1/health              → Estado del sistema
POST /api/v1/auth/login          → Login (devuelve JWT)
GET  /api/v1/noticias            → Lista pública
POST /api/v1/noticias            → Crear noticia (docente autenticado)
POST /api/v1/noticias/:id/fotos  → Subir fotos
PUT  /api/v1/admin/noticias/:id/aprobar  → Publicar
PUT  /api/v1/admin/noticias/:id/rechazar → Rechazar
GET  /api/v1/admin/exportar      → Excel para Power BI
POST /api/v1/agentes/mejorar-noticia → IA mejora borrador
```

---

## 🔧 Variables de Entorno Clave

```env
ANTHROPIC_API_KEY=sk-ant-...   # Obligatorio para IA
JWT_SECRET=...                  # Mínimo 32 caracteres
DB_DIALECT=sqlite               # sqlite (dev) o postgres (prod)
```

---

## 📦 Deploy en Render (recomendado)

1. Crear cuenta en [render.com](https://render.com)
2. Conectar repositorio GitHub
3. Nuevo servicio → Web Service → seleccionar `backend/`
4. Build command: `npm install`
5. Start command: `npm start`
6. Agregar variables de entorno en el panel de Render
7. El deploy es automático con cada `git push`

---

## 🔗 Integración Power BI

Exportar datos: `GET /api/v1/admin/exportar`
- Descarga archivo `.xlsx` con hojas: Noticias, Docentes, Resumen
- Conectar Power BI Desktop → Obtener datos → Excel → URL del endpoint
- Los datos se actualizan en tiempo real con cada exportación

---

*Revista Digital Escolar · M&L Asesorías Profesionales · 2026*
