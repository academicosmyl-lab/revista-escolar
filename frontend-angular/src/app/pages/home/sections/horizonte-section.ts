// CAMBIO ARCH-UI: sección Horizonte Institucional extraída de home.ts
// Por qué: esta sección es 100% estática (Misión/Visión no cambian).
// Un componente "tonto" (sin @Input/@Output complejos) es perfecto para esto:
// reduce home.html en ~40 líneas y hace el código más fácil de mantener.
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-horizonte-section',
  standalone: true,
  imports: [],
  templateUrl: './horizonte-section.html',
  styleUrl: './horizonte-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush, // nunca cambia → OnPush ahorra re-renders
})
export class HorizonteSection {}
