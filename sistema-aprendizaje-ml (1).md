# 🧠 Sistema de Aprendizaje — M&L Profesionales
> El proyecto aprende de sí mismo con cada entrega que los asesores guardan.
> Creado: 28 de abril de 2026

---

## ¿Qué hace este sistema?

Cada vez que un asesor guarda un trabajo:
1. Se extrae un resumen inteligente del documento vía Claude API
2. Se guarda en `knowledge-base.json` con: materia, tutor, número de entrega, calificación y resumen
3. La próxima vez que llegue un trabajo similar, el agente **ya sabe** el estilo del tutor, los errores frecuentes y lo que funciona

---

## 📁 Estructura de archivos en el proyecto

```
src/
├── app/
│   ├── services/
│   │   └── knowledge.service.ts       ← gestiona el aprendizaje
│   └── agents/
│       └── academic.agent.ts          ← usa el conocimiento al responder
├── assets/
│   └── knowledge-base.json            ← base de conocimiento (crece sola)
└── uploads/                           ← documentos reales subidos
    ├── estadistica_tutor_maria_e1.pdf
    └── metodologia_tutor_juan_e2.docx
```

---

## 📄 knowledge-base.json — estructura base

```json
{
  "version": "1.0",
  "ultima_actualizacion": "2026-04-28",
  "total_documentos": 0,
  "tutores": {},
  "materias": {},
  "entregas": []
}
```

Ejemplo de cómo crece con el tiempo:

```json
{
  "version": "1.0",
  "ultima_actualizacion": "2026-04-28",
  "total_documentos": 3,
  "tutores": {
    "maria_garcia": {
      "nombre": "María García",
      "estilo_preferido": "APA 7ma edición, párrafos cortos, máximo 3 citas por página",
      "errores_comunes": ["exceso de citas directas", "conclusiones muy cortas"],
      "calificacion_promedio": 87,
      "total_entregas": 2
    }
  },
  "materias": {
    "estadistica": {
      "nombre": "Estadística Descriptiva",
      "estructura_tipica": "introducción, marco teórico, metodología, análisis, conclusión",
      "longitud_promedio_paginas": 15,
      "total_entregas": 1
    }
  },
  "entregas": [
    {
      "id": "e001",
      "fecha": "2026-04-15",
      "materia": "estadistica",
      "tutor": "maria_garcia",
      "numero_entrega": 1,
      "asesor": "Carlos López",
      "calificacion": 85,
      "archivo": "uploads/estadistica_maria_e1.pdf",
      "resumen_ia": "Trabajo sobre medidas de tendencia central. Buena estructura pero conclusión débil. El tutor valoró el uso de tablas de frecuencia.",
      "aprendizajes": [
        "Tutor prefiere tablas antes que gráficas",
        "Conclusión debe tener mínimo 3 párrafos",
        "Citar siempre la fuente de los datos estadísticos"
      ]
    }
  ]
}
```

---

## 🛠️ knowledge.service.ts

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Entrega {
  id: string;
  fecha: string;
  materia: string;
  tutor: string;
  numero_entrega: number;
  asesor: string;
  calificacion?: number;
  archivo: string;
  resumen_ia: string;
  aprendizajes: string[];
}

export interface KnowledgeBase {
  version: string;
  ultima_actualizacion: string;
  total_documentos: number;
  tutores: Record<string, any>;
  materias: Record<string, any>;
  entregas: Entrega[];
}

@Injectable({ providedIn: 'root' })
export class KnowledgeService {
  private kb: KnowledgeBase = {
    version: '1.0',
    ultima_actualizacion: new Date().toISOString().split('T')[0],
    total_documentos: 0,
    tutores: {},
    materias: {},
    entregas: []
  };

  constructor(private http: HttpClient) {
    this.cargarKnowledgeBase();
  }

  // ─── Cargar la KB al iniciar ───────────────────────────────
  private cargarKnowledgeBase() {
    this.http.get<KnowledgeBase>('assets/knowledge-base.json')
      .subscribe({
        next: (data) => { this.kb = data; },
        error: () => { console.log('KB nueva, iniciando vacía'); }
      });
  }

  // ─── Buscar contexto relevante para una nueva consulta ─────
  buscarContexto(materia: string, tutor: string): string {
    const entregasRelacionadas = this.kb.entregas.filter(e =>
      e.materia.toLowerCase().includes(materia.toLowerCase()) ||
      e.tutor.toLowerCase().includes(tutor.toLowerCase())
    ).slice(-5); // Últimas 5 más relevantes

    if (entregasRelacionadas.length === 0) {
      return 'No hay historial previo para esta materia/tutor.';
    }

    const infoTutor = this.kb.tutores[tutor];
    const infoMateria = this.kb.materias[materia];

    let contexto = `=== CONOCIMIENTO PREVIO DEL SISTEMA ===\n\n`;

    if (infoTutor) {
      contexto += `TUTOR: ${infoTutor.nombre}\n`;
      contexto += `- Estilo preferido: ${infoTutor.estilo_preferido}\n`;
      contexto += `- Errores a evitar: ${infoTutor.errores_comunes?.join(', ')}\n`;
      contexto += `- Calificación promedio lograda: ${infoTutor.calificacion_promedio}/100\n\n`;
    }

    if (infoMateria) {
      contexto += `MATERIA: ${infoMateria.nombre}\n`;
      contexto += `- Estructura típica: ${infoMateria.estructura_tipica}\n`;
      contexto += `- Extensión promedio: ${infoMateria.longitud_promedio_paginas} páginas\n\n`;
    }

    contexto += `ENTREGAS ANTERIORES SIMILARES:\n`;
    entregasRelacionadas.forEach(e => {
      contexto += `- Entrega #${e.numero_entrega}: ${e.resumen_ia}`;
      if (e.calificacion) contexto += ` (Nota: ${e.calificacion}/100)`;
      contexto += `\n`;
      if (e.aprendizajes?.length) {
        contexto += `  Aprendizajes: ${e.aprendizajes.join(' | ')}\n`;
      }
    });

    return contexto;
  }

  // ─── Guardar nueva entrega y actualizar KB ──────────────────
  async guardarEntrega(
    documento: File,
    materia: string,
    tutor: string,
    numeroEntrega: number,
    asesor: string,
    calificacion?: number
  ): Promise<void> {
    // 1. Extraer resumen con Claude
    const resumenData = await this.extraerResumenConIA(documento, materia, tutor);

    // 2. Crear objeto entrega
    const nuevaEntrega: Entrega = {
      id: `e${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      materia: materia.toLowerCase().replace(/ /g, '_'),
      tutor: tutor.toLowerCase().replace(/ /g, '_'),
      numero_entrega: numeroEntrega,
      asesor,
      calificacion,
      archivo: `uploads/${documento.name}`,
      resumen_ia: resumenData.resumen,
      aprendizajes: resumenData.aprendizajes
    };

    // 3. Agregar a la KB
    this.kb.entregas.push(nuevaEntrega);
    this.kb.total_documentos++;
    this.kb.ultima_actualizacion = nuevaEntrega.fecha;

    // 4. Actualizar perfil del tutor
    const tutorKey = nuevaEntrega.tutor;
    if (!this.kb.tutores[tutorKey]) {
      this.kb.tutores[tutorKey] = {
        nombre: tutor,
        estilo_preferido: resumenData.estilo_tutor || '',
        errores_comunes: [],
        calificacion_promedio: calificacion || 0,
        total_entregas: 1
      };
    } else {
      const t = this.kb.tutores[tutorKey];
      t.total_entregas++;
      if (calificacion) {
        t.calificacion_promedio = Math.round(
          ((t.calificacion_promedio * (t.total_entregas - 1)) + calificacion) / t.total_entregas
        );
      }
    }

    // 5. Actualizar perfil de la materia
    const materiaKey = nuevaEntrega.materia;
    if (!this.kb.materias[materiaKey]) {
      this.kb.materias[materiaKey] = {
        nombre: materia,
        estructura_tipica: resumenData.estructura || '',
        longitud_promedio_paginas: 0,
        total_entregas: 1
      };
    } else {
      this.kb.materias[materiaKey].total_entregas++;
    }

    // 6. Guardar KB actualizada
    await this.guardarKnowledgeBase();
    console.log(`✅ KB actualizada — total documentos: ${this.kb.total_documentos}`);
  }

  // ─── Extrae resumen usando Claude API ──────────────────────
  private async extraerResumenConIA(archivo: File, materia: string, tutor: string) {
    const base64 = await this.fileToBase64(archivo);
    const mediaType = archivo.type === 'application/pdf' ? 'application/pdf' : archivo.type;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: mediaType === 'application/pdf' ? 'document' : 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Analiza este documento académico para la materia "${materia}" con el tutor "${tutor}".
Responde SOLO en JSON con esta estructura:
{
  "resumen": "resumen en 2 oraciones de qué trata el trabajo",
  "aprendizajes": ["aprendizaje 1", "aprendizaje 2", "aprendizaje 3"],
  "estilo_tutor": "observación sobre el estilo o requisitos del tutor detectados",
  "estructura": "estructura del documento en orden"
}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    try {
      const texto = data.content[0].text;
      const clean = texto.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        resumen: 'Documento procesado sin resumen automático',
        aprendizajes: [],
        estilo_tutor: '',
        estructura: ''
      };
    }
  }

  // ─── Obtener todos los documentos para vista de historial ──
  obtenerHistorial(filtros?: { materia?: string; tutor?: string }): Entrega[] {
    let entregas = [...this.kb.entregas];
    if (filtros?.materia) {
      entregas = entregas.filter(e => e.materia.includes(filtros.materia!.toLowerCase()));
    }
    if (filtros?.tutor) {
      entregas = entregas.filter(e => e.tutor.includes(filtros.tutor!.toLowerCase()));
    }
    return entregas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  // ─── Stats para dashboard ───────────────────────────────────
  obtenerStats() {
    return {
      totalDocumentos: this.kb.total_documentos,
      totalTutores: Object.keys(this.kb.tutores).length,
      totalMaterias: Object.keys(this.kb.materias).length,
      ultimaActualizacion: this.kb.ultima_actualizacion
    };
  }

  // ─── Helpers ────────────────────────────────────────────────
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async guardarKnowledgeBase(): Promise<void> {
    // En producción: llamar a tu backend Node.js para escribir el JSON
    // Por ahora: guardar en localStorage como respaldo local
    localStorage.setItem('ml_knowledge_base', JSON.stringify(this.kb));
    console.log('KB guardada localmente');
    // TODO: POST a tu API: await this.http.post('/api/knowledge', this.kb).toPromise();
  }
}
```

---

## 🤖 Cómo usar el contexto en el agente académico

```typescript
// academic.agent.ts
async responderConsulta(
  pregunta: string,
  materia: string,
  tutor: string,
  documentoAdjunto?: File
) {
  // 1. Buscar qué sabe el sistema sobre esta materia/tutor
  const contexto = this.knowledgeService.buscarContexto(materia, tutor);

  // 2. Armar el system prompt con el conocimiento acumulado
  const systemPrompt = `
Eres el asistente académico de M&L Profesionales.
Tienes acceso al historial de trabajos anteriores de la plataforma.

${contexto}

Con base en este conocimiento, ayuda al asesor a entregar un trabajo
que cumpla con el estilo y requisitos del tutor "${tutor}" para la
materia "${materia}". Aplica todo lo aprendido de entregas anteriores.
  `.trim();

  // 3. Armar el contenido del mensaje
  const content: any[] = [];

  if (documentoAdjunto) {
    const base64 = await this.fileToBase64(documentoAdjunto);
    const tipo = documentoAdjunto.type === 'application/pdf' ? 'document' : 'image';
    content.push({
      type: tipo,
      source: { type: 'base64', media_type: documentoAdjunto.type, data: base64 }
    });
  }

  content.push({ type: 'text', text: pregunta });

  // 4. Llamar a Claude con el contexto inyectado
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,   // ← aquí vive todo el conocimiento previo
      messages: [{ role: 'user', content }]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}
```

---

## 👁️ Ver los documentos guardados — componente historial

```typescript
// historial.component.ts
export class HistorialComponent implements OnInit {
  entregas: Entrega[] = [];
  stats: any = {};

  filtroMateria = '';
  filtroTutor = '';

  constructor(private kb: KnowledgeService) {}

  ngOnInit() {
    this.cargar();
    this.stats = this.kb.obtenerStats();
  }

  cargar() {
    this.entregas = this.kb.obtenerHistorial({
      materia: this.filtroMateria || undefined,
      tutor: this.filtroTutor || undefined
    });
  }
}
```

```html
<!-- historial.component.html -->
<div class="stats">
  <span>📄 {{ stats.totalDocumentos }} documentos</span>
  <span>👤 {{ stats.totalTutores }} tutores</span>
  <span>📚 {{ stats.totalMaterias }} materias</span>
</div>

<div class="filtros">
  <input [(ngModel)]="filtroMateria" placeholder="Filtrar por materia"
         (input)="cargar()">
  <input [(ngModel)]="filtroTutor" placeholder="Filtrar por tutor"
         (input)="cargar()">
</div>

<div *ngFor="let e of entregas" class="entrega-card">
  <h4>Entrega #{{ e.numero_entrega }} — {{ e.materia }}</h4>
  <p><strong>Tutor:</strong> {{ e.tutor }}</p>
  <p><strong>Asesor:</strong> {{ e.asesor }}</p>
  <p><strong>Fecha:</strong> {{ e.fecha }}</p>
  <p *ngIf="e.calificacion"><strong>Nota:</strong> {{ e.calificacion }}/100</p>
  <p><strong>Resumen IA:</strong> {{ e.resumen_ia }}</p>
  <a [href]="e.archivo" target="_blank">Ver documento →</a>
</div>
```

---

## ✅ Checklist de implementación

- [ ] Crear `assets/knowledge-base.json` con la estructura base vacía
- [ ] Crear `KnowledgeService` e inyectarlo en el módulo principal
- [ ] En el formulario de subida: llamar a `guardarEntrega()` al guardar
- [ ] En el agente académico: llamar a `buscarContexto()` antes de cada respuesta
- [ ] Crear la vista de historial con `obtenerHistorial()`
- [ ] Agregar backend Node.js para persistir el JSON en disco (no solo localStorage)

---

## ⚠️ Importante — persistencia real

Por ahora el `guardarKnowledgeBase()` guarda en localStorage (respaldo local).
Para que persista entre sesiones de verdad, necesitas un endpoint en tu backend:

```typescript
// backend Node.js — api/knowledge.js
const fs = require('fs');
const path = require('path');
const KB_PATH = path.join(__dirname, '../src/assets/knowledge-base.json');

app.post('/api/knowledge', (req, res) => {
  fs.writeFileSync(KB_PATH, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.get('/api/knowledge', (req, res) => {
  const kb = JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
  res.json(kb);
});
```

---

*M&L Profesionales — Sistema de aprendizaje interno · 28 de abril de 2026*
