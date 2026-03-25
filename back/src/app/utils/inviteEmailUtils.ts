import crypto from "crypto";
import nodemailer from "nodemailer";

// Caracteres sem ambiguidade (sem I/L/O/0/1)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function generateInviteCode(length = 6): string {
    let code = "";
    for (let i = 0; i < length; i++) {
        code += CHARS[crypto.randomInt(CHARS.length)];
    }
    return code;
}

export function generateInviteToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

type SendInviteOpts = {
    professionalName: string;
    code: string;
    acceptUrl?: string;
    message?: string;
    expiresInDays?: number;
    appName?: string;
};

export const sendInviteEmail = async (email: string, opts: SendInviteOpts) => {
    const {
        professionalName,
        code,
        acceptUrl,
        message,
        expiresInDays = 7,
        appName = "Eleva",
    } = opts;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const preheader = `${professionalName} convidou você no ${appName}. Código: ${code}`;
    const textFallback =
        `${appName}\n\n` +
        `${professionalName} convidou você para ser seu aluno(a)!\n` +
        `Código do convite: ${code}\n` +
        (message ? `Mensagem: ${message}\n` : "") +
        `O convite expira em ${expiresInDays} dias.\n\n` +
        (acceptUrl ? `Aceitar convite: ${acceptUrl}\n\n` : "") +
        `Se você não conhece esta pessoa, ignore este e-mail.`;

    const html = buildInviteHtml({
        appName,
        professionalName,
        code,
        preheader,
        acceptUrl,
        message,
        expiresInDays,
    });

    await transporter.sendMail({
        from: `${appName} <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `${professionalName} convidou você no ${appName}`,
        text: textFallback,
        html,
        headers: { "X-Priority": "3", "X-Mailer": "Nodemailer" },
    });
};

function buildInviteHtml(opts: {
    appName: string;
    professionalName: string;
    code: string;
    preheader: string;
    acceptUrl?: string;
    message?: string;
    expiresInDays: number;
}) {
    const {
        appName,
        professionalName: rawName,
        code,
        preheader,
        acceptUrl,
        message: rawMessage,
        expiresInDays,
    } = opts;
    const professionalName = escapeHtml(rawName);
    const message = rawMessage ? escapeHtml(rawMessage) : undefined;

    const codeBoxes = code
        .split("")
        .map(
            (d) => `
      <span style="
        display:inline-block; width:48px; height:56px; line-height:56px;
        border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;
        font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        font-size:24px; font-weight:700; color:#111827; text-align:center;
        font-variant-numeric: tabular-nums; vertical-align:middle;
      ">${d}</span>
      <span style="display:inline-block; width:8px; height:1px; vertical-align:middle;"></span>`
        )
        .join("");

    const codeBlockHtml = `
    <div style="text-align:center; white-space:nowrap; font-size:0; line-height:0; margin:8px 0 0 0;">
      ${codeBoxes}
    </div>`;

    const messageHtml = message
        ? `<p style="margin:16px 0 0 0; padding:12px 16px; background:#f3f4f6; border-radius:8px;
                     font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                     font-size:14px; color:#374151; font-style:italic;">
             "${message}"
           </p>`
        : "";

    const safeAcceptUrl = acceptUrl && /^https?:\/\//i.test(acceptUrl) ? escapeHtml(acceptUrl) : undefined;

    const button = safeAcceptUrl
        ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px 0 0 0;">
      <tr>
        <td align="center" bgcolor="#111827" style="border-radius:8px;">
          <a href="${safeAcceptUrl}" target="_blank"
             style="display:inline-block; padding:12px 24px; text-decoration:none;
                    font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                    font-size:14px; font-weight:600; color:#ffffff;">
            Aceitar convite
          </a>
        </td>
      </tr>
    </table>`
        : "";

    return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${appName} – Convite</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .body-bg { background:#0b0f14 !important; }
        .card    { background:#0f172a !important; border-color:#1f2937 !important; }
        .title   { color:#e5e7eb !important; }
        .muted   { color:#9ca3af !important; }
      }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    </style>
  </head>
  <body class="body-bg" style="margin:0; padding:0; background:#f3f4f6;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:12px;">
                <div style="font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-weight:800; font-size:18px;">
                  ${appName}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 12px 24px 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                       class="card" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:14px;">
                  <tr>
                    <td style="padding:24px;">
                      <h1 class="title" style="margin:0 0 8px 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:22px; line-height:1.3; color:#0f172a;">
                        Você recebeu um convite!
                      </h1>
                      <p class="muted" style="margin:0 0 20px 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:14px; color:#6b7280;">
                        <strong>${professionalName}</strong> convidou você para ser seu aluno(a) no ${appName}. Use o código abaixo ou clique no botão para aceitar.
                      </p>
                      ${codeBlockHtml}
                      ${messageHtml}
                      ${button}
                      <p class="muted" style="margin:24px 0 0 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#9ca3af;">
                        Este convite expira em ${expiresInDays} dias. Se você não conhece esta pessoa, pode ignorar este e-mail.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 12px 24px 12px;">
                <p class="muted" style="margin:0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#9ca3af;">
                  &copy; ${new Date().getFullYear()} ${appName}. Todos os direitos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
