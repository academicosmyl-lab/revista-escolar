# ============================================================
# INSTITUTO TÉCNICO INDUSTRIAL SANTANDER
# Script de instalación automática — Revista Digital
# Ejecutar en PowerShell como Administrador:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#   .\instalar.ps1
# ============================================================
# Todo el código de este proyecto fue desarrollado por Claude (Anthropic)
# ============================================================

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "ITS Santander — Instalación Revista Digital"

function Write-Titulo($texto) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $texto" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Write-Ok($texto)    { Write-Host "  ✅  $texto" -ForegroundColor Green }
function Write-Info($texto)  { Write-Host "  ℹ️   $texto" -ForegroundColor Cyan }
function Write-Warn($texto)  { Write-Host "  ⚠️   $texto" -ForegroundColor Yellow }
function Write-Paso($texto)  { Write-Host "`n  → $texto" -ForegroundColor White }

# ── BIENVENIDA ────────────────────────────────────────────
Clear-Host
Write-Host @"

  ██████████████████████████████████████████████████████
  █                                                    █
  █   INSTITUTO TÉCNICO INDUSTRIAL SANTANDER           █
  █   Revista Digital — Instalación Automática         █
  █   Código desarrollado por Claude (Anthropic)       █
  █                                                    █
  ██████████████████████████████████████████████████████

"@ -ForegroundColor Blue

Write-Host "  Este script instalará todo lo necesario para ejecutar" -ForegroundColor Gray
Write-Host "  la Revista Digital del Instituto de forma local." -ForegroundColor Gray
Write-Host ""
Write-Host "  Presiona ENTER para continuar o Ctrl+C para cancelar..." -ForegroundColor Yellow
Read-Host

# ── PASO 1: Verificar Node.js ─────────────────────────────
Write-Titulo "PASO 1 — Verificar Node.js"

try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -ge 20) {
            Write-Ok "Node.js $nodeVersion ya está instalado"
        } else {
            Write-Warn "Node.js $nodeVersion es muy antiguo. Se necesita v20 o superior."
            Write-Info "Descarga la versión LTS desde: https://nodejs.org"
            Write-Host "`n  Presiona ENTER cuando hayas instalado Node.js 20+..." -ForegroundColor Yellow
            Read-Host
        }
    }
} catch {
    Write-Warn "Node.js no está instalado."
    Write-Info "Abriendo la página de descarga..."
    Start-Process "https://nodejs.org/en/download"
    Write-Host ""
    Write-Host "  1. Descarga el instalador LTS (Long Term Support)" -ForegroundColor White
    Write-Host "  2. Ejecuta el instalador y acepta todas las opciones por defecto" -ForegroundColor White
    Write-Host "  3. Cierra y vuelve a abrir PowerShell" -ForegroundColor White
    Write-Host "  4. Vuelve a ejecutar este script" -ForegroundColor White
    Write-Host ""
    Write-Host "  Presiona ENTER para salir..." -ForegroundColor Yellow
    Read-Host
    exit 1
}

# ── PASO 2: Verificar Git ─────────────────────────────────
Write-Titulo "PASO 2 — Verificar Git"

try {
    $gitVersion = git --version 2>$null
    Write-Ok "Git $gitVersion ya está instalado"
} catch {
    Write-Warn "Git no está instalado."
    Write-Info "Abriendo la página de descarga de Git..."
    Start-Process "https://git-scm.com/download/win"
    Write-Host ""
    Write-Host "  1. Descarga e instala Git para Windows" -ForegroundColor White
    Write-Host "  2. Durante la instalación: deja todas las opciones por defecto" -ForegroundColor White
    Write-Host "  3. Cierra y vuelve a abrir PowerShell como Administrador" -ForegroundColor White
    Write-Host "  4. Vuelve a ejecutar este script" -ForegroundColor White
    Write-Host ""
    Write-Host "  Presiona ENTER para salir..." -ForegroundColor Yellow
    Read-Host
    exit 1
}

# ── PASO 3: Verificar npm ─────────────────────────────────
Write-Titulo "PASO 3 — Verificar npm"
$npmVersion = npm --version 2>$null
Write-Ok "npm v$npmVersion disponible"

# ── PASO 4: Instalar dependencias del backend ─────────────
Write-Titulo "PASO 4 — Instalar dependencias del backend"

$backendPath = Join-Path $PSScriptRoot "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "  ❌ No se encontró la carpeta 'backend'." -ForegroundColor Red
    Write-Host "     Asegúrate de ejecutar este script desde la raíz del proyecto." -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Paso "Instalando paquetes npm (puede tardar 2-3 minutos)..."

npm install --loglevel=error

if ($LASTEXITCODE -eq 0) {
    Write-Ok "Dependencias instaladas correctamente"
} else {
    Write-Host "  ❌ Error instalando dependencias. Revisa la conexión a internet." -ForegroundColor Red
    exit 1
}

# ── PASO 5: Configurar variables de entorno ───────────────
Write-Titulo "PASO 5 — Configurar variables de entorno"

$envFile = Join-Path $backendPath ".env"
$envExample = Join-Path $backendPath ".env.example"

if (Test-Path $envFile) {
    Write-Ok "Archivo .env ya existe — no se sobreescribe"
} else {
    Copy-Item $envExample $envFile
    Write-Ok "Archivo .env creado desde .env.example"
    Write-Warn "IMPORTANTE: Debes editar el archivo .env con tus credenciales reales"
    Write-Info "Archivo ubicado en: $envFile"
}

# ── PASO 6: Crear carpetas necesarias ─────────────────────
Write-Titulo "PASO 6 — Crear carpetas del proyecto"

$carpetas = @("uploads", "logs", "templates")
foreach ($carpeta in $carpetas) {
    $ruta = Join-Path $backendPath $carpeta
    if (-not (Test-Path $ruta)) {
        New-Item -ItemType Directory -Path $ruta -Force | Out-Null
        Write-Ok "Carpeta creada: $carpeta"
    } else {
        Write-Info "Carpeta ya existe: $carpeta"
    }
}

# ── PASO 7: Instalar Angular CLI ──────────────────────────
Write-Titulo "PASO 7 — Angular CLI (para el frontend)"

try {
    $ngVersion = ng version 2>$null | Select-String "Angular CLI"
    Write-Ok "Angular CLI ya está instalado"
} catch {
    Write-Paso "Instalando Angular CLI globalmente..."
    npm install -g @angular/cli --loglevel=error
    Write-Ok "Angular CLI instalado"
}

# ── PASO 8: Instalar nodemon (desarrollo) ─────────────────
Write-Titulo "PASO 8 — Herramientas de desarrollo"

Write-Paso "Instalando nodemon globalmente..."
npm install -g nodemon --loglevel=error
Write-Ok "nodemon instalado (reinicio automático en desarrollo)"

# ── PASO 9: Inicializar base de datos ─────────────────────
Write-Titulo "PASO 9 — Inicializar base de datos"

Write-Info "Verificando archivo .env antes de crear la base de datos..."

$envContent = Get-Content $envFile -Raw

if ($envContent -match "DB_DIALECT=sqlite") {
    Write-Paso "Creando base de datos SQLite y datos iniciales..."
    node src/utils/seed.js

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Base de datos inicializada con:"
        Write-Host "     • 3 sedes del Instituto" -ForegroundColor Gray
        Write-Host "     • 10 áreas de conocimiento" -ForegroundColor Gray
        Write-Host "     • 7 categorías de noticias" -ForegroundColor Gray
        Write-Host "     • Usuario administrador" -ForegroundColor Gray
    } else {
        Write-Warn "No se pudo inicializar la BD. Verifica las variables de entorno en .env"
    }
} else {
    Write-Warn "BD no es SQLite — configura DB_HOST, DB_USER, DB_PASSWORD en .env y ejecuta:"
    Write-Host "     node src/utils/seed.js" -ForegroundColor Cyan
}

# ── RESUMEN FINAL ─────────────────────────────────────────
Write-Host @"

  ██████████████████████████████████████████████████████
  █                                                    █
  █   INSTALACIÓN COMPLETADA                           █
  █                                                    █
  ██████████████████████████████████████████████████████

"@ -ForegroundColor Green

Write-Host "  PRÓXIMOS PASOS:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Edita el archivo .env con tus credenciales:" -ForegroundColor Yellow
Write-Host "     $envFile" -ForegroundColor Gray
Write-Host ""
Write-Host "     Variables OBLIGATORIAS para que funcione:" -ForegroundColor White
Write-Host "       JWT_SECRET          → cualquier texto largo y seguro" -ForegroundColor Gray
Write-Host "       ANTHROPIC_API_KEY   → tu clave de console.anthropic.com" -ForegroundColor Gray
Write-Host "       CLOUDINARY_*        → tus claves de cloudinary.com (gratis)" -ForegroundColor Gray
Write-Host "       EMAIL_USER/PASS     → tu Gmail + contraseña de aplicación" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Iniciar el servidor en modo desarrollo:" -ForegroundColor Yellow
Write-Host "     cd backend" -ForegroundColor Cyan
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Verificar que funciona:" -ForegroundColor Yellow
Write-Host "     http://localhost:3000/api/v1/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Panel de administración (cuando tenga frontend):" -ForegroundColor Yellow
Write-Host "     http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  Credenciales admin por defecto:" -ForegroundColor White
Write-Host "    Email:      admin@itssantander.edu.co" -ForegroundColor Gray
Write-Host "    Contraseña: Admin2024*" -ForegroundColor Gray
Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "  Código desarrollado por Claude (Anthropic)" -ForegroundColor DarkGray
Write-Host "  Instituto Técnico Industrial Santander · 2026" -ForegroundColor DarkGray
Write-Host ""

Set-Location $PSScriptRoot
