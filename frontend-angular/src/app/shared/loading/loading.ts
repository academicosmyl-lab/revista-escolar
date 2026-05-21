// CAMBIO ARCH-UI: componente compartido de carga
// Uso: <app-loading [mensaje]="'Cargando noticias...'" />
// Evita repetir el mismo spinner en cada página de la app
import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [],
  template: `
    <div class="loading-wrap" role="status" [attr.aria-label]="mensaje()">
      <div class="loading-spinner"></div>
      @if (mensaje()) {
        <p class="loading-texto">{{ mensaje() }}</p>
      }
    </div>
  `,
  styles: [`
    .loading-wrap {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 3rem 1rem; gap: 1rem;
    }
    .loading-spinner {
      width: 40px; height: 40px;
      border: 3px solid #EEF2F7;
      border-top-color: #A94455;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-texto {
      font-family: 'Source Sans 3', sans-serif;
      font-size: 0.85rem; color: #888; text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loading {
  // input() es la nueva API de Angular 17+ para @Input — más segura con signals
  mensaje = input('Cargando...');
}
