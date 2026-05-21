// CAMBIO ARCH-UI: componente compartido para mensajes de error
// Uso: <app-error-banner [mensaje]="error()" (reintentar)="cargar()" />
// Evita repetir el mismo bloque de error en cada página
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [],
  template: `
    <div class="error-banner" role="alert">
      <p class="error-texto">{{ mensaje() }}</p>
      <button class="error-btn" (click)="reintentar.emit()">
        Reintentar
      </button>
    </div>
  `,
  styles: [`
    .error-banner {
      background: #fff0f0; border: 1px solid #f5c0c0;
      padding: 1.25rem 1.5rem; margin: 1.5rem 0;
      display: flex; align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 1rem;
    }
    .error-texto {
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.9rem; color: #A94455; margin: 0;
    }
    .error-btn {
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.78rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
      background: #A94455; color: white;
      border: none; padding: 8px 20px; cursor: pointer;
      transition: background 0.2s;
      &:hover { background: #8a3344; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBanner {
  // input() = leer datos del padre. output() = enviar eventos al padre.
  mensaje    = input('Ocurrió un error.');
  reintentar = output<void>(); // el padre escucha con (reintentar)="metodo()"
}
