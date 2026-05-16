import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Sede } from '../../models';

@Component({
  selector: 'app-sedes',
  imports: [],
  templateUrl: './sedes.html',
  styleUrl: './sedes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sedes implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  cargando = true;
  error    = '';
  sedes:   Sede[] = [];

  ngOnInit() { this.cargar(); }

  private cargar() {
    this.cargando = true;
    this.error    = '';

    this.api.get<any>('/sedes').subscribe({
      next: r => {
        const data = r.data ?? r;
        const raw: any[] = Array.isArray(data) ? data : (data.rows ?? data.sedes ?? []);
        this.sedes = raw.map((s: any) => ({
          ...s,
          imagenUrl: s.imagen_portada ?? s.imagenUrl,
        }));
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar la información de sedes.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  get sedePrincipal(): Sede | null { return this.sedes[0] ?? null; }
  get sedesSecundarias(): Sede[]   { return this.sedes.slice(1); }
}
