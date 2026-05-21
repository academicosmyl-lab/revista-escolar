// CAMBIO ARCH-UI: environment de desarrollo — apunta a localhost
// Uso: ng serve (usa este archivo automáticamente)
// ng build → usa environment.ts (producción → Railway)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};
