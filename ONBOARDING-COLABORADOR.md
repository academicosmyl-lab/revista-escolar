# ONBOARDING TÉCNICO — AsesorIA Pro
### Guía para el colaborador · M&L Profesionales
> Versión 1.0 · 2026-05-09
> Este documento es confidencial. No compartir fuera del equipo.

---

## ÍNDICE

1. [¿Qué es el proyecto?](#1-qué-es-el-proyecto)
2. [Accesos y credenciales](#2-accesos-y-credenciales)
3. [Arquitectura del sistema](#3-arquitectura-del-sistema)
4. [Estructura del repositorio](#4-estructura-del-repositorio)
5. [Cómo trabajamos juntos](#5-cómo-trabajamos-juntos)
6. [Infraestructura del VPS](#6-infraestructura-del-vps)
7. [CI/CD — Pipeline automático](#7-cicd--pipeline-automático)
8. [Base de datos](#8-base-de-datos)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Módulos implementados](#10-módulos-implementados)
11. [Endpoints principales de la API](#11-endpoints-principales-de-la-api)
12. [Panel de Asesores — guía de uso](#12-panel-de-asesores--guía-de-uso)
13. [Bot WhatsApp](#13-bot-whatsapp)
14. [Sistema de IA y Agentes](#14-sistema-de-ia-y-agentes)
15. [Comandos útiles en el VPS](#15-comandos-útiles-en-el-vps)
16. [Pendientes técnicos](#16-pendientes-técnicos)
17. [Reglas de oro — OBLIGATORIAS](#17-reglas-de-oro--obligatorias)
18. [Contacto y jerarquía](#18-contacto-y-jerarquía)

---

## 1. ¿QUÉ ES EL PROYECTO?

**AsesorIA Pro** es una plataforma de servicios profesionales 100% automatizados con Inteligencia Artificial para la empresa **M&L Profesionales**, operando en Colombia en los sectores:

- **Académico** — tesis, monografías, ensayos, informes académicos (normas APA 7, ICONTEC, MLA)
- **Jurídico** — tutelas, derechos de petición, contratos (derecho colombiano)
- **Analítico** — estadística, análisis de datos, SPSS, R, Python
- **Empresarial** — planes de negocio, análisis financiero, marketing, estrategia

### Canales de atención activos
| Canal | URL / Contacto | Estado |
|---|---|---|
| Web pública (chatbot IA) | `http://116.203.193.7` | ✅ Activo |
| Panel asesores internos | `http://116.203.193.7/asesores` | ✅ Activo |
| Bot WhatsApp | Meta Business API | ✅ Configurado |

### Principio fundamental
> El sistema reemplaza tareas humanas repetitivas de alto volumen. Cada respuesta de IA debe ser experta, citada con fuentes reales y adaptada al perfil del usuario. **Nunca debe parecer un bot genérico.**

---

## 2. ACCESOS Y CREDENCIALES

> ⚠️ **CONFIDENCIAL** — No compartir por canales inseguros.

### Panel de Asesores (Producción)
| Campo | Valor |
|---|---|
| URL | `http://116.203.193.7/asesores` |
| Email SUPERADMIN | `ronald.medina.corp@gmail.com` |
| Contraseña | `MedML2024*` |
| Nota | Esta es la cuenta raíz de Ronald. **No modificar, no desactivar.** |

### VPS Hetzner
| Campo | Valor |
|---|---|
| IP | `116.203.193.7` |
| Sistema Operativo | Ubuntu (Linux) |
| Directorio del proyecto | `/opt/asesoria-pro/` |
| Acceso | SSH con clave privada — Ronald la comparte por canal seguro |

### GitHub
| Campo | Valor |
|---|---|
| Repositorio | `https://github.com/ronalete/asesoria-pro` |
| Visibilidad | **Privado** — Ronald debe darte acceso de colaborador |
| Rama principal | `main` |
| Imágenes Docker | `ghcr.io/ronalete/asesoria-pro-*` (GHCR privado) |

### Email del sistema
| Campo | Valor |
|---|---|
| Cuenta | `academicosmyl@gmail.com` |
| Uso | Envío de alertas, documentos aprobados, notificaciones |

### APIs de IA
| Proveedor | Uso |
|---|---|
| **Anthropic Claude** | Motor principal de todos los agentes |
| **Voyage AI** | Embeddings para RAG (búsqueda semántica) |
| **OpenAI** | Respaldo |
| **Google Gemini** | Respaldo |

> Las API keys están en el `.env` del VPS. Ronald las gestiona.

---

## 3. ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET / CLIENTES                  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              NGINX — Reverse Proxy (80/443)             │
│   /          → Frontend Angular (puerto 80)             │
│   /api/v1/*  → Backend NestJS (puerto 3000)             │
│   /webhook/* → WhatsApp Meta Webhook                    │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────┐    ┌──────────────────────────────┐
│  Frontend Angular  │    │      Backend NestJS           │
│  (tema oscuro)     │    │                              │
│                    │    │  ┌─────────────────────────┐ │
│  / → chatbot       │    │  │   8 Agentes de IA       │ │
│  /asesores → panel │    │  │   Coordinador           │ │
│                    │    │  │   Académico             │ │
│  SSE streaming     │    │  │   Jurídico              │ │
│  en tiempo real    │    │  │   Analítico             │ │
│                    │    │  │   Empresarial           │ │
└────────────────────┘    │  │   Comercial             │ │
                          │  │   Plagio/IA             │ │
                          │  │   Programador           │ │
                          │  └─────────────────────────┘ │
                          │                              │
                          │  ┌──────────┐ ┌───────────┐  │
                          │  │PostgreSQL│ │  Redis 7  │  │
                          │  │+ pgvector│ │  (caché)  │  │
                          │  └──────────┘ └───────────┘  │
                          │                              │
                          │  ┌──────────────────────────┐│
                          │  │   Claude API (Anthropic) ││
                          │  │   Voyage AI (embeddings) ││
                          │  └──────────────────────────┘│
                          └──────────────────────────────┘
```

### Stack tecnológico detallado
| Capa | Tecnología | Versión |
|---|---|---|
| Backend | NestJS + TypeScript estricto | v10+ |
| Frontend | Angular con Angular Signals | v21+ |
| Base de datos | PostgreSQL + extensión pgvector | v16 |
| Caché / Sesiones | Redis | v7 |
| ORM | TypeORM | `synchronize: false` en prod |
| Autenticación | JWT (SUPERADMIN / ASESOR) | 12h expiración |
| Contenedores | Docker + docker-compose | - |
| Proxy | Nginx | Alpine |
| CI/CD | GitHub Actions | - |
| Registro Docker | GHCR (GitHub Container Registry) privado | - |
| Hosting | Hetzner VPS | Ubuntu |
| IA principal | Anthropic Claude API | claude-sonnet-4-20250514 |
| Embeddings RAG | Voyage AI | voyage-3 (1024 dims) |

---

## 4. ESTRUCTURA DEL REPOSITORIO

```
asesoria-pro/                          ← Raíz del proyecto
│
├── backend/                           ← API NestJS
│   ├── src/
│   │   ├── agents/                    ← 8 agentes de IA
│   │   │   ├── coordinator.agent.ts   ← Punto de entrada único
│   │   │   ├── academic.agent.ts      ← Trabajos académicos
│   │   │   ├── legal.agent.ts         ← Documentos jurídicos
│   │   │   ├── analytics.agent.ts     ← Análisis estadístico
│   │   │   ├── business.agent.ts      ← Análisis empresarial
│   │   │   ├── commercial.agent.ts    ← Cotizaciones
│   │   │   ├── plagiarism.agent.ts    ← Detección plagio/IA
│   │   │   └── developer.agent.ts     ← Código
│   │   ├── asesores/                  ← Plataforma interna M&L
│   │   │   ├── entities/              ← Entidades TypeORM
│   │   │   ├── controllers/           ← Endpoints REST
│   │   │   ├── services/              ← Lógica de negocio
│   │   │   ├── guards/                ← JWT + Roles
│   │   │   └── dto/                   ← Data Transfer Objects
│   │   ├── auth/                      ← Autenticación general
│   │   ├── rag/                       ← Sistema RAG + pgvector
│   │   ├── memory/                    ← MemoryService Redis + PG
│   │   ├── whatsapp/                  ← Bot Meta Business API
│   │   ├── wompi/                     ← Pagos Colombia
│   │   ├── jobs/                      ← Cron jobs
│   │   │   ├── knowledge-sync.job.ts  ← Sync RAG semanal
│   │   │   └── email-notifications.job.ts
│   │   ├── admin/                     ← Panel administración
│   │   ├── prompts/                   ← System prompts de agentes
│   │   └── database/
│   │       └── migrations/            ← Migraciones TypeORM
│   ├── .env                           ← Variables locales (NO al repo)
│   ├── .env.example                   ← Plantilla de variables
│   └── Dockerfile
│
├── frontend/
│   └── asesoria-frontend/             ← Angular app
│       ├── src/app/
│       │   ├── features/
│       │   │   ├── dashboard/         ← Chatbot público + inicio
│       │   │   └── asesores/          ← Panel interno M&L
│       │   ├── componentes/           ← Chatbot, formulador, auth
│       │   └── servicios/             ← Services Angular
│       └── Dockerfile
│
├── nginx/
│   ├── nginx.conf                     ← Config principal nginx
│   └── locations.conf                 ← Rutas del proxy
│
├── knowledge/                         ← Documentos internos M&L (RAG)
│   └── ml-docs/
│
├── templates/                         ← Plantillas de documentos
│   ├── apa7-base.docx
│   ├── icontec-base.docx
│   ├── mla-base.docx
│   ├── empresarial-base.docx
│   └── juridico-base.docx
│
├── docker-compose.yml                 ← Desarrollo local
├── docker-compose.prod.yml            ← Producción (VPS)
├── CLAUDE.md                          ← Fuente de verdad del proyecto
└── .github/
    └── workflows/
        └── ci.yml                     ← Pipeline CI/CD completo
```

---

## 5. CÓMO TRABAJAMOS JUNTOS

### Regla fundamental
> **Todo cambio pasa por GitHub → CI/CD → VPS. Nunca directamente al servidor.**

### Flujo de trabajo diario
```
1. Ronald o colaborador identifica una tarea
2. Se crea una rama feature: git checkout -b feature/nombre-tarea
3. Se implementan los cambios
4. Se hace push a GitHub: git push origin feature/nombre-tarea
5. Se crea un Pull Request en GitHub
6. Ronald revisa y aprueba el PR
7. Se hace merge a main
8. GitHub Actions despliega automáticamente al VPS (~7-10 min)
9. Ronald verifica en http://116.203.193.7
```

### Roles
| Persona | Rol | Puede hacer |
|---|---|---|
| **Ronald** | Dueño / SUPERADMIN | Todo — aprueba merges, gestiona credenciales, supervisa |
| **Colaborador** | Ejecutor técnico | Desarrollar, proponer, implementar bajo supervisión |

### Para cambios urgentes en producción
Solo en emergencias confirmadas por Ronald:
```bash
ssh usuario@116.203.193.7
cd /opt/asesoria-pro
# Ver logs
docker compose -f docker-compose.prod.yml logs backend --tail=100
# Reiniciar servicio
docker compose -f docker-compose.prod.yml restart backend
```

---

## 6. INFRAESTRUCTURA DEL VPS

### Contenedores en producción
| Contenedor | Imagen | Función |
|---|---|---|
| `asesoria_backend_prod` | GHCR privado | API NestJS |
| `asesoria_frontend_prod` | GHCR privado | Angular + Nginx SPA |
| `asesoria_postgres_prod` | `pgvector/pgvector:pg16` | Base de datos |
| `asesoria_redis_prod` | `redis:7-alpine` | Caché y sesiones |
| `asesoria_nginx_prod` | `nginx:alpine` | Reverse proxy |
| `asesoria_n8n_prod` | `n8nio/n8n:latest` | Automatización |

### Redes Docker
- `internal` — red privada (postgres, redis, backend, n8n) — sin exposición externa
- `external` — red pública (nginx, backend, frontend, n8n)

### Puertos expuestos
| Puerto | Servicio |
|---|---|
| `80` | HTTP (nginx) |
| `443` | HTTPS (nginx) — pendiente configurar SSL |

### Recursos asignados
| Contenedor | Memoria | CPU |
|---|---|---|
| Backend | 2 GB | 2.0 cores |
| Postgres | 1 GB | 1.0 core |
| Redis | 512 MB | 0.5 cores |
| Frontend | 256 MB | 0.5 cores |
| Nginx | 128 MB | 0.25 cores |

---

## 7. CI/CD — PIPELINE AUTOMÁTICO

### Qué hace el pipeline (`.github/workflows/ci.yml`)

```
git push main
    │
    ├── Job 1: Backend lint + type-check
    │           npx tsc --noEmit
    │
    ├── Job 2: Frontend lint + type-check
    │           ng build --configuration=production
    │
    ├── Job 3: Tests unitarios
    │           jest (80+ tests)
    │
    ├── Job 4: Tests de integración
    │           con PostgreSQL y Redis reales
    │
    ├── Job 5: Build imágenes Docker
    │           docker build backend → GHCR
    │           docker build frontend → GHCR
    │
    └── Job 6: Deploy al VPS
                SSH → docker pull → docker compose up -d
                Tiempo total: ~7-10 minutos
```

### Secrets de GitHub (los configura Ronald)
```
GHCR_TOKEN          # Token para push/pull imágenes
VPS_HOST            # IP del servidor (116.203.193.7)
VPS_USER            # Usuario SSH
VPS_SSH_KEY         # Clave privada SSH
```

### ¿Qué hacer si el pipeline falla?
1. Ir a `https://github.com/ronalete/asesoria-pro/actions`
2. Ver el job que falló y leer el error
3. Corregir en una rama, hacer push, esperar nuevo run
4. **Nunca hacer rollback manual sin consultar a Ronald**

---

## 8. BASE DE DATOS

### Esquema — 18 tablas
| Tabla | Descripción |
|---|---|
| `knowledge_chunks` | RAG — fragmentos de conocimiento con vectores (1024 dims) |
| `conversations` | Historial de mensajes por usuario |
| `user_profiles` | Perfil de aprendizaje por usuario |
| `pending_reviews` | Documentos pendientes de revisión humana |
| `agent_logs` | Trazabilidad completa de agentes |
| `usuarios` | Portal público |
| `solicitudes` | Solicitudes del portal |
| `proyectos` | Formulador de proyectos |
| `feedback_documentos` | Calificaciones para few-shot learning |
| `analisis_deteccion` | Resultados de detección de plagio/IA |
| `asesores` | Cuentas del panel interno M&L |
| `clientes_ml` | Clientes (datos encriptados AES-256) |
| `contratos_ml` | Contratos por cliente y asesor |
| `seguimiento_semanal` | 16 semanas de seguimiento por contrato |
| `documentos_asesores` | Biblioteca RAG de los asesores |
| `pagos_contrato` | Cartera y pagos por contrato |
| `tutor_insights` | Aprendizaje de estilo por tutor/materia |
| `error_patterns` | Patrones de error recurrentes |

### Reglas de base de datos
- `synchronize: false` en producción — **NUNCA** activar synchronize en prod
- Todos los cambios de esquema van en **migraciones TypeORM**
- Las migraciones se ejecutan automáticamente al iniciar el backend (`migrationsRun: true`)
- Las columnas de la BD usan `snake_case` — las entidades TypeORM tienen el decorador `name:` para mapear

### Migraciones
```bash
# Crear nueva migración (desde el directorio backend/)
npm run migration:generate -- src/database/migrations/NombreMigracion

# Ejecutar migraciones manualmente
npm run migration:run

# Revertir última migración
npm run migration:revert
```

> **Consultar siempre con Ronald antes de crear o ejecutar una migración en producción.**

### Conectar a la BD en el VPS (solo lectura, emergencias)
```bash
docker exec -it asesoria_postgres_prod psql -U asesoria_user -d asesoria_ia_db
```

---

## 9. VARIABLES DE ENTORNO

El archivo `.env` del VPS está en `/opt/asesoria-pro/.env`. **Nunca va al repositorio.**

### Variables requeridas
```env
# ── Anthropic ────────────────────────────────────
ANTHROPIC_API_KEY=            # Claude API key
CLAUDE_MODEL=claude-sonnet-4-20250514

# ── Base de datos ─────────────────────────────────
DB_HOST=postgres
DB_PORT=5432
DB_USER=asesoria_user
DB_PASSWORD=                  # Ronald lo tiene
DB_NAME=asesoria_ia_db

# ── Redis ─────────────────────────────────────────
REDIS_URL=redis://:PASSWORD@redis:6379
REDIS_PASSWORD=               # Ronald lo tiene

# ── Seguridad ─────────────────────────────────────
JWT_SECRET=                   # Mínimo 64 chars — Ronald lo tiene
ENCRYPTION_KEY=               # 64 hex chars AES-256 — Ronald lo tiene

# ── WhatsApp Meta Business ────────────────────────
WA_TOKEN=                     # Token permanente Meta (System User)
WA_PHONE_ID=1067783153083354
META_VERIFY_TOKEN=asesoriamyl2024
YESID_PHONE=573227178417      # Admin WhatsApp (recibe notificaciones)

# ── Email ─────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=academicosmyl@gmail.com
SMTP_PASS=                    # App Password Gmail
ADMIN_EMAIL=ronald.medina.corp@gmail.com

# ── App ───────────────────────────────────────────
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://116.203.193.7

# ── Pagos Wompi ───────────────────────────────────
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=

# ── Voyage AI (embeddings RAG) ────────────────────
VOYAGE_API_KEY=               # voyageai.com — mejora precisión RAG

# ── GHCR (imágenes Docker) ────────────────────────
GHCR_USER=ronalete
GHCR_TOKEN=
BACKEND_IMAGE=ghcr.io/ronalete/asesoria-pro-backend:latest
FRONTEND_IMAGE=ghcr.io/ronalete/asesoria-pro-frontend:latest

# ── Google OAuth ──────────────────────────────────
GOOGLE_CLIENT_ID=322614287098-vmothpc82anmu414gr23berp8ekf5p07.apps.googleusercontent.com
```

---

## 10. MÓDULOS IMPLEMENTADOS

> Todos funcionando en producción. **No modificar sin aprobación de Ronald.**

### Backend
| Módulo | Archivos clave | Descripción |
|---|---|---|
| 8 Agentes IA | `src/agents/*.agent.ts` | Coordinador + 7 especialistas |
| Sistema RAG | `src/rag/` | pgvector + embeddings Voyage AI |
| Plataforma Asesores | `src/asesores/` | Clientes, contratos, seguimiento, pagos |
| Auth JWT | `src/auth/` | Login, roles SUPERADMIN/ASESOR |
| Bot WhatsApp | `src/whatsapp/` | Meta Business API + fases de conversación |
| Pagos Wompi | `src/wompi/` | Checkout + webhook + fallback Nequi |
| Email Cron | `src/jobs/email-notifications.job.ts` | Alertas automáticas |
| RAG Sync | `src/jobs/knowledge-sync.job.ts` | Sincronización dominical repos universitarios |
| Revisiones | `src/admin/admin-review.controller.ts` | Aprobación/rechazo documentos IA |
| BackendReview | `src/agents/review-backend.agent.ts` | Auditoría de código automática |
| Memoria Redis | `src/memory/memory.service.ts` | Contexto de conversaciones |

### Frontend
| Vista | Ruta | Descripción |
|---|---|---|
| Dashboard público | `/` | Chatbot IA + 6 servicios |
| Login asesores | `/asesores` | Pantalla de login |
| Panel asesores | `/asesores` (autenticado) | Clientes, servicios, seguimiento, métricas |

### Tabs del panel (SUPERADMIN ve todo)
| Tab | Visible para | Descripción |
|---|---|---|
| 👥 Clientes | SUPERADMIN + ASESOR | Lista y creación de clientes |
| 📋 Servicios | SUPERADMIN + ASESOR | Contratos por cliente |
| 📊 Seguimiento | SUPERADMIN + ASESOR | 16 semanas por contrato |
| 🧠 Aprend. | SUPERADMIN + ASESOR | Biblioteca RAG + insights IA |
| 🔑 Asesores | Solo SUPERADMIN | Crear/gestionar cuentas de asesores |
| 📈 Métricas | Solo SUPERADMIN | Stats del sistema + sync RAG |
| ✅ Revisiones | Solo SUPERADMIN | Aprobar/rechazar documentos IA |

---

## 11. ENDPOINTS PRINCIPALES DE LA API

Base URL producción: `http://116.203.193.7/api/v1`

### Salud del sistema
```
GET  /health                              → Estado de todos los servicios
```

### Autenticación asesores
```
POST /asesores/auth/login                 → Login email + password
POST /asesores/auth/superadmin-init       → Crear SUPERADMIN (solo 1 vez)
POST /asesores/auth/google                → Login con Google
POST /asesores/auth/google-init           → Crear SUPERADMIN con Google (solo 1 vez)
```

### Clientes
```
GET  /asesores/clientes                   → Lista (celular solo SUPERADMIN)
GET  /asesores/clientes?busqueda=texto    → Búsqueda
POST /asesores/clientes                   → Crear cliente (SUPERADMIN)
```

### Contratos
```
GET  /asesores/contratos                  → Lista con resumen financiero
POST /asesores/contratos                  → Crear contrato
GET  /asesores/contratos/reportes/excel   → Exportar Excel (SUPERADMIN)
```

### Seguimiento
```
GET  /asesores/seguimiento/:contratoId    → 16 semanas del contrato
PATCH /asesores/seguimiento/:semanaId     → Actualizar semana
```

### Pagos
```
GET  /asesores/pagos/:contratoId          → Cartera del contrato
POST /asesores/pagos                      → Registrar pago
```

### Agentes IA
```
POST /agents/stream                       → Chat con IA (SSE streaming)
POST /agents/detect-service               → Detectar tipo de servicio
```

### Administración (SUPERADMIN)
```
GET  /admin/revisiones                    → Documentos pendientes revisión
POST /admin/revisiones/:id/aprobar        → Aprobar documento
POST /admin/revisiones/:id/rechazar       → Rechazar documento
GET  /admin/metrics                       → Métricas del sistema
POST /sync/ejecutar                       → Sincronizar RAG manualmente
POST /sync/internos                       → Reindexar docs internos M&L
```

### WhatsApp
```
GET  /whatsapp/meta-webhook               → Verificación Meta
POST /whatsapp/meta-webhook               → Mensajes entrantes
```

---

## 12. PANEL DE ASESORES — GUÍA DE USO

### Acceso
1. Ir a `http://116.203.193.7/asesores`
2. Ingresar con email y contraseña
3. El sistema recuerda la sesión por 12 horas

### Crear un nuevo asesor (solo Ronald como SUPERADMIN)
1. Login con cuenta de Ronald
2. Tab **🔑 Asesores**
3. Botón **+ Nuevo asesor**
4. Llenar: Nombre, Correo, Contraseña, Rol
5. **Crear asesor** — queda activo inmediatamente

### Crear un cliente
1. Tab **👥 Clientes**
2. Llenar formulario (nombre, celular, plataforma educativa, usuario, contraseña plataforma)
3. El celular se guarda **encriptado** — solo SUPERADMIN puede verlo completo

### Crear un contrato / servicio
1. Buscar el cliente en la lista
2. Tab **📋 Servicios** → **+ Nuevo servicio**
3. Seleccionar materia, universidad, tipo de servicio, valor, asesor asignado

### Seguimiento semanal
1. Seleccionar un contrato activo
2. Tab **📊 Seguimiento**
3. Marcar actividad semana por semana (16 semanas)
4. Registrar notas y estado de barrido

### Revisiones de documentos IA (solo SUPERADMIN)
1. Tab **✅ Revisiones** — aparece badge rojo con pendientes
2. Ver documento completo generado por IA
3. Editar si es necesario + agregar notas
4. **Aprobar** → el cliente recibe el documento
5. **Rechazar** → el cliente recibe el motivo

---

## 13. BOT WHATSAPP

### Flujo de conversación
```
Cliente escribe al número de WhatsApp
    ↓
nuevo → conociendo (saludo + nombre)
    ↓
formulario (preguntas específicas según servicio)
    ↓
cotizando (calcula precio según respuestas)
    ↓
esperando_pago (envía link de pago)
    ↓
verificando_pago (Wompi confirma)
    ↓
escalado (Ronald/Yesid recibe notificación)
```

### Tipos de formulario
| Tipo | Preguntas | Nivel resultado |
|---|---|---|
| Académico | 5 preguntas | basico / medio / avanzado / especializado |
| Proyectos | 4 preguntas | idem |
| Empresarial | 4 preguntas | idem |
| Software | 5 preguntas | idem |
| Tutela | 4 preguntas | idem |

### Recargos automáticos
- Urgencia alta (< 24h) → +50%
- Urgencia media (24-48h) → +25%

### Archivos adjuntos
El bot acepta PDFs e imágenes — Claude Vision extrae el contenido y cotiza basado en él.

---

## 14. SISTEMA DE IA Y AGENTES

### Arquitectura de agentes
```
Usuario envía mensaje
    ↓
CoordinatorAgent detecta el tipo de servicio
    ↓
Enruta al agente especialista
    ↓
Agente busca en RAG (pgvector) → 5 fragmentos más relevantes
    ↓
Claude API genera respuesta con contexto RAG + perfil usuario
    ↓
Si documento largo → genera .docx con plantilla base
    ↓
Si requiere revisión → guarda en pending_reviews + notifica a Ronald por WhatsApp
    ↓
Respuesta en streaming SSE al cliente
```

### ¿Cuándo se genera revisión humana?
| Agente | Condición |
|---|---|
| Jurídico | **Siempre** — todos los documentos |
| Académico | Respuesta > 1500 palabras (~5 páginas) |
| Empresarial | Respuesta > 3000 palabras (~10 páginas) |

### Sistema RAG
- Repositorios universitarios conectados: UNAL, UNAD, Redalyc, SciELO Colombia
- Sincronización automática: **domingos 2:00 AM**
- Sincronización manual: botón en Métricas → **Sincronizar RAG**
- Solo indexa documentos **a partir de 2020**

---

## 15. COMANDOS ÚTILES EN EL VPS

```bash
# Conectar al VPS
ssh usuario@116.203.193.7

# Ir al directorio del proyecto
cd /opt/asesoria-pro

# Ver estado de todos los contenedores
docker compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f postgres

# Ver últimas 100 líneas de logs del backend
docker compose -f docker-compose.prod.yml logs backend --tail=100

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart nginx

# Reiniciar todo (cuidado — hay downtime)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Forzar pull de imagen nueva (después de un deploy fallido)
docker compose -f docker-compose.prod.yml pull backend
docker compose -f docker-compose.prod.yml up -d backend

# Ver uso de recursos
docker stats --no-stream

# Conectar a la base de datos
docker exec -it asesoria_postgres_prod psql -U asesoria_user -d asesoria_ia_db

# Ver espacio en disco
df -h

# Verificar salud del backend
curl http://localhost:3000/api/v1/health | python3 -m json.tool
```

---

## 16. PENDIENTES TÉCNICOS

| Tarea | Prioridad | Notas |
|---|---|---|
| **Configurar dominio + SSL** | 🔴 Alta | Apuntar dominio a `116.203.193.7`, activar bloque HTTPS en `nginx/nginx.conf`, Let's Encrypt |
| **Verificación Meta Business WABA** | 🔴 Alta | Trámite externo ante Meta — sin esto solo números de prueba pueden escribir al bot |
| **Configurar `VOYAGE_API_KEY`** | 🟡 Media | Agregar al `.env` del VPS — sin ella el RAG usa solo keywords (menos preciso) |
| **Fix Redis en VPS** | 🟡 Media | Redis reporta error de auth — revisar `REDIS_PASSWORD` en `.env` del VPS |
| **Monitoreo y alertas** | 🟡 Media | Implementar uptime monitoring (UptimeRobot o similar) |
| **Backup automático BD** | 🟡 Media | Configurar `pg_dump` en cron para respaldo diario |
| **HTTPS en nginx** | 🔴 Alta | Descomentar bloque `server 443` en `nginx/nginx.conf` y agregar certificados SSL |

### Cómo configurar SSL (cuando tengas el dominio)
1. Apuntar DNS del dominio a `116.203.193.7`
2. En el VPS instalar Certbot: `sudo apt install certbot`
3. Obtener certificado: `sudo certbot certonly --standalone -d tudominio.com`
4. Copiar certs a `nginx/ssl/`: `fullchain.pem` y `privkey.pem`
5. Descomentar el bloque `server 443` en `nginx/nginx.conf`
6. Reemplazar `tu-dominio.com` con el dominio real
7. `docker compose -f docker-compose.prod.yml restart nginx`

---

## 17. REGLAS DE ORO — OBLIGATORIAS

1. **Nunca subir `.env` al repositorio** — contiene credenciales reales de producción
2. **Nunca hacer `synchronize: true` en producción** — destruye el esquema de la BD
3. **Nunca modificar la cuenta SUPERADMIN de Ronald** (`esRaiz: true`) — es intocable
4. **Nunca hacer cambios directos en el servidor** — siempre por GitHub → CI/CD
5. **Nunca mezclar lógica de dos agentes distintos** en un mismo archivo
6. **Nunca inventar fuentes bibliográficas** — Claude debe verificar que existan
7. **Nunca entregar un documento jurídico sin revisión humana** de Ronald
8. **Nunca romper rutas o componentes Angular que ya funcionan**
9. **Nunca hardcodear API keys** — siempre `process.env.NOMBRE_VARIABLE`
10. **Siempre consultar a Ronald antes** de: cambiar esquema BD, modificar CI/CD, tocar permisos del VPS, cambiar variables de entorno de producción

---

## 18. CONTACTO Y JERARQUÍA

| Persona | Rol | Contacto |
|---|---|---|
| **Ronald Medina** | Dueño, SUPERADMIN, aprueba todo | `ronald.medina.corp@gmail.com` |
| **Colaborador** | Ejecutor técnico | Canal acordado con Ronald |

### Cuándo SIEMPRE consultar antes de actuar
- Cualquier cambio en la base de datos de producción
- Modificar variables de entorno del VPS
- Cambiar la configuración de nginx
- Tocar el pipeline de CI/CD
- Crear o eliminar usuarios con rol SUPERADMIN
- Hacer rollback de algún deploy
- Modificar los agentes de IA o sus prompts
- Cualquier cambio que implique downtime del sistema

---

*Documento confidencial — AsesorIA Pro · M&L Profesionales*
*Generado: 2026-05-09 · Versión 1.0*
*Para actualizar este documento contactar a Ronald Medina*
