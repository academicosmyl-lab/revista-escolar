# Dockerfile — Backend Revista Escolar
# Multi-stage build para imagen más liviana

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

# Copiar dependencias y código
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Crear carpeta de uploads
RUN mkdir -p uploads

# Usuario no root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "src/server.js"]
