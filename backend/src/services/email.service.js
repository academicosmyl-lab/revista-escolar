/**
 * services/email.service.js
 * Notificaciones por email usando Resend (HTTP API — funciona en Render free tier)
 */
const { Resend } = require('resend');

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const EMAIL_CONFIGURADO = !!RESEND_API_KEY;
const resend = EMAIL_CONFIGURADO ? new Resend(RESEND_API_KEY) : null;

const FROM     = process.env.EMAIL_FROM    || 'Instituto Técnico Industrial <onboarding@resend.dev>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || null;
const FRONTEND = process.env.FRONTEND_URL   || 'https://www.institutotecnicoindustrial.com.co';

// ── Plantilla HTML base ───────────────────────────────────
function plantillaBase(contenido) {
  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #A94455; color: #fff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 28px; color: #374151; line-height: 1.6; }
  .btn { display: inline-block; background: #A94455; color: #fff !important; padding: 12px 28px;
         border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
  .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9CA3AF; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .badge-pendiente { background: #FEF3C7; color: #92400E; }
  .badge-aprobada  { background: #D1FAE5; color: #065F46; }
  .badge-rechazada { background: #FEE2E2; color: #991B1B; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>Instituto Técnico Industrial</h1>
    <p>Revista Digital Institucional</p>
  </div>
  <div class="body">${contenido}</div>
  <div class="footer">
    Este es un mensaje automático de la Revista Digital del Instituto Técnico Industrial.<br>
    Por favor no responda a este correo.
  </div>
</div></body></html>`;
}

async function enviar({ to, subject, html }) {
  if (!EMAIL_CONFIGURADO) {
    console.warn('⚠️  Resend no configurado — RESEND_API_KEY faltante');
    return;
  }
  const payload = { from: FROM, to, subject, html };
  if (REPLY_TO) payload.reply_to = REPLY_TO;
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || JSON.stringify(error));
  console.log(`📧 Email enviado a ${to} — id: ${data?.id}`);
}

const emailService = {

  async noticiaPendiente({ adminEmail, docenteNombre, noticiaId, noticiaTitulo, sedeName }) {
    try {
      await enviar({
        to: adminEmail,
        subject: `[Revista ITI] Nueva noticia pendiente de aprobación`,
        html: plantillaBase(`
          <h2>Hay una noticia esperando tu revisión</h2>
          <p>El docente <strong>${docenteNombre}</strong> de la sede <strong>${sedeName}</strong>
          ha subido una nueva noticia y está esperando tu aprobación.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-pendiente">Pendiente de revisión</span><br><br>
          <a href="${FRONTEND}/admin/noticias/${noticiaId}" class="btn">Revisar noticia</a>
        `),
      });
    } catch (err) { console.error('noticiaPendiente:', err.message); }
  },

  async noticiaAprobada({ docenteEmail, docenteNombre, noticiaId, noticiaTitulo }) {
    try {
      await enviar({
        to: docenteEmail,
        subject: `[Revista ITI] Tu noticia fue publicada`,
        html: plantillaBase(`
          <h2>¡Tu noticia fue aprobada!</h2>
          <p>Hola <strong>${docenteNombre}</strong>, tu noticia ha sido revisada y publicada.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-aprobada">Publicada</span><br><br>
          <a href="${FRONTEND}/noticias/${noticiaId}" class="btn">Ver noticia publicada</a>
        `),
      });
    } catch (err) { console.error('noticiaAprobada:', err.message); }
  },

  async noticiaRechazada({ docenteEmail, docenteNombre, noticiaTitulo, motivo }) {
    try {
      await enviar({
        to: docenteEmail,
        subject: `[Revista ITI] Tu noticia necesita correcciones`,
        html: plantillaBase(`
          <h2>Tu noticia necesita ajustes</h2>
          <p>Hola <strong>${docenteNombre}</strong>, la siguiente noticia requiere correcciones.</p>
          <p><strong>Título:</strong> ${noticiaTitulo}</p>
          <span class="badge badge-rechazada">Requiere correcciones</span><br><br>
          <p><strong>Motivo:</strong></p>
          <blockquote style="border-left:4px solid #E5E7EB;padding:12px 16px;background:#F9FAFB;border-radius:4px;margin:0;">
            ${motivo}
          </blockquote><br>
          <a href="${FRONTEND}/panel/noticias" class="btn">Ir a mi panel</a>
        `),
      });
    } catch (err) { console.error('noticiaRechazada:', err.message); }
  },

  async bienvenida({ email, nombre, password, rol }) {
    try {
      await enviar({
        to: email,
        subject: `[Revista ITI] Bienvenido a la plataforma`,
        html: plantillaBase(`
          <h2>¡Bienvenido al Instituto Técnico Industrial!</h2>
          <p>Hola <strong>${nombre}</strong>, tu cuenta ha sido creada exitosamente.</p>
          <p><strong>Rol:</strong> ${rol}<br>
          <strong>Correo:</strong> ${email}<br>
          <strong>Contraseña temporal:</strong>
          <code style="background:#F3F4F6;padding:3px 8px;border-radius:4px;font-family:monospace;">${password}</code></p>
          <p style="color:#DC2626;font-size:13px;">Por seguridad, cambia tu contraseña al iniciar sesión por primera vez.</p>
          <a href="${FRONTEND}/login" class="btn">Ingresar a la plataforma</a>
        `),
      });
    } catch (err) { console.error('bienvenida:', err.message); }
  },

  async solicitudPerfilPendiente({ adminEmail, docenteNombre, docenteArea }) {
    try {
      await enviar({
        to: adminEmail,
        subject: `[Revista ITI] Nuevo perfil docente pendiente de revisión`,
        html: plantillaBase(`
          <h2>Nueva solicitud de perfil docente</h2>
          <p><strong>${docenteNombre}</strong> ha enviado su perfil para publicarse.</p>
          <p><strong>Área:</strong> ${docenteArea || 'Sin especificar'}</p>
          <span class="badge badge-pendiente">Pendiente de revisión</span><br><br>
          <a href="${FRONTEND}/super-admin" class="btn">Revisar en el panel</a>
        `),
      });
    } catch (err) { console.error('solicitudPerfilPendiente:', err.message); }
  },

  async perfilAprobado({ docenteEmail, docenteNombre, motivo, passwordTemp }) {
    try {
      await enviar({
        to: docenteEmail,
        subject: `[Revista ITI] Tu perfil fue publicado`,
        html: plantillaBase(`
          <h2>¡Tu perfil ya está publicado!</h2>
          <p>Hola <strong>${docenteNombre}</strong>, tu perfil fue aprobado y publicado
          en el directorio de docentes del Instituto Técnico Industrial.</p>
          <span class="badge badge-aprobada">Perfil publicado</span><br><br>
          ${motivo ? `<p><strong>Nota del administrador:</strong> ${motivo}</p>` : ''}
          ${passwordTemp ? `
            <p><strong>Tu cuenta de acceso:</strong><br>
            Email: ${docenteEmail}<br>
            Contraseña temporal: <code style="background:#F3F4F6;padding:3px 8px;border-radius:4px;font-family:monospace;">${passwordTemp}</code><br>
            <span style="color:#DC2626;font-size:13px;">Cámbiala al iniciar sesión por primera vez.</span></p>` : ''}
          <a href="${FRONTEND}/docentes" class="btn">Ver directorio de docentes</a>
        `),
      });
    } catch (err) { console.error('perfilAprobado:', err.message); }
  },

  async perfilRechazado({ docenteEmail, docenteNombre, motivo }) {
    try {
      await enviar({
        to: docenteEmail,
        subject: `[Revista ITI] Tu perfil necesita ajustes`,
        html: plantillaBase(`
          <h2>Tu perfil necesita algunas correcciones</h2>
          <p>Hola <strong>${docenteNombre}</strong>, tu solicitud de perfil requiere ajustes.</p>
          <span class="badge badge-rechazada">Requiere correcciones</span><br><br>
          <p><strong>Motivo:</strong></p>
          <blockquote style="border-left:4px solid #A94455;padding:12px 16px;background:#fff5f7;border-radius:4px;margin:0;">
            ${motivo}
          </blockquote><br>
          <a href="${FRONTEND}/docentes/registro" class="btn">Actualizar y reenviar mi perfil</a>
        `),
      });
    } catch (err) { console.error('perfilRechazado:', err.message); }
  },

  async recuperarContrasena({ email, nombre, token }) {
    const link = `${FRONTEND}/nueva-contrasena?token=${token}`;
    try {
      await enviar({
        to: email,
        subject: `[Revista ITI] Recuperación de contraseña`,
        html: plantillaBase(`
          <h2>Recupera el acceso a tu cuenta</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña en la Revista Digital ITI.</p>
          <p>Haz clic en el botón para crear tu nueva contraseña:</p>
          <a href="${link}" class="btn">Crear nueva contraseña</a>
          <p style="font-size:12px;color:#9CA3AF;margin-top:16px;">
            Enlace válido por <strong>48 horas</strong>. Si no solicitaste este cambio, ignora este correo.<br><br>
            Si el botón no funciona copia este enlace: <span style="color:#A94455;">${link}</span>
          </p>
        `),
      });
    } catch (err) { console.error('recuperarContrasena:', err.message); throw err; }
  },

  async verificar() {
    if (!EMAIL_CONFIGURADO) return { ok: false, error: 'RESEND_API_KEY no configurado' };
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: 'delivered@resend.dev',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, mensaje: 'Resend configurado correctamente' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

module.exports = { emailService };
