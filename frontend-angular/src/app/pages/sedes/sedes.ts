import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Sede } from '../../models';

@Component({
  selector: 'app-sedes',
  imports: [],
  templateUrl: './sedes.html',
  styleUrl: './sedes.scss',
})
export class Sedes implements OnInit {
  private api = inject(ApiService);

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
        this.sedes = Array.isArray(data) ? data : (data.rows ?? data.sedes ?? []);
        this.cargando = false;
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar la información de sedes.';
        this.cargando = false;
      },
    });
  }

  get sedePrincipal(): Sede | null { return this.sedes[0] ?? null; }
  get sedesSecundarias(): Sede[]   { return this.sedes.slice(1); }
}
