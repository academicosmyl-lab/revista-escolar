/* ── Roles ──────────────────────────────────────────────── */
export type Rol = 'ADMIN' | 'RECTOR' | 'COORDINADOR' | 'ORIENTADORA' | 'DOCENTE' | 'PERSONAL';

/* ── Auth ───────────────────────────────────────────────── */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAuth;
}

export interface UsuarioAuth {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  sedeId?: number;
}

/* ── Sedes ──────────────────────────────────────────────── */
export interface Sede {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string;
  imagenUrl?: string;
}

/* ── Categorías ─────────────────────────────────────────── */
export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  color?: string;
  sedeId?: number;
}

/* ── Noticias ───────────────────────────────────────────── */
export type EstadoNoticia = 'pendiente' | 'publicada' | 'rechazada';

export interface Noticia {
  id: number;
  titulo: string;
  contenido: string;
  resumen?: string;
  estado: EstadoNoticia;
  visitas: number;
  fechaPublicacion?: string;
  createdAt: string;
  autor?: UsuarioAuth;
  categoria?: Categoria;
  sede?: Sede;
  imagenes?: Imagen[];
}

export interface NoticiaCreate {
  titulo: string;
  contenido: string;
  categoriaId?: number;
  sedeId?: number;
}

/* ── Imágenes ───────────────────────────────────────────── */
export interface Imagen {
  id: number;
  url: string;
  altText?: string;
  score?: number;
  tipo?: string;
  publicId?: string;
}

/* ── Docentes / Perfiles ────────────────────────────────── */
export interface PerfilDocente {
  id: number;
  usuario: UsuarioAuth;
  bio?: string;
  cargo?: string;
  fotoUrl?: string;
  areas?: string[];
  sedes?: Sede[];
}

/* ── Estadísticas ───────────────────────────────────────── */
export interface Estadisticas {
  totalNoticias: number;
  noticiasPendientes: number;
  noticiasPublicadas: number;
  totalDocentes: number;
  totalImagenes: number;
  visitasTotales: number;
  visitasMes?: number;
}

/* ── Paginación ─────────────────────────────────────────── */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ── API Response estándar ──────────────────────────────── */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  mensaje?: string;
  error?: string;
}
