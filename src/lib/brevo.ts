const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@placetrack.edu';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'VNRVJIET Training & Placement Cell';

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailOptions): Promise<boolean> {
  if (!BREVO_API_KEY || BREVO_API_KEY.trim() === '') {
    console.log('\n================ Brevo Email (Dev Mode) ================');
    console.log(`To: ${to}`);
    console.log(`Sender Name: ${BREVO_SENDER_NAME}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML Preview:\n${htmlContent}`);
    console.log('=========================================================\n');
    return true;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Brevo API email sending failed:', response.status, errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error calling Brevo API:', error);
    return false;
  }
}

export interface EmailTemplateParams {
  headerTitle: string;
  badgeText?: string;
  title: string;
  messageHtml: string;
  ctaText: string;
  ctaLink: string;
  ctaColor?: string;
  warningNote: string;
  baseUrl?: string;
}

function renderEmailTemplate({
  badgeText = 'TRAINING & PLACEMENT CELL',
  title,
  messageHtml,
  ctaText,
  ctaLink,
  ctaColor = '#1e3a8a',
  warningNote,
  baseUrl,
}: EmailTemplateParams): string {
  const appUrl = (baseUrl && baseUrl.trim()) ? baseUrl.replace(/\/$/, '') : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const logoUrl = `${appUrl}/vnrvjiet-full-logo.png`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08);">
              
              <!-- TOP BRANDING HEADER -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 28px 30px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto; background: #ffffff; padding: 8px 16px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <tr>
                      <td>
                        <img src="${logoUrl}" alt="VNRVJIET Logo" style="max-height: 48px; width: auto; display: block;" />
                      </td>
                    </tr>
                  </table>
                  <div style="color: #ffffff; font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-top: 14px; text-transform: uppercase;">
                    STUDENT PERFORMANCE
                  </div>
                  <div style="color: #fbbf24; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">
                    Training & Placement • ${badgeText}
                  </div>
                </td>
              </tr>

              <!-- CARD BODY CONTENT -->
              <tr>
                <td style="padding: 36px 32px; background-color: #ffffff;">
                  <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 800; margin-top: 0; margin-bottom: 16px; line-height: 1.3; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${title}
                  </h2>
                  <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 28px;">
                    ${messageHtml}
                  </div>

                  <!-- CTA BUTTON -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${ctaLink}" target="_blank" style="background-color: ${ctaColor}; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
                      ${ctaText}
                    </a>
                  </div>

                  <!-- COPY-PASTE LINK FALLBACK -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-top: 28px; word-break: break-all;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 600;">Or copy and paste this link into your browser:</p>
                    <a href="${ctaLink}" style="color: #1e3a8a; font-size: 12px; text-decoration: underline; font-weight: 600;">${ctaLink}</a>
                  </div>

                  <!-- WARNING NOTE -->
                  <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: left;">
                    <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                      🔒 <strong>Security Notice:</strong> ${warningNote}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #1e3a8a;">
                    Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering & Technology
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #64748b;">
                    Training & Placement Cell • Bachupally, Nizampet Road, Hyderabad, Telangana 500090
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 10px; color: #94a3b8;">
                    © ${new Date().getFullYear()} Student Performance & Placement Portal. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send Student Registration Email Verification
 */
export async function sendVerificationEmail(email: string, token: string, baseUrl?: string): Promise<boolean> {
  const appUrl = (baseUrl && baseUrl.trim()) ? baseUrl.replace(/\/$/, '') : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const verifyLink = `${appUrl}/verify-email?token=${token}`;

  const htmlContent = renderEmailTemplate({
    headerTitle: 'Verify Your Email Address',
    badgeText: 'STUDENT REGISTRATION VERIFICATION',
    title: 'Verify Your Primary Email Address',
    messageHtml: `
      <p style="margin-top: 0;">Thank you for setting up your primary email on <strong>Student Performance — Training & Placement Portal</strong>.</p>
      <p>Please click the button below to verify your email address and authorize your student account:</p>
    `,
    ctaText: 'Verify Email Address',
    ctaLink: verifyLink,
    ctaColor: '#1e3a8a',
    warningNote: 'This verification link expires in 24 hours. If you did not register or request an account setup, please ignore this email.',
    baseUrl: appUrl,
  });

  return sendEmail({
    to: email,
    subject: 'VNRVJIET Student Performance — Verify Your Email Address',
    htmlContent,
  });
}

/**
 * Send Password Reset Token Email
 */
export async function sendPasswordResetEmail(email: string, token: string, baseUrl?: string): Promise<boolean> {
  const appUrl = (baseUrl && baseUrl.trim()) ? baseUrl.replace(/\/$/, '') : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  const htmlContent = renderEmailTemplate({
    headerTitle: 'Password Reset Request',
    badgeText: 'SECURITY & ACCOUNT ACCESS',
    title: 'Account Password Reset Request',
    messageHtml: `
      <p style="margin-top: 0;">We received a password reset request for your <strong>Student Performance — Training & Placement Portal</strong> account registered under <strong>${email}</strong>.</p>
      <p>Click the button below to choose a new password for your account:</p>
    `,
    ctaText: 'Reset Password',
    ctaLink: resetLink,
    ctaColor: '#1e3a8a',
    warningNote: 'This one-time reset link expires in 1 hour. If you did not request a password reset, your account is safe and no action is required.',
    baseUrl: appUrl,
  });

  return sendEmail({
    to: email,
    subject: 'VNRVJIET Student Performance — Password Reset Request',
    htmlContent,
  });
}
