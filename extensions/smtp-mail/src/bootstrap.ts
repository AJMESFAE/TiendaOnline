import { registerEmailService } from '@evershop/evershop/lib/mail/emailHelper';
import { info, warning } from '@evershop/evershop/lib/log';
import nodemailer from 'nodemailer';

/**
 * Servicio de email por SMTP (Microsoft 365, Azure Communication Services,
 * Gmail/Workspace, etc.). Se configura solo con variables de entorno:
 *
 *   SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (false = STARTTLS),
 *   SMTP_USER, SMTP_PASSWORD, MAIL_FROM ("Instituto Al-Bayān <tienda@...>")
 *
 * Sin SMTP_HOST no se registra ningún servicio y EverShop omite los emails.
 */
export default () => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    warning('SMTP_HOST no definido: los emails de la tienda no se enviarán.');
    return;
  }
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: ['1', 'true', 'yes'].includes(
      String(process.env.SMTP_SECURE || (port === 465 ? 'true' : 'false')).toLowerCase()
    ),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
      : undefined
  });
  const defaultFrom = process.env.MAIL_FROM || process.env.SMTP_USER;

  registerEmailService({
    sendEmail: async ({ from, to, subject, body, cc, bcc }) => {
      await transporter.sendMail({
        from: from || defaultFrom,
        to,
        cc: cc as string[] | undefined,
        bcc: bcc as string[] | undefined,
        subject,
        html: body
      });
      info(`Email enviado a ${to}: ${subject}`);
    }
  });
};
