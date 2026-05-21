# ❌ Sistema de Aprendizaje de Errores — M&L Profesionales
> El agente aprende de cada error y nunca lo vuelve a repetir.
> Creado: 28 de abril de 2026

---

## Principio fundamental

> Cada error reportado (nota baja, comentario del tutor, corrección del asesor)
> se convierte en una regla permanente que el agente aplica en todas las
> entregas futuras de ese tutor y esa materia.

---

## 📄 error-patterns.json — estructura

```json
{
  "version": "1.0",
  "total_errores": 0,
  "patrones": [
    {
      "id": "err001",
      "fecha_detectado": "2026-04-15",
      "materia": "estadistica",
      "tutor": "maria_garcia",
      "numero_entrega_origen": 2,
      "tipo": "formato",
      "gravedad": "alta",
      "descripcion": "Citas directas de más de 2 líneas",
      "impacto_nota": -10,
      "regla": "NUNCA usar citas directas de más de 2 líneas con este tutor",
      "veces_repetido": 1,
      "resuelto": false
    }
  ],
  "tipos_error": ["formato", "contenido", "estilo_tutor", "estructura", "ortografia", "normas"]
}
```

---

## 🛠️ error-learning.service.ts

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ErrorPatron {
  id: string;
  fecha_detectado: string;
  materia: string;
  tutor: string;
  numero_entrega_origen: number;
  tipo: 'formato' | 'contenido' | 'estilo_tutor' | 'estructura' | 'ortografia' | 'normas';
  gravedad: 'baja' | 'media' | 'alta' | 'critica';
  descripcion: string;
  impacto_nota: number;
  regla: string;
  veces_repetido: number;
  resuelto: boolean;
}

interface ErrorPatterns {
  version: string;
  total_errores: number;
  patrones: ErrorPatron[];
}

@Injectable({ providedIn: 'root' })
export class ErrorLearningService {

  private ep: ErrorPatterns = {
    version: '1.0',
    total_errores: 0,
    patrones: []
  };

  constructor(private http: HttpClient) {
    this.cargar();
  }

  private cargar() {
    this.http.get<ErrorPatterns>('assets/error-patterns.json')
      .subscribe({
        next: (data) => { this.ep = data; },
        error: () => { console.log('Sin errores previos aún'); }
      });
  }

  // ─── Registrar un error nuevo ────────────────────────────────
  async registrarError(params: {
    materia: string;
    tutor: string;
    numeroEntrega: number;
    descripcionError: string;
    impactoNota?: number;
    documentoConFeedback?: File;
  }): Promise<ErrorPatron> {

    // 1. Clasificar el error con IA
    const clasificacion = await this.clasificarErrorConIA(
      params.descripcionError,
      params.materia,
      params.tutor,
      params.documentoConFeedback
    );

    // 2. Verificar si ya existe un patrón similar (no duplicar)
    const patronExistente = this.buscarPatronSimilar(
      params.materia,
      params.tutor,
      clasificacion.tipo,
      clasificacion.regla
    );

    if (patronExistente) {
      // Solo aumentar el contador de repeticiones
      patronExistente.veces_repetido++;
      if (params.impactoNota && Math.abs(params.impactoNota) > Math.abs(patronExistente.impacto_nota)) {
        patronExistente.impacto_nota = params.impactoNota;
        patronExistente.gravedad = clasificacion.gravedad;
      }
      await this.guardar();
      console.log(`⚠️ Error ya conocido — repetición #${patronExistente.veces_repetido}`);
      return patronExistente;
    }

    // 3. Crear nuevo patrón de error
    const nuevoError: ErrorPatron = {
      id: `err${Date.now()}`,
      fecha_detectado: new Date().toISOString().split('T')[0],
      materia: params.materia.toLowerCase().replace(/ /g, '_'),
      tutor: params.tutor.toLowerCase().replace(/ /g, '_'),
      numero_entrega_origen: params.numeroEntrega,
      tipo: clasificacion.tipo,
      gravedad: clasificacion.gravedad,
      descripcion: params.descripcionError,
      impacto_nota: params.impactoNota || 0,
      regla: clasificacion.regla,
      veces_repetido: 1,
      resuelto: false
    };

    this.ep.patrones.push(nuevoError);
    this.ep.total_errores++;
    await this.guardar();

    console.log(`✅ Nuevo error aprendido: ${nuevoError.regla}`);
    return nuevoError;
  }

  // ─── Obtener reglas de errores para inyectar al agente ──────
  obtenerReglasParaAgente(materia: string, tutor: string): string {
    const tutorKey = tutor.toLowerCase().replace(/ /g, '_');
    const materiaKey = materia.toLowerCase().replace(/ /g, '_');

    // Buscar errores de este tutor/materia + errores globales frecuentes
    const erroresRelevantes = this.ep.patrones.filter(e =>
      !e.resuelto && (
        (e.tutor === tutorKey) ||
        (e.materia === materiaKey) ||
        (e.veces_repetido >= 3) // errores que pasan en muchos tutores
      )
    ).sort((a, b) => {
      // Ordenar: primero los más graves y más repetidos
      const gravedadPeso: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
      const diff = gravedadPeso[b.gravedad] - gravedadPeso[a.gravedad];
      return diff !== 0 ? diff : b.veces_repetido - a.veces_repetido;
    }).slice(0, 10); // máximo 10 reglas por llamada

    if (erroresRelevantes.length === 0) return '';

    let reglas = `\n=== ERRORES APRENDIDOS — NO REPETIR ===\n`;
    reglas += `Estos errores causaron penalizaciones en entregas anteriores:\n\n`;

    const porTipo: Record<string, ErrorPatron[]> = {};
    erroresRelevantes.forEach(e => {
      if (!porTipo[e.tipo]) porTipo[e.tipo] = [];
      porTipo[e.tipo].push(e);
    });

    for (const [tipo, errores] of Object.entries(porTipo)) {
      reglas += `[${tipo.toUpperCase()}]\n`;
      errores.forEach(e => {
        reglas += `× ${e.regla}`;
        if (e.impacto_nota < 0) reglas += ` (penalización: ${e.impacto_nota} pts)`;
        if (e.veces_repetido > 1) reglas += ` ← ocurrió ${e.veces_repetido} veces`;
        reglas += `\n`;
      });
      reglas += `\n`;
    }

    reglas += `IMPORTANTE: Antes de generar cualquier contenido, verifica que no incurres en ninguno de estos errores.\n`;

    return reglas;
  }

  // ─── Marcar un error como resuelto ──────────────────────────
  async marcarResuelto(errorId: string): Promise<void> {
    const error = this.ep.patrones.find(e => e.id === errorId);
    if (error) {
      error.resuelto = true;
      await this.guardar();
      console.log(`✅ Error ${errorId} marcado como resuelto`);
    }
  }

  // ─── Stats de errores para dashboard ────────────────────────
  obtenerStats() {
    const activos = this.ep.patrones.filter(e => !e.resuelto);
    const porTipo: Record<string, number> = {};
    const porGravedad: Record<string, number> = {};

    activos.forEach(e => {
      porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
      porGravedad[e.gravedad] = (porGravedad[e.gravedad] || 0) + 1;
    });

    return {
      total: this.ep.total_errores,
      activos: activos.length,
      resueltos: this.ep.patrones.filter(e => e.resuelto).length,
      masRepetido: activos.sort((a, b) => b.veces_repetido - a.veces_repetido)[0] || null,
      porTipo,
      porGravedad
    };
  }

  obtenerTodos(soloActivos = true): ErrorPatron[] {
    return soloActivos
      ? this.ep.patrones.filter(e => !e.resuelto)
      : this.ep.patrones;
  }

  // ─── Clasificar error usando IA ──────────────────────────────
  private async clasificarErrorConIA(
    descripcion: string,
    materia: string,
    tutor: string,
    documento?: File
  ) {
    const content: any[] = [];

    if (documento) {
      const base64 = await this.fileToBase64(documento);
      const tipo = documento.type === 'application/pdf' ? 'document' : 'image';
      content.push({ type: tipo, source: { type: 'base64', media_type: documento.type, data: base64 } });
    }

    content.push({
      type: 'text',
      text: `Clasifica este error académico para la materia "${materia}" con el tutor "${tutor}".

Error reportado: "${descripcion}"

Responde SOLO en JSON:
{
  "tipo": "formato|contenido|estilo_tutor|estructura|ortografia|normas",
  "gravedad": "baja|media|alta|critica",
  "regla": "regla clara en imperativo negativo: NUNCA / NO hacer X porque Y",
  "causa_raiz": "por qué ocurrió este error"
}`
    });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content }]
        })
      });
      const data = await response.json();
      const texto = data.content[0].text.replace(/```json|```/g, '').trim();
      return JSON.parse(texto);
    } catch {
      return {
        tipo: 'contenido',
        gravedad: 'media',
        regla: `EVITAR: ${descripcion}`,
        causa_raiz: 'No clasificado automáticamente'
      };
    }
  }

  // ─── Buscar si ya existe un patrón similar ───────────────────
  private buscarPatronSimilar(
    materia: string,
    tutor: string,
    tipo: string,
    regla: string
  ): ErrorPatron | undefined {
    const tutorKey = tutor.toLowerCase().replace(/ /g, '_');
    const materiaKey = materia.toLowerCase().replace(/ /g, '_');
    const reglaLower = regla.toLowerCase();

    return this.ep.patrones.find(e =>
      e.tutor === tutorKey &&
      e.materia === materiaKey &&
      e.tipo === tipo &&
      !e.resuelto &&
      (
        e.regla.toLowerCase().includes(reglaLower.slice(0, 30)) ||
        reglaLower.includes(e.regla.toLowerCase().slice(0, 30))
      )
    );
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async guardar(): Promise<void> {
    localStorage.setItem('ml_error_patterns', JSON.stringify(this.ep));
    // TODO: POST a tu backend: await this.http.post('/api/errors', this.ep).toPromise();
  }
}
```

---

## 🔌 Integrar con el agente académico

En `academic.agent.ts`, combinar el contexto de conocimiento + las reglas de errores:

```typescript
async responderConsulta(pregunta: string, materia: string, tutor: string) {

  // 1. Contexto de lo que funciona bien
  const contextoPositivo = this.knowledgeService.buscarContexto(materia, tutor);

  // 2. Reglas de lo que NO se debe hacer ← NUEVO
  const reglasErrores = this.errorLearningService.obtenerReglasParaAgente(materia, tutor);

  // 3. System prompt combinado
  const systemPrompt = `
Eres el asistente académico de M&L Profesionales.

${contextoPositivo}

${reglasErrores}

Aplica todo el conocimiento anterior. Los errores listados causaron
penalizaciones reales — es OBLIGATORIO evitarlos en esta entrega.
  `.trim();

  // 4. Llamada a la API con todo el aprendizaje inyectado
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: pregunta }]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}
```

---

## 📋 Formulario para registrar un error

```html
<!-- registrar-error.component.html -->
<form (ngSubmit)="guardarError()">

  <select [(ngModel)]="materia" name="materia">
    <option value="">Seleccionar materia</option>
    <option *ngFor="let m of materias" [value]="m">{{ m }}</option>
  </select>

  <select [(ngModel)]="tutor" name="tutor">
    <option value="">Seleccionar tutor</option>
    <option *ngFor="let t of tutores" [value]="t">{{ t }}</option>
  </select>

  <input type="number" [(ngModel)]="numeroEntrega" name="entrega"
         placeholder="Número de entrega">

  <textarea [(ngModel)]="descripcionError" name="error"
            placeholder="Describe el error que penalizó la nota..."
            rows="3"></textarea>

  <input type="number" [(ngModel)]="impactoNota" name="impacto"
         placeholder="Puntos descontados (ej: -10)" max="0">

  <input type="file" accept=".pdf,image/*" (change)="onFile($event)">
  <small>Opcional: sube el documento con los comentarios del tutor</small>

  <button type="submit">Guardar error — el sistema aprenderá</button>
</form>
```

```typescript
// registrar-error.component.ts
async guardarError() {
  await this.errorLearningService.registrarError({
    materia: this.materia,
    tutor: this.tutor,
    numeroEntrega: this.numeroEntrega,
    descripcionError: this.descripcionError,
    impactoNota: this.impactoNota,
    documentoConFeedback: this.archivo
  });
  alert('✅ Error guardado. El sistema no lo volverá a cometer.');
}
```

---

## 👁️ Vista de errores aprendidos

```html
<!-- errores-aprendidos.component.html -->
<div class="stats-errores">
  <span>Total aprendidos: {{ stats.total }}</span>
  <span class="activos">Activos: {{ stats.activos }}</span>
  <span class="resueltos">Resueltos: {{ stats.resueltos }}</span>
</div>

<div *ngFor="let e of errores" class="error-card"
     [class.critico]="e.gravedad === 'critica'"
     [class.alto]="e.gravedad === 'alta'">

  <div class="error-header">
    <span class="badge">{{ e.tipo }}</span>
    <span class="badge gravedad-{{ e.gravedad }}">{{ e.gravedad }}</span>
    <span *ngIf="e.veces_repetido > 1" class="badge repetido">
      ⚠ repetido {{ e.veces_repetido }}x
    </span>
  </div>

  <p class="regla">{{ e.regla }}</p>
  <p class="meta">
    {{ e.materia }} · {{ e.tutor }} · Entrega #{{ e.numero_entrega_origen }}
    <span *ngIf="e.impacto_nota">· {{ e.impacto_nota }} pts</span>
  </p>

  <button (click)="marcarResuelto(e.id)">Marcar como resuelto</button>
</div>
```

---

## ✅ Checklist de implementación

- [ ] Crear `assets/error-patterns.json` vacío con la estructura base
- [ ] Crear `ErrorLearningService` e inyectarlo en el módulo principal
- [ ] Agregar formulario "Registrar error" en la vista de cada entrega
- [ ] En `academic.agent.ts`: combinar `buscarContexto()` + `obtenerReglasParaAgente()`
- [ ] Crear vista "Errores aprendidos" en el panel de administración
- [ ] Agregar backend Node.js para persistir `error-patterns.json` en disco

---

## 💡 Ejemplo real de lo que el agente verá

Cuando un asesor vaya a trabajar un nuevo encargo de Estadística con la tutora María García, el agente recibirá automáticamente:

```
=== ERRORES APRENDIDOS — NO REPETIR ===

[FORMATO]
× NUNCA usar citas directas de más de 2 líneas con este tutor (penalización: -10 pts) ← ocurrió 3 veces
× NO omitir la página de referencias al final del documento (penalización: -5 pts)

[ESTRUCTURA]
× NUNCA entregar conclusión menor a 3 párrafos — fue motivo de nota baja en entrega #2 (penalización: -8 pts)
× NO mezclar el marco teórico con la metodología en la misma sección

[ESTILO_TUTOR]
× EVITAR párrafos de más de 8 líneas — el tutor los señala como "densos" ← ocurrió 2 veces
```

El agente leerá esto antes de escribir una sola palabra.

---

*M&L Profesionales — Memoria de errores · 28 de abril de 2026*
