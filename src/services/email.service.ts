/**
 * Email Service using Resend (https://resend.com)
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

export class EmailService {
  static async sendRegistrationEmail(email: string, password: string, name: string) {
    if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_123')) {
      console.warn('EmailService: Resend API Key is missing or default. Skipping email dispatch.');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Society Prabandh <onboarding@resend.dev>',
          to: [email],
          subject: 'Welcome to your Society Portal!',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
              <h2 style="color: #2563eb;">Welcome, ${name}!</h2>
              <p style="color: #374151;">Your account has been created by your society administrator.</p>
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px; text-transform: uppercase; font-weight: bold;">Your Login Details</p>
                <p style="margin: 10px 0 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
              </div>

              <p style="color: #4b5563; font-size: 14px;">
                You can also log in directly via Google using your email address.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af;">
                  Please change your temporary password upon your first login.
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('EmailService: Failed to send email:', error);
      } else {
        console.log('EmailService: Registration email sent successfully to', email);
      }
    } catch (error) {
      console.error('EmailService: Network error while sending email:', error);
    }
  }
}
