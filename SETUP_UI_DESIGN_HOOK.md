# Setup: UI Design Hook Global para Claude Code

Ejecuta estas instrucciones en orden. El objetivo es que Claude Code tome decisiones de diseño autónomas en CUALQUIER proyecto, sin que tengas que pedírselo.

---

## Paso 1 — Crear la carpeta de hooks

```bash
mkdir -p ~/.claude/hooks
```

---

## Paso 2 — Crear el script del hook

```bash
cat > ~/.claude/hooks/ui-design-injector.py << 'EOF'
#!/usr/bin/env python3
"""
UI Design Injector Hook para Claude Code
Se activa automáticamente cuando Claude va a escribir/editar archivos frontend.
Inyecta criterio de diseño sin que el usuario tenga que pedirlo.
"""
import json
import sys
import os

data = json.load(sys.stdin)
event = data.get("hook_event_name", "")
tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

UI_EXTENSIONS = ('.tsx', '.jsx', '.html', '.css', '.scss', '.vue', '.svelte', '.astro')

def is_ui_file(path):
    return any(path.endswith(ext) for ext in UI_EXTENSIONS)

def detect_stack(path, content=""):
    if path.endswith(('.tsx', '.jsx')):
        return "react"
    if path.endswith('.vue'):
        return "vue"
    if path.endswith('.svelte'):
        return "svelte"
    if path.endswith('.astro'):
        return "astro"
    if path.endswith(('.css', '.scss')):
        return "styles"
    return "html"

DESIGN_CONTEXT = """
## UI DESIGN DIRECTIVES — AUTO-INJECTED (leer antes de escribir cualquier código visual)

Eres un diseñador de producto con criterio estético fuerte. Antes de escribir CUALQUIER componente visual, toma decisiones de diseño de forma autónoma. NO preguntes, decide y ejecuta.

### 1. DIRECCIÓN ESTÉTICA — elige UNA y comprométete
Evalúa el contexto del proyecto (nombre de archivos, carpetas, README) y elige:
- **Editorial/Refinado**: tipografías serif + mucho espacio negativo + paleta monocromática
- **Bold/Moderno**: sans-serif geométrico + colores saturados + layouts asimétricos
- **Dark Premium**: fondo oscuro profundo + acentos luminosos + glassmorphism sutil
- **Minimal Limpio**: blanco dominante + tipografía fina + un solo color de acento
- **Cálido/Orgánico**: tonos tierra + bordes suaves + sensación artesanal

### 2. TIPOGRAFÍA — reglas obligatorias
- NUNCA uses: Inter, Roboto, Arial, system-ui como fuente principal
- Siempre importa desde Google Fonts un par complementario:
  - Display/títulos: fuente con carácter (Playfair Display, Syne, DM Serif Display, Bebas Neue, Cabinet Grotesk)
  - Body/texto: fuente legible y refinada (DM Sans, Outfit, Plus Jakarta Sans, Nunito)
- Aplica jerarquía tipográfica clara: al menos 3 tamaños distintos con propósito

### 3. COLORES — define variables CSS siempre
```css
:root {
  --color-bg: /* fondo principal — nunca #ffffff puro ni #f5f5f5 genérico */;
  --color-surface: /* superficie de cards/modales */;
  --color-primary: /* color dominante de marca */;
  --color-accent: /* acento llamativo, úsalo con moderación */;
  --color-text: /* texto principal */;
  --color-text-muted: /* texto secundario */;
  --color-border: /* bordes y separadores */;
}
```
- Paleta máxima: 2 colores de marca + sistema de neutrales
- El acento debe aparecer en ≤20% de la interfaz para mantener impacto

### 4. ESPACIADO — escala estricta
Solo usa múltiplos de 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px
Nunca valores arbitrarios como 15px, 22px, 37px.

### 5. COMPONENTES — estándares mínimos

**Botones:**
```css
/* Siempre incluir: */
border-radius: 6px - 12px (consistente en todo el proyecto);
transition: all 200ms ease;
/* hover: cambio visible de color/sombra/transform */
/* focus: outline visible con color del sistema */
```

**Cards:**
- Nunca flat sin profundidad
- box-shadow sutil en reposo, más pronunciado en hover
- border-radius consistente con el resto del sistema

**Inputs:**
- Border visible (nunca solo fondo)
- Focus ring con color de acento
- Nunca `outline: none` sin reemplazo visible

**Navegación:**
- Indicador activo claro
- Hover states en todos los items

### 6. ANIMACIONES — obligatorias para interfaces nuevas
```css
/* Page load: stagger de elementos principales */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.element { animation: fadeUp 400ms ease forwards; }
.element:nth-child(2) { animation-delay: 80ms; }
.element:nth-child(3) { animation-delay: 160ms; }
```
- Hover en cards: `transform: translateY(-2px)` + shadow más pronunciado
- Transiciones en todos los estados interactivos: 150-300ms ease
- Loading states: skeleton screens o spinners coherentes con el diseño

### 7. LAYOUT — rompe la monotonía
- Evita columnas idénticas de igual peso visual
- Usa asimetría intencional (70/30, 60/40 mejor que 50/50)
- Grid-breaking: permite que elementos importantes rompan la cuadrícula
- Espacio negativo como elemento de diseño, no como "espacio vacío"

### 8. FONDOS Y TEXTURA — nunca colores planos aburridos
Opciones según la estética elegida:
```css
/* Gradiente sutil */
background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

/* Noise texture (premium) */
background-image: url("data:image/svg+xml,..."); /* grain overlay */

/* Mesh gradient */
background: radial-gradient(at 40% 20%, hsl(220,70%,20%) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsl(240,60%,15%) 0px, transparent 50%);
```

### 9. STACK-SPECIFIC

**React/TSX:**
- Usa clases de Tailwind SI el proyecto ya tiene Tailwind configurado
- Si no hay Tailwind: CSS Modules o styled-components con las variables definidas arriba
- Componentes atómicos: Button, Card, Input, Badge como base reutilizable

**HTML/CSS puro:**
- Variables CSS en `:root` obligatorio
- Flexbox/Grid, nunca floats
- `clamp()` para tipografía responsive

**Vue/Svelte:**
- Scoped styles con las mismas variables CSS
- Transitions del framework para animaciones de estado

### 10. CHECKLIST antes de terminar cualquier archivo UI
- [ ] ¿Definí variables CSS para colores y usé la escala de espaciado?
- [ ] ¿Importé Google Fonts (no Inter/Roboto/Arial)?
- [ ] ¿Todos los botones tienen hover + transition?
- [ ] ¿Las cards tienen sombra y profundidad?
- [ ] ¿Hay al menos una animación de entrada?
- [ ] ¿El layout tiene jerarquía visual clara?
- [ ] ¿El diseño es memorable o es genérico "AI slop"?

Si algún ítem es NO — corrígelo antes de entregar el archivo.
"""

if event == "PreToolUse" and tool_name in ("Write", "Edit", "MultiEdit"):
    file_path = tool_input.get("file_path", "")
    
    if is_ui_file(file_path):
        output = {
            "additionalContext": DESIGN_CONTEXT
        }
        print(json.dumps(output))
        sys.exit(0)

sys.exit(0)
EOF
```

```bash
chmod +x ~/.claude/hooks/ui-design-injector.py
```

---

## Paso 3 — Registrar en settings global

```bash
# Verificar si ya existe el archivo
cat ~/.claude/settings.json 2>/dev/null || echo "{}"
```

Si el archivo **no existe** o está vacío:

```bash
cat > ~/.claude/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/ui-design-injector.py"
          }
        ]
      }
    ]
  }
}
EOF
```

Si el archivo **ya existe con contenido**, agrega solo la sección `hooks` dentro del JSON existente — no sobreescribas otras configuraciones.

---

## Paso 4 — Verificar

Dentro de Claude Code ejecuta:

```
/hooks
```

Deberías ver algo como:

```
PreToolUse hooks:
  • Write|Edit|MultiEdit → python3 ~/.claude/hooks/ui-design-injector.py
```

---

## Paso 5 — Probar

Pídele a Claude Code que cree cualquier componente frontend:

```
crea un componente de login card en React
```

Claude debería automáticamente elegir fuentes, colores, animaciones y layout sin que se lo pidas.

---

## Cómo funciona internamente

```
Tu prompt → Claude Code planea escribir .tsx/.html/.css
                        ↓
         Hook detecta archivo UI (PreToolUse)
                        ↓
    Inyecta directivas de diseño al contexto de Claude
                        ↓
    Claude escribe el archivo con criterio estético autónomo
                        ↓
              Resultado: UI con diseño real, no genérica
```

---

## Extensiones UI soportadas

`.tsx` `.jsx` `.html` `.css` `.scss` `.vue` `.svelte` `.astro`

Para agregar más, edita la variable `UI_EXTENSIONS` en el script.

---

## Desactivar temporalmente

```bash
# En settings.json agrega:
{
  "disableAllHooks": true,
  ...
}

# O renombra el script:
mv ~/.claude/hooks/ui-design-injector.py ~/.claude/hooks/ui-design-injector.py.disabled
```
