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
**Repositorio:** https://github.com/academicosmyl-lab/revista-escolar  
**Deploy:** Render.com (backend gratuito) + Vercel (frontend gratuito)

---

## 1. URLS DE PRODUCCIÓN

| Servicio | URL |
|---|---|
| Frontend (Vercel) | https://revista-escolar-zeta.vercel.app |
| Backend (Render) | https://revista-escolar.onrender.com |
| Health check | https://revista-escolar.onrender.com/api/v1/health |
| Super Admin | https://revista-escolar-zeta.vercel.app/super-admin |

**Login Super Admin:** academicosmyl@gmail.com

---

## 2. ESTADO ACTUAL (2026-08-03)

| Módulo | Estado | Archivos clave |
|---|---|---|
| Backend Express base | ✅ | `backend/src/app.js`, `backend/src/server.js` |
| Auth JWT (6 roles) | ✅ | `backend/src/middlewares/auth.middleware.js` |
| Modelos Sequelize (SQLite) | ✅ | `backend/src/models/index.js` |
| Noticias + flujo aprobación | ✅ | `backend/src/routes/noticias.routes.js` |
| Super Admin panel | ✅ | `frontend-angular/src/app/pages/super-admin/` |
| Formulario registro docentes | ✅ | `frontend-angular/src/app/pages/docentes/` |
| Cloudinary imágenes (fix aplicado) | ✅ | `backend/src/services/cloudinary.service.js` |
| SSE tiempo real | ✅ | `backend/src/services/sse.service.js` |
| Dashboard indicadores académicos | ✅ | `backend/src/services/indicadores.service.js` |
| Formulario público `/publicar` | 🔄 EN CONSTRUCCIÓN | `frontend-angular/src/app/pages/publicar/` |

---

## 3. STACK TECNOLÓGICO

### Backend
- **Framework:** Express.js + Node.js 20
- **Base de datos:** SQLite con Sequelize ORM
- **Imágenes:** Cloudinary (nunca guardar en el servidor local)
- **Excel:** `xlsx` npm package para leer datos de indicadores académicos
- **Email:** Nodemailer + Gmail SMTP
- **Tiempo real:** Server-Sent Events (SSE)
- **IA:** Anthropic Claude API
  - `claude-sonnet-4-5` para redacción de noticias
  - `claude-haiku-4-5-20251001` para evaluación de imágenes

### Frontend
- **Framework:** Angular 19 (standalone components, signals, ChangeDetectionStrategy.OnPush)
- **Gráficas:** ng-apexcharts (ApexCharts)
- **Estilos:** SCSS, dark mode nativo
- **HTTP:** HttpClient con signals para estado reactivo

### Despliegue (todo gratuito)
- **Backend:** Render.com free tier (arranca en ~30s si inactivo)
- **Frontend:** Vercel free tier (deploy automático)
- **Base de datos:** SQLite persistente en Render (disco efímero — reinicia con cada deploy)
- **Imágenes:** Cloudinary free tier (25 GB)
- **CI/CD:** GitHub Actions → push a main despliega automático

---

## 4. ESTRUCTURA DE ARCHIVOS CLAVE

```
revista-escolar/
├── CLAUDE.md                           ← Este archivo (fuente de verdad)
├── datos-indicadores/                  ← 10 archivos Excel con datos 2025
│   ├── 2025_GENERAL_MAÑANA.xlsx
│   ├── 2025_GENERAL_TARDE.xlsx
│   ├── 2025_GENERAL_UNICA.xlsx
│   ├── 2025_SAUCES_MAÑANA.xlsx
│   ├── 2025_SAUCES_TARDE.xlsx
│   ├── 2025_SAUCES_UNICA.xlsx
│   ├── 2025_TECNICO_MAÑANA.xlsx
│   ├── 2025_TECNICO_TARDE.xlsx
│   ├── 2025_NOCTURNA_CICLOS.xlsx
│   └── 2025_FIN_SEMANA_CICLOS.xlsx
│
├── backend/
│   ├── package.json                    ← xlsx incluido
│   └── src/
│       ├── app.js                      ← Rutas registradas
│       ├── services/
│       │   ├── cloudinary.service.js
│       │   ├── indicadores.service.js  ← Carga Excel en memoria (cache)
│       │   └── sse.service.js
│       └── routes/
│           ├── indicadores.routes.js   ← 8 endpoints públicos de datos
│           ├── noticias.routes.js
│           ├── auth.routes.js
│           ├── perfil.routes.js        ← Fix: foto usa Cloudinary
│           └── ...
│
└── frontend-angular/
    └── src/app/pages/
        ├── indicadores/
        │   ├── indicadores.ts          ← Angular 19, 3 modos, ApexCharts
        │   ├── indicadores.html
        │   └── indicadores.scss        ← Dark mode, azul+ámbar
        ├── publicar/                   ← EN CONSTRUCCIÓN
        └── ...
```

---

## 5. MÓDULO INDICADORES ACADÉMICOS

### Datos
- **Carpeta:** `backend/datos-indicadores/` (dentro del backend para Render)
- **Formato nombres:** `2025_SEDE_JORNADA.xlsx`
- **Estudiantes:** ~2449 registros en 3 sedes
- **Sedes:** General Santander · Los Sauces · Técnico Industrial
- **Jornadas:** Mañana · Tarde · Única · Nocturna (Ciclos+INPEC) · Fin de Semana (Ciclos)
- **Escala notas:** 1.0 a 5.0 (colombiana)
- **Períodos:** P1 (33%) · P2 (33%) · P3 (34%) · AC (acumulado) · Puesto Final

### Estructura Excel
- Fila índice 4: nombres de áreas
- Fila índice 6 en adelante: estudiantes
- Por área: 5 columnas → P1, P2, P3, AC, QUINTA

### Endpoints (todos públicos, sin auth)
```
GET /api/v1/indicadores/metadata     → filtros disponibles
GET /api/v1/indicadores/resumen      → KPIs generales
GET /api/v1/indicadores/areas        → promedios por área
GET /api/v1/indicadores/evolucion    → evolución por períodos
GET /api/v1/indicadores/heatmap      → heatmap grado × área
GET /api/v1/indicadores/comparacion  → comparación A vs B
GET /api/v1/indicadores/ranking      → ranking de estudiantes
GET /api/v1/indicadores/estudiante   → perfil individual
GET /api/v1/indicadores/buscar       → buscador por nombre
```

### Privacy rule (pendiente implementar en frontend)
- Sin login → NO mostrar nombres de estudiantes
- Con login → nombres visibles
- Grupos INPEC/Discapacidad → NUNCA en rankings públicos

### Frontend (3 modos)
- **Panorama:** KPIs + gráfico evolución períodos + heatmap + promedio por área
- **Comparación:** seleccionar 2 entidades (grados, áreas, grupos) y comparar
- **Individual:** buscar estudiante específico por nombre

---

## 6. FORMULARIO PÚBLICO `/publicar` (EN CONSTRUCCIÓN)

### Diseño aprobado
- **Paso 1:** Nombre + Rol (Docente/Rector/Coordinador/Personal/Otro) → campos condicionales
- **Paso 2:** Título, descripción, tipo de contenido (imágenes/video YouTube/solo texto)
- **Paso 3:** Sede + toggle rector para destacar en portada
- **Flujo:** cualquiera envía → rector aprueba → aparece en revista
- **Áreas de materias:** vienen de los mismos Excel que indicadores
- Si es Rector: puede marcar para destacar en página principal

---

## 7. ROLES Y PERMISOS

| Rol | Qué puede hacer |
|---|---|
| `ADMIN` | Todo el sistema, todas las sedes |
| `RECTOR` | Todo en su sede + aprueba noticias |
| `COORDINADOR` | Gestiona cursos y docentes de su sede |
| `ORIENTADORA` | Panel de inclusión de las 3 sedes completo |
| `DOCENTE` | Panel personal: noticias, perfil, seguimiento |
| `PERSONAL` | Perfil básico |

---

## 8. VARIABLES DE ENTORNO (Render)

```env
JWT_SECRET
ANTHROPIC_API_KEY
CLAUDE_MODEL_NOTICIAS=claude-sonnet-4-5
CLAUDE_MODEL_IMAGENES=claude-haiku-4-5-20251001
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
EMAIL_USER=academicosmyl@gmail.com
EMAIL_PASS
EMAIL_FROM=academicosmyl@gmail.com
ADMIN_EMAIL=academicosmyl@gmail.com
PORT=10000
NODE_ENV=production
```

---

## 9. REGLAS ABSOLUTAS — NUNCA VIOLAR

1. NUNCA subir `.env` al repositorio
2. NUNCA hardcodear API keys
3. NUNCA guardar imágenes en el servidor — siempre Cloudinary
4. NUNCA publicar noticia sin revisión del rector/admin
5. NUNCA mostrar nombres de grupos INPEC/Discapacidad en rankings públicos
6. NUNCA mostrar nombres de estudiantes sin login (indicadores)
7. NUNCA guardar videos en el servidor — solo URLs de YouTube

---

## 10. COMANDOS DE DESARROLLO

```powershell
# Backend
cd backend
npm install
npm run dev         # arranca en puerto 3000

# Frontend
cd frontend-angular
npm install
ng serve            # arranca en puerto 4200
```

---

*Instituto Técnico Industrial Santander — Revista Digital*
*Código desarrollado por Claude (Anthropic) · Director: Ronald Medina*
*Versión 4.0 · 2026-08-03*
