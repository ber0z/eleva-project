import nodemailer from "nodemailer";

type SendOpts = {
  appName?: string;
  logoUrl?: string;        // opcional: URL de um logo hospedado em HTTPS
  verifyUrl?: string;      // opcional: link para a tela de verificação do seu app
  expiresInMinutes?: number;
};

export const sendRecoveryEmail = async (
  email: string,
  recoveryCode: string,
  opts: SendOpts = {}
) => {
  const {
    appName = "Eleva",
    verifyUrl,
    expiresInMinutes = 5,
  } = opts;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // se usa 2FA no Gmail, precisa de App Password
    },
  });

  const preheader = `Seu código é ${recoveryCode} (expira em ${expiresInMinutes} min)`;
  const textFallback =
    `${appName}\n\n` +
    `Aqui está o seu código de verificação: ${recoveryCode}\n` +
    `Ele expira em ${expiresInMinutes} minutos.\n\n` +
    (verifyUrl ? `Verifique aqui: ${verifyUrl}\n\n` : "") +
    `Se você não solicitou, ignore este e-mail.`;

  const html = buildHtml({
    appName,
    recoveryCode,
    preheader,
    verifyUrl,
    expiresInMinutes,
  });

  const mailOptions = {
    from: `${appName} <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Seu código de verificação",
    text: textFallback,
    html,
    headers: {
      "X-Priority": "3",
      "X-Mailer": "Nodemailer",
    },
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch {
    throw new Error("Erro ao enviar e-mail");
  }
};

// -------- template HTML bonito e compatível com clientes de e-mail --------
function buildHtml({
  appName,
  recoveryCode,
  preheader,
  verifyUrl,
  expiresInMinutes,
  _logoUrl, // opcional, apenas para compatibilidade (não usado)
}: {
  appName: string;
  recoveryCode: string;
  preheader: string;
  verifyUrl?: string;
  expiresInMinutes: number;
  _logoUrl?: string; // <- mantém a propriedade sem uso
}) {
  // spans inline (sem tabela) para centralizar e copiar sem quebras
  const codeBoxes = recoveryCode
    .split("")
    .map(
      (d) => `
      <span style="
        display:inline-block; width:48px; height:56px; line-height:56px;
        border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;
        font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        font-size:24px; font-weight:700; color:#111827; text-align:center;
        font-variant-numeric: tabular-nums; vertical-align:middle;
        -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
        mso-line-height-rule:exactly;
      ">${d}</span>
      <span style="display:inline-block; width:12px; height:1px; vertical-align:middle;"></span>`
    )
    .join("");

  const codeBlockHtml = `
    <div style="text-align:center; white-space:nowrap; font-size:0; line-height:0; margin:8px 0 0 0;">
      ${codeBoxes}
  `;

  const button = verifyUrl
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px 0 0 0;">
      <tr>
        <td align="center" bgcolor="#111827" style="border-radius:8px;">
          <a href="${verifyUrl}" target="_blank"
             style="display:inline-block; padding:12px 20px; text-decoration:none;
                    font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                    font-size:14px; font-weight:600; color:#ffffff;">
            Inserir código
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
    <title>${appName} – Código de verificação</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .body-bg { background:#0b0f14 !important; }
        .card    { background:#0f172a !important; border-color:#1f2937 !important; }
        .title   { color:#e5e7eb !important; }
        .muted   { color:#9ca3af !important; }
        .btn     { background:#e5e7eb !important; color:#0b0f14 !important; }
      }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      img { border:0; outline:none; text-decoration:none; }
      table { border-collapse:collapse; }
    </style>
  </head>
  <body class="body-bg" style="margin:0; padding:0; background:#f3f4f6;">
    <!-- Preheader invisível -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${preheader}</div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:12px;">
                <div style="font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                            font-weight:800; font-size:18px;">
                  ${appName}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 12px 24px 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                       class="card"
                       style="background:#ffffff; border:1px solid #e5e7eb; border-radius:14px;">
                  <tr>
                    <td style="padding:24px;">
                      <h1 class="title" style="margin:0 0 8px 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:22px; line-height:1.3; color:#0f172a;">
                        Código de recuperação de senha
                      </h1>
                      <p class="muted" style="margin:0 0 20px 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:14px; color:#6b7280;">
                        Use o código abaixo para concluir sua verificação. Ele expira em ${expiresInMinutes} minutos.
                      </p>

                      ${codeBlockHtml}
                      ${button}

                      <p class="muted" style="margin:24px 0 0 0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#9ca3af;">
                        Se você não solicitou este código, pode ignorar este e-mail.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:8px 12px 24px 12px;">
                <p class="muted" style="margin:0; font-family:ui-sans-serif, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size:12px; color:#9ca3af;">
                  © ${new Date().getFullYear()} ${appName}. Todos os direitos reservados.
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
