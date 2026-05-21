/**
 * services/email.service.js
 * Notificaciones por email usando Gmail SMTP (completamente gratis)
 * Flujos: noticia pendiente → admin/rector · noticia aprobada → docente · bienvenida → nuevo usuario
 */
const nodemailer = require('nodemailer');

// Crear transportador Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,  // contraseña de aplicación Gmail
  },
});

const FROM = process.env.EMAIL_FROM || 'Instituto Técnico Industrial Santander <noreply@itssantander.edu.co>';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:4200';

// ── Plantilla HTML base ───────────────────────────────────
function plantillaBase(contenido) {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #1E40AF; color: #fff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 28px; color: #374151; line-height: 1.6; }
  .btn { display: inline-block; background: #1E40AF; color: #fff; padding: 12px 28px;
         border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
  .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9CA3AF; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .badge-pendiente { background: #FEF3C7; color: #92400E; }
  .badge-aprobada  { background: #D1FAE5; color: #065F46; }
  .badge-rechazada { background: #FEE2E2; color: #991B1B; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>Instituto Técnico Industrial Santander</h1>
    <p>Revista Digital Institucional</p>
  </div>
  <div class="body">${contenido}</div>
  <div class="footer">
    Este es un mensaje automático de la Revista Digital del Instituto Técnico Industrial Santander.<br>
    Por favor no responda a este correo.
  </div>
</div></body></html>`;
}

const emailService = {

  /**
   * Notificar al admin/rector que hay una noticia pendiente de revisión
   */
  async noticiaPendiente({ adminEmail, docenteNombre, noticiaId, noticiaTitulo, sedeName }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: adminEmail,
        subject: `[Revista ITS] Nueva noticia pendiente de aprobación`,
        html: plantillaBase(`
          <h2>Hay una noticia esperando tu revisión</h2>
          <p>El docente <strong>${docenteNombre}</strong> de la sede <strong>${sedeName}</strong>
          ha subido una nueva noticia y está esperando tu aprobación.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-pendiente">Pendiente de revisión</span>
          <br><br>
          <a href="${FRONTEND}/admin/noticias/${noticiaId}" class="btn">Revisar noticia</a>
          <p style="font-size:13px;color:#6B7280;">Si no puedes hacer clic en el botón, copia esta URL en tu navegador:<br>
          ${FRONTEND}/admin/noticias/${noticiaId}</p>
        `),
      });
      console.log(`📧 Email enviado a admin: noticia pendiente "${noticiaTitulo}"`);
    } catch (err) {
      console.error('Error enviando email noticiaPendiente:', err.message);
    }
  },

  /**
   * Notificar al docente que su noticia fue aprobada
   */
  async noticiaAprobada({ docenteEmail, docenteNombre, noticiaId, noticiaTitulo }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: docenteEmail,
        subject: `[Revista ITS] Tu noticia fue publicada`,
        html: plantillaBase(`
          <h2>¡Tu noticia fue aprobada!</h2>
          <p>Hola <strong>${docenteNombre}</strong>, nos complace informarte que tu noticia
          ha sido revisada y publicada en la Revista Digital del Instituto.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-aprobada">Publicada</span>
          <br><br>
          <a href="${FRONTEND}/noticias/${noticiaId}" class="btn">Ver noticia publicada</a>
        `),
      });
      console.log(`📧 Email enviado a docente: noticia aprobada "${noticiaTitulo}"`);
    } catch (err) {
      console.error('Error enviando email noticiaAprobada:', err.message);
    }
  },

  /**
   * Notificar al docente que su noticia fue rechazada con motivo
   */
  async noticiaRechazada({ docenteEmail, docenteNombre, noticiaTitulo, motivo }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: docenteEmail,
        subject: `[Revista ITS] Tu noticia necesita correcciones`,
        html: plantillaBase(`
          <h2>Tu noticia necesita ajustes</h2>
          <p>Hola <strong>${docenteNombre}</strong>, la siguiente noticia fue revisada
          y requiere algunas correcciones antes de publicarse.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-rechazada">Requiere correcciones</span>
          <br><br>
          <p><strong>Motivo del administrador:</strong></p>
          <blockquote style="border-left:4px solid #E5E7EB;padding:12px 16px;
            background:#F9FAFB;border-radius:4px;margin:0;color:#374151;">
            ${motivo}
          </blockquote>
          <br>
          <a href="${FRONTEND}/panel/noticias" class="btn">Ir a mi panel</a>
          <p style="font-size:13px;color:#6B7280;">Puedes editar y volver a enviar la noticia desde tu panel.</p>
        `),
      });
      console.log(`📧 Email enviado a docente: noticia rechazada "${noticiaTitulo}"`);
    } catch (err) {
      console.error('Error enviando email noticiaRechazada:', err.message);
    }
  },

  /**
   * Email de bienvenida para nuevo usuario
   */
  async bienvenida({ email, nombre, password, rol }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: email,
        subject: `[Revista ITS] Bienvenido a la plataforma`,
        html: plantillaBase(`
          <h2>Bienvenido al Instituto Técnico Industrial Santander</h2>
          <p>Hola <strong>${nombre}</strong>, tu cuenta ha sido creada exitosamente.</p>
          <p><strong>Rol:</strong> ${rol}<br>
          <strong>Correo:</strong> ${email}<br>
          <strong>Contraseña temporal:</strong> <code style="background:#F3F4F6;padding:3px 8px;
            border-radius:4px;font-family:monospace;">${password}</code></p>
          <p style="color:#DC2626;font-size:13px;">Por seguridad, cambia tu contraseña al iniciar sesión por primera vez.</p>
          <a href="${FRONTEND}/login" class="btn">Ingresar a la plataforma</a>
        `),
      });
      console.log(`📧 Email bienvenida enviado a: ${email}`);
    } catch (err) {
      console.error('Error enviando email bienvenida:', err.message);
    }
  },

  /**
   * Notificar al super-admin que llegó una solicitud de perfil
   */
  async solicitudPerfilPendiente({ adminEmail, docenteNombre, docenteArea, solicitudId }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: adminEmail,
        subject: `[ITS] Nuevo perfil docente pendiente de revisión`,
        html: plantillaBase(`
          <h2>Nueva solicitud de perfil docente</h2>
          <p><strong>${docenteNombre}</strong> ha enviado su perfil para publicarse
          en el directorio de docentes de la institución.</p>
          <p><strong>Área:</strong> ${docenteArea || 'Sin especificar'}</p>
          <span class="badge badge-pendiente">Pendiente de revisión</span>
          <br><br>
          <a href="${FRONTEND}/super-admin" class="btn">Revisar en el panel de administración</a>
          <p style="font-size:13px;color:#6B7280;">
            Inicia sesión en el panel para aprobar o rechazar el perfil con un motivo.
          </p>
        `),
      });
      console.log(`📧 Email enviado a admin: solicitud de perfil de "${docenteNombre}"`);
    } catch (err) {
      console.error('Error enviando email solicitudPerfilPendiente:', err.message);
    }
  },

  /**
   * Notificar al docente que su perfil fue aprobado
   */
  async perfilAprobado({ docenteEmail, docenteNombre, motivo, passwordTemp }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: docenteEmail,
        subject: `[ITS] Tu perfil fue publicado en la página del instituto`,
        html: plantillaBase(`
          <h2>¡Tu perfil ya está publicado!</h2>
          <p>Hola <strong>${docenteNombre}</strong>, el equipo directivo revisó tu perfil
          y ha sido aprobado y publicado en el directorio de docentes del
          Instituto Técnico Industrial Santander.</p>
          <span class="badge badge-aprobada">Perfil publicado</span>
          <br><br>
          ${motivo ? `<p><strong>Nota del administrador:</strong> ${motivo}</p>` : ''}
          ${passwordTemp ? `
            <p><strong>Tu cuenta de acceso al panel:</strong><br>
            Email: ${docenteEmail}<br>
            Contraseña temporal: <code style="background:#F3F4F6;padding:3px 8px;
              border-radius:4px;font-family:monospace;">${passwordTemp}</code><br>
            <span style="color:#DC2626;font-size:13px;">
              Por seguridad, cámbiala al iniciar sesión por primera vez.
            </span></p>` : ''}
          <a href="${FRONTEND}/docentes" class="btn">Ver directorio de docentes</a>
        `),
      });
      console.log(`📧 Email enviado a docente: perfil aprobado "${docenteNombre}"`);
    } catch (err) {
      console.error('Error enviando email perfilAprobado:', err.message);
    }
  },

  /**
   * Notificar al docente que su perfil fue rechazado con motivo
   */
  async perfilRechazado({ docenteEmail, docenteNombre, motivo }) {
    try {
      await transporter.sendMail({
        from: FROM,
        to: docenteEmail,
        subject: `[ITS] Tu perfil necesita ajustes antes de publicarse`,
        html: plantillaBase(`
          <h2>Tu perfil necesita algunas correcciones</h2>
          <p>Hola <strong>${docenteNombre}</strong>, el equipo directivo revisó tu
          solicitud de perfil y encontró algunos puntos que necesitan ajuste
          antes de publicarse.</p>
          <span class="badge badge-rechazada">Requiere correcciones</span>
          <br><br>
          <p><strong>Motivo indicado por el administrador:</strong></p>
          <blockquote style="border-left:4px solid #A94455;padding:12px 16px;
            background:#fff5f7;border-radius:4px;margin:0;color:#374151;">
            ${motivo}
          </blockquote>
          <br>
          <a href="${FRONTEND}/docentes/registro" class="btn">Actualizar y reenviar mi perfil</a>
          <p style="font-size:13px;color:#6B7280;">
            Puedes volver a llenar el formulario con los ajustes indicados.
            Tu nueva solicitud llegará de inmediato al administrador.
          </p>
        `),
      });
      console.log(`📧 Email enviado a docente: perfil rechazado "${docenteNombre}"`);
    } catch (err) {
      console.error('Error enviando email perfilRechazado:', err.message);
    }
  },

  /**
   * Verificar que el servicio de email está configurado
   */
  async verificar() {
    try {
      await transporter.verify();
      return { ok: true, mensaje: 'Email configurado correctamente' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

module.exports = { emailService };
