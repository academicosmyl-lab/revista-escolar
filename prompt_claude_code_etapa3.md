# PROMPT MAESTRO — ETAPA 3: Sistema Completo, Robusto y Listo para Producción

## ROL

Eres el arquitecto principal de este sistema. Tu objetivo es llevarlo del estado actual (módulos implementados, .env configurado) a un producto de nivel enterprise: probado, seguro, monitoreable, desplegable y mantenible. No hagas nada a medias. Cada módulo que toques debe quedar al nivel del mejor software en producción.

---

## Contexto del proyecto

Plataforma de asesoría académica y empresarial con IA para M&L Asesorías.

**Stack:**
- Backend: NestJS + TypeScript (puerto 3000)
- Frontend: Angular 18 + Signals (puerto 4200)
- Base de datos: PostgreSQL con pgvector
- Caché/Sesiones: Redis
- IA principal: Claude claude-sonnet-4-6
- Embeddings: Voyage AI voyage-3 (1024 dims)
- Automatización: n8n (puerto 5678)
- Prefijo API: /api/v1

**Dos interfaces:**
- Portal público: `http://localhost:4200/` — chatbot, formulador, noticias
- Plataforma asesores: `http://localhost:4200/asesores` — gestión interna M&L

**Estado actual:**
- ✅ .env completamente configurado (Anthropic, Voyage AI, OpenAI, Gemini, Groq, Mistral, Google OAuth, Meta WhatsApp, Email, ENCRYPTION_KEY, JWT_SECRET, RECAPTCHA)
- ✅ 19 módulos del backend implementados
- ✅ 7 agentes IA especializados (academic, legal, analytics, business, commercial, plagiarism, developer)
- ⚠️ Inconsistencia de email: hay dos bloques (`MAIL_USER/MAIL_PASSWORD` sin configurar vs `EMAIL_USER/EMAIL_PASS` configurado) — resolver cuál usa el código
- ⏸️ n8n bloqueado hasta tenerlo corriendo en localhost:5678

---

## FASE 0 — Arranque y verificación base

### 0.1 Levantar servicios
```bash
docker-compose up -d
cd backend && npm run start:dev
```
- Confirmar que NestJS levanta sin errores
- Confirmar conexión a PostgreSQL y Redis en los logs
- Verificar que TypeORM creó todas las tablas correctamente

### 0.2 Resolver inconsistencia de email
- Buscar en el código si se usa `MAIL_USER` o `EMAIL_USER`
- Unificar en el `.env` con el bloque correcto
- Eliminar el bloque sin usar

### 0.3 Verificar variables de entorno críticas
Crear un endpoint interno `GET /api/v1/health` que devuelva:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "anthropic": "configured",
  "voyage": "configured",
  "email": "configured",
  "timestamp": "2025-..."
}
```
Este endpoint será la primera prueba de vida del sistema en producción.

---

## FASE 1 — Pruebas funcionales completas

### 1.1 Flujo de agentes IA
- `POST /api/v1/agents/procesar` con mensajes de prueba para cada uno de los 7 agentes
- Verificar enrutamiento correcto del `coordinator.agent.ts`
- Confirmar registros en tabla `agent_logs` por cada llamada
- Probar fallback multi-proveedor: simular fallo de Anthropic y verificar que el `ai-router.service.ts` cambia automáticamente al siguiente proveedor

### 1.2 Sistema de memoria
- Verificar sesión activa en Redis
- Verificar historial persistente en PostgreSQL (tabla `conversations`)
- Probar `GET /api/v1/agents/perfil/:userId` — el perfil debe enriquecerse con cada conversación
- Probar que el contexto de conversaciones anteriores llega correctamente al agente en la siguiente sesión

### 1.3 Sistema RAG
- Indexar 3 documentos de prueba (PDF, DOCX, texto plano) con `POST /api/v1/rag/indexar`
- Generar embeddings con `POST /api/v1/rag/generar-embeddings`
- Buscar con `GET /api/v1/rag/buscar?consulta=...` y verificar resultados semánticos
- Probar el fallback a keywords cuando Voyage AI no responde
- Verificar que el RAG enriquece las respuestas de los agentes con contexto relevante

### 1.4 Detector de plagio/IA
- `POST /api/v1/detector/analizar` con texto propio y texto de IA generado
- `POST /api/v1/detector/analizar-archivo` con PDF y DOCX
- Verificar resultados en tabla `analisis_deteccion`
- Verificar porcentajes de confianza en la detección

### 1.5 Formulador de proyectos
- Crear proyecto con `POST /api/v1/formulador`
- Exportar Word con `GET /api/v1/formulador/:id/exportar/word`
- Exportar PDF con `GET /api/v1/formulador/:id/exportar/pdf`
- Abrir los archivos y verificar que el formato sea profesional y correcto

### 1.6 Plataforma de asesores
- Login SUPERADMIN en `POST /api/v1/asesores/auth/login`
- Crear asesor → verificar en lista → activar/desactivar con `PATCH /asesores/admin/:id/toggle`
- Crear cliente → crear contrato → verificar generación automática de 16 semanas en `seguimiento_semanal`
- Actualizar semanas de seguimiento individualmente
- Registrar pagos y verificar resumen de cartera
- Subir documentos a biblioteca → buscar semánticamente → calificar

### 1.7 Panel de revisión humana
- Generar documento que requiera revisión
- Verificar aparición en `GET /api/v1/admin/revisiones`
- Probar aprobación y rechazo con motivo

### 1.8 Noticias académicas
- `GET /api/v1/noticias?lang=es` — verificar feeds RSS (SciDev, ScienceDaily, arXiv)
- Probar los 4 idiomas: `es`, `en`, `pt`, `fr`

### 1.9 Google OAuth
- `POST /api/v1/asesores/auth/google-init` → flujo completo de login con Google

### 1.10 Cron de sincronización
- `POST /api/v1/sync/ejecutar` — sync manual de repositorios académicos
- `POST /api/v1/sync/internos` — reindexar documentos en `/knowledge/ml-docs/`
- Verificar que el `@Cron` del domingo 2am esté en zona horaria America/Bogota

### 1.11 Portal público end-to-end
- Registro de usuario → verificación por email → login → obtener JWT
- Chatbot: enviar mensajes y verificar streaming de respuestas en tiempo real
- Formulador desde el frontend: flujo completo hasta exportar documento
- `POST /api/v1/solicitudes` — crear solicitud de servicio
- Verificar popup de bienvenida personalizado
- Probar multiidioma: `es`, `en`, `pt`, `fr`

### 1.12 ⏸️ WhatsApp + n8n (cuando n8n esté disponible)
- Instalar n8n: `npm install -g n8n && n8n start`
- Verificar webhook Meta: `GET /api/v1/whatsapp/meta-webhook`
- Enviar mensaje de prueba: `POST /api/v1/whatsapp/test`
- Confirmar flujo completo: Meta → n8n webhook → `POST /api/v1/whatsapp/procesar` → agente IA → respuesta

---

## FASE 2 — Seguridad y robustez

### 2.1 Rate limiting global
Aplicar rate limiting con `@nestjs/throttler` en todos los endpoints públicos:
```
POST /agents/procesar       → 30 req/min por IP
POST /auth/registro         → 5 req/min por IP
POST /auth/login            → 10 req/min por IP
POST /detector/analizar     → 10 req/min por usuario
POST /formulador            → 10 req/min por usuario
GET  /noticias              → 60 req/min por IP
Todos los demás públicos    → 60 req/min por IP
```

### 2.2 Seguridad HTTP
Instalar y configurar `helmet` en `main.ts`:
```typescript
app.use(helmet());
app.use(helmet.contentSecurityPolicy({...}));
app.use(helmet.hsts({ maxAge: 31536000 }));
```

Configurar CORS estricto:
```typescript
app.enableCors({
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

### 2.3 Validación y sanitización
- Verificar que TODOS los DTOs usen `class-validator` con decoradores apropiados
- Instalar y configurar `ValidationPipe` global con `transform: true` y `whitelist: true`
- Sanitizar inputs HTML con `sanitize-html` en campos de texto libre
- Verificar que ningún endpoint acepte campos no declarados en sus DTOs

### 2.4 Protección de endpoints
- Verificar que todos los endpoints de `/asesores/**` requieran JWT válido de asesor
- Verificar que los endpoints de `/admin/**` requieran rol SUPERADMIN
- Revisar que los endpoints de `/auth/**` públicos no expongan información sensible en errores
- Agregar validación de `recaptcha` en registro y login del portal público

### 2.5 Cifrado y datos sensibles
- Verificar que la tabla `clientes_ml` realmente cifra con AES-256 antes de persistir
- Verificar que las contraseñas usan bcrypt con salt rounds >= 12
- Confirmar que los JWT tienen expiración configurada (access: 15min, refresh: 7días si aplica)
- Verificar que los logs NO registran contraseñas, tokens ni datos personales

---

## FASE 3 — Manejo de errores y resiliencia

### 3.1 Filtro global de excepciones
Crear `HttpExceptionFilter` global que:
- Capture todos los errores no manejados
- Devuelva siempre el mismo formato JSON: `{ statusCode, message, timestamp, path }`
- Registre en logs los errores 5xx con stack trace completo
- NO exponga stack traces al cliente en producción

### 3.2 Resiliencia del sistema de IA
En `ai-router.service.ts` verificar que:
- Si Claude falla → intenta OpenAI
- Si OpenAI falla → intenta Gemini
- Si todos fallan → devuelve mensaje amigable al usuario, NO un error 500
- Cada intento tiene timeout de 30 segundos
- Los fallos se registran en `agent_logs` con el proveedor que falló

### 3.3 Resiliencia de Redis
- Si Redis no está disponible, el sistema debe seguir funcionando sin caché (degraded mode)
- Las sesiones deben poder reconstruirse desde PostgreSQL si Redis pierde datos
- Agregar reconexión automática con backoff exponencial

### 3.4 Resiliencia de Voyage AI
- Si Voyage AI falla en la generación de embeddings, el RAG debe caer automáticamente a búsqueda por keywords
- El sistema NO debe fallar silenciosamente — debe loguear el fallback

### 3.5 Circuit breaker para APIs externas
Para Anthropic, Voyage AI, Meta y Google OAuth: implementar patrón circuit breaker básico con `opossum` o manualmente:
- Abre el circuito después de 5 fallos consecutivos
- Intenta reconectar cada 60 segundos
- Estado del circuito visible en `GET /api/v1/health`

---

## FASE 4 — Logs estructurados y monitoreo

### 4.1 Logger estructurado
Instalar Winston y configurar logger global:
```typescript
// Formato en desarrollo: legible por humanos
// Formato en producción: JSON estructurado
{
  "timestamp": "2025-...",
  "level": "info|warn|error",
  "context": "AgentsService",
  "message": "Agente academic procesó consulta",
  "userId": "uuid",
  "agentType": "academic",
  "durationMs": 1240,
  "provider": "anthropic"
}
```

### 4.2 Niveles de log por módulo
- **ERROR**: fallos de IA, errores de BD, excepciones no manejadas
- **WARN**: fallbacks activados, rate limits cerca del límite, tokens JWT próximos a expirar
- **INFO**: cada request procesado, agente activado, documento generado
- **DEBUG**: payloads completos (solo en desarrollo)

### 4.3 Rotación de logs
- Logs de aplicación: rotar diario, retener 30 días
- Logs de error: retener 90 días
- Logs de acceso: rotar diario, retener 7 días

### 4.4 Dashboard de métricas (endpoint interno)
Crear `GET /api/v1/admin/metricas` que devuelva:
```json
{
  "agentes": {
    "totalConsultas24h": 142,
    "porAgente": { "academic": 45, "legal": 30, ... },
    "tiempoPromedioMs": 1850,
    "tasaErrores": 0.02
  },
  "rag": {
    "documentosIndexados": 1240,
    "busquedasHoy": 89,
    "hitRate": 0.94
  },
  "sistema": {
    "memoriaUsadaMB": 512,
    "uptime": "5d 3h 42m",
    "versionNode": "20.x"
  }
}
```

---

## FASE 5 — Tests

### 5.1 Tests unitarios — Agentes IA
Para cada uno de los 7 agentes, crear tests en `*.spec.ts`:
- El agente procesa una consulta y devuelve respuesta estructurada
- El coordinator enruta correctamente al agente correspondiente según el tipo de mensaje
- El fallback multi-proveedor se activa cuando el proveedor principal falla (mock del cliente Anthropic)

### 5.2 Tests de integración — Endpoints críticos
Con supertest sobre el servidor NestJS:
- `POST /agents/procesar` — respuesta correcta con agente correcto
- `POST /auth/registro` + `POST /auth/login` — flujo completo
- `POST /asesores/auth/login` — JWT válido con rol correcto
- `POST /detector/analizar` — devuelve score de detección
- `POST /formulador` → `GET /formulador/:id/exportar/word` — archivo válido

### 5.3 Tests de seguridad
- Intentar acceder a `/asesores/**` sin JWT → debe devolver 401
- Intentar acceder a `/admin/**` con JWT de asesor normal → debe devolver 403
- Enviar payload con campos extra en DTOs → deben ser ignorados (whitelist)
- Intentar SQL injection en campos de texto → deben ser sanitizados

### 5.4 Script de prueba completo
Crear `scripts/test-full-system.sh` que ejecute en orden:
1. Verifica que PostgreSQL y Redis responden
2. Levanta el backend en modo test
3. Corre todos los tests unitarios
4. Corre todos los tests de integración
5. Muestra reporte de cobertura

---

## FASE 6 — Preparación para despliegue

### 6.1 Dockerización completa
Crear `Dockerfile` optimizado para el backend:
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main"]
```

Crear `Dockerfile` para el frontend:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=builder /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### 6.2 Docker Compose de producción
Crear `docker-compose.prod.yml` con:
- Servicio `backend` (NestJS)
- Servicio `frontend` (Nginx)
- Servicio `postgres` con volumen persistente y healthcheck
- Servicio `redis` con contraseña y volumen persistente
- Servicio `n8n` con volumen persistente
- Red interna entre servicios (el backend NO expone PostgreSQL ni Redis al exterior)
- Variables de entorno desde archivo `.env` (nunca hardcodeadas)
- `restart: unless-stopped` en todos los servicios
- Límites de memoria y CPU por servicio

### 6.3 Nginx como reverse proxy
Crear `nginx.conf` que:
- Sirva el frontend Angular en `/`
- Haga proxy de `/api/v1/**` al backend en puerto 3000
- Configure gzip para assets estáticos
- Configure headers de seguridad (X-Frame-Options, X-Content-Type-Options, etc.)
- Redirija HTTP → HTTPS (cuando el SSL esté configurado)
- Limite el tamaño de uploads a 50MB

### 6.4 Variables de entorno para producción
Crear `.env.production.example` con todas las variables necesarias documentadas y sin valores reales. Este archivo SÍ va al repositorio como referencia. El `.env` real NUNCA va al repositorio.

Verificar que el `.gitignore` incluya:
```
.env
.env.local
.env.production
*.local
dist/
node_modules/
logs/
```

### 6.5 Scripts de despliegue
Crear `scripts/deploy.sh`:
```bash
#!/bin/bash
# 1. Pull del repositorio
# 2. Verificar que el .env existe
# 3. Build de imágenes Docker
# 4. Correr migraciones de BD
# 5. Levantar servicios con docker-compose.prod.yml
# 6. Verificar health check
# 7. Notificar resultado
```

Crear `scripts/backup-db.sh`:
```bash
#!/bin/bash
# Backup diario de PostgreSQL
# Comprime y guarda con timestamp
# Retiene últimos 7 días
# Puede ejecutarse como cron diario
```

### 6.6 Migraciones de base de datos
- Configurar TypeORM migrations (NO usar `synchronize: true` en producción)
- Crear la migración inicial con el schema completo actual
- Verificar que `npm run migration:run` funciona correctamente
- Crear `npm run migration:generate` para futuras migraciones

### 6.7 Configuración SSL (preparar estructura)
Crear directorio `nginx/ssl/` con instrucciones para:
- Obtener certificado con Let's Encrypt: `certbot --nginx -d tu-dominio.com`
- Renovación automática con cron: `0 0 * * * certbot renew --quiet`
- El `nginx.conf` debe tener sección SSL comentada lista para activar

### 6.8 CI/CD con GitHub Actions
Crear `.github/workflows/ci.yml`:
```yaml
# Trigger: push a main y pull requests
# Jobs:
#   1. Lint y type-check (backend + frontend)
#   2. Tests unitarios
#   3. Tests de integración (con PostgreSQL y Redis en Docker)
#   4. Build de imágenes Docker
#   5. (Solo en main) Deploy automático al servidor
```

---

## FASE 7 — Funcionalidades de negocio pendientes

### 7.1 Dashboard de métricas para SUPERADMIN (Frontend)
En la plataforma de asesores, agregar sección de métricas con:
- Total de clientes activos / contratos vigentes
- Consultas por agente IA esta semana (gráfica de barras)
- Contratos con seguimiento atrasado (semanas sin actualizar)
- Cartera pendiente de cobro total
- Últimas 10 actividades del sistema

### 7.2 Sistema de notificaciones por email
Triggers automáticos para enviar email:
- Cuando un contrato lleva 2 semanas sin actualizar el seguimiento → alerta al asesor responsable
- Cuando un cliente tiene pago vencido → recordatorio automático
- Cuando se genera un documento y pasa revisión → notificación al cliente
- Resumen semanal de actividad para el SUPERADMIN (todos los lunes 8am)

### 7.3 Popup de bienvenida y personalización
Verificar que el `popup-bienvenida` en el frontend:
- Se muestre solo en la primera visita
- Adapte el idioma automáticamente según el navegador
- El `personalization.service.ts` ajuste el tono del chatbot según el perfil detectado

### 7.4 Exportación de reportes
Agregar endpoint `GET /api/v1/asesores/reportes/contratos` que genere un Excel con:
- Todos los contratos activos
- Estado de pagos por contrato
- Avance de seguimiento semanal
- Exportable desde el frontend con un botón

---

## CRITERIO DE ÉXITO GLOBAL

El sistema está listo para producción cuando:

1. `npm run test` pasa al 100% sin errores
2. `GET /api/v1/health` devuelve todos los servicios en verde
3. El docker-compose.prod.yml levanta todo el sistema con un solo comando
4. Un mensaje enviado al chatbot web llega al agente correcto, tiene contexto RAG, y responde en streaming en menos de 5 segundos
5. La plataforma de asesores permite el ciclo completo: login → cliente → contrato → seguimiento → pago
6. Los logs en producción son JSON estructurado sin datos sensibles
7. Un reinicio del servidor no pierde ningún dato

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6 → FASE 7
```

No avanzar a la siguiente fase hasta que la anterior esté completa y verificada.
Ante cualquier error en FASE 1, resolverlo antes de continuar — las fases siguientes dependen de que el sistema funcione correctamente.
