import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { PerfilDocente, Sede } from '../../models';

@Component({
  selector: 'app-docentes',
  imports: [FormsModule],
  templateUrl: './docentes.html',
  styleUrl: './docentes.scss',
})
export class Docentes implements OnInit {
  private api = inject(ApiService);

  cargando  = true;
  error     = '';
  skeletons = Array(8);

  docentes: PerfilDocente[] = [];
  sedes:    Sede[]          = [];

  busqueda    = '';
  sedeActiva: string | null = null;

  ngOnInit() {
    this.cargarSedes();
    this.cargarDocentes();
  }

  private cargarSedes() {
    this.api.get<any>('/sedes').subscribe({
      next:  r => { this.sedes = r.data ?? (Array.isArray(r) ? r : []); },
      error: () => {},
    });
  }

  cargarDocentes() {
    this.cargando = true;
    this.error    = '';

    const params: Record<string, string | number> = {};
    if (this.sedeActiva) params['sedeId'] = this.sedeActiva;

    this.api.get<any>('/perfil/docentes', params).subscribe({
      next: r => {
        const data = r.data ?? r;
        this.docentes = Array.isArray(data) ? data : (data.rows ?? data.docentes ?? []);
        this.cargando = false;
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar el directorio de docentes.';
        this.cargando = false;
      },
    });
  }

  filtrarSede(id: string | null) {
    this.sedeActiva = id;
    this.cargarDocentes();
  }

  get docentesFiltrados(): PerfilDocente[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.docentes;
    return this.docentes.filter(d =>
      d.usuario.nombre.toLowerCase().includes(q) ||
      d.cargo?.toLowerCase().includes(q) ||
      d.areas?.some(a => a.toLowerCase().includes(q))
    );
  }

  inicial(nombre: string): string { return nombre.charAt(0).toUpperCase(); }

  onFotoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const wrap = img.closest('.doc-card-foto-wrap');
    if (wrap) {
      const div = document.createElement('div');
      div.className = 'doc-card-inicial';
      div.textContent = this.inicial(img.alt);
      wrap.appendChild(div);
    }
  }

  sedeNombres(d: PerfilDocente): string {
    return d.sedes?.map(s => s.nombre).join(' · ') ?? '';
  }
}
