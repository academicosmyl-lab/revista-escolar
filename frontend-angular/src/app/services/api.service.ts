import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const TIMEOUT_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => httpParams = httpParams.set(k, String(v)));
    }
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams }).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  postFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, formData).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  putFormData<T>(path: string, formData: FormData): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, formData).pipe(
      timeout(TIMEOUT_MS), catchError(this.manejarError)
    );
  }

  private manejarError(error: any) {
    if (error?.name === 'TimeoutError') {
      return throwError(() => ({ status: 0, mensaje: 'El servidor tardó demasiado. Intenta de nuevo en unos segundos.' }));
    }
    const msg = error?.error?.mensaje || error?.error?.error || 'Error de conexión con el servidor';
    return throwError(() => ({ status: error.status, mensaje: msg }));
  }
}
