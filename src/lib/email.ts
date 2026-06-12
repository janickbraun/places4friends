/** Escapes special HTML characters to prevent injection in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(email: string, token: string, fullName?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not defined in environment variables.");
    throw new Error("E-Mail-Dienst ist nicht konfiguriert.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
    : "http://localhost:3000";

  const verificationUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  
  // Use onboarding@resend.dev as fallback sender if you haven't verified a custom domain on Resend
  const fromEmail = process.env.NEXT_PUBLIC_SITE_URL
    ? "places4friends <noreply@places4friends.com>"
    : "places4friends <onboarding@resend.dev>";

  const recipientName = escapeHtml(fullName || "Freund/in");
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>E-Mail-Adresse verifizieren</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #0f172a;
            padding: 32px;
            text-align: center;
          }
          .logo {
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px 32px;
            line-height: 1.6;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 15px;
            color: #475569;
            margin-bottom: 24px;
          }
          .btn-container {
            margin: 32px 0;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background-color: #15803d;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            box-shadow: 0 10px 15px -3px rgba(21, 128, 61, 0.1), 0 4px 6px -4px rgba(21, 128, 61, 0.1);
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px 32px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 13px;
            color: #94a3b8;
          }
          .footer a {
            color: #64748b;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">places4friends</div>
          </div>
          <div class="content">
            <h1>Hallo ${recipientName},</h1>
            <p>vielen Dank für deine Registrierung bei places4friends! Um dein Konto vollständig zu verifizieren, bestätige bitte deine E-Mail-Adresse durch Klick auf den folgenden Button.</p>
            <p>Du kannst die App in der Zwischenzeit bereits ganz normal nutzen.</p>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn">E-Mail-Adresse bestätigen</a>
            </div>
            <p>Falls der Button oben nicht funktioniert, kannst du auch den folgenden Link kopieren und in deinen Browser einfügen:</p>
            <p style="word-break: break-all; font-size: 13px; color: #64748b;">${verificationUrl}</p>
          </div>
          <div class="footer">
            Diese E-Mail wurde automatisch gesendet. Falls du dich nicht bei places4friends registriert hast, kannst du diese Nachricht ignorieren.
          </div>
        </div>
      </body>
    </html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "Bestätige deine E-Mail-Adresse - places4friends",
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Resend API error:", errorData);
    throw new Error(errorData.message || "Fehler beim Senden der Bestätigungs-E-Mail.");
  }

  return true;
}
