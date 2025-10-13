import { Resend } from 'resend';
import { db } from '../db';
import { emailLogs } from '@shared/schema';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const credentials = await getCredentials();
  
  // Use the verified subdomain: updates.flint-investing.com
  // Any address @updates.flint-investing.com will work
  const fromEmail = 'Flint <updates@updates.flint-investing.com>';
  
  return {
    client: new Resend(credentials.apiKey),
    fromEmail
  };
}

interface EmailLogData {
  recipient: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}

async function logEmail(data: EmailLogData): Promise<void> {
  try {
    await db.insert(emailLogs).values({
      recipient: data.recipient,
      subject: data.subject,
      template: data.template,
      status: data.status,
      error: data.error || null,
    });
  } catch (err) {
    console.error('Failed to log email to database:', err);
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  template: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    // Resend SDK returns { data, error } - check for errors
    if (result.error) {
      const errorMessage = result.error.message || 'Email delivery failed';
      console.error('❌ Failed to send email:', result.error);
      
      await logEmail({ 
        recipient: to, 
        subject, 
        template, 
        status: 'failed', 
        error: errorMessage 
      });
      
      return { success: false, error: errorMessage };
    }

    console.log('✅ Email sent successfully:', result.data);
    await logEmail({ recipient: to, subject, template, status: 'sent' });
    return { success: true };
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown error';
    console.error('❌ Failed to send email:', err);
    
    // Log error and queue for retry
    await logEmail({ 
      recipient: to, 
      subject, 
      template, 
      status: 'failed', 
      error: errorMessage 
    });
    
    return { success: false, error: errorMessage };
  }
}

function getApprovalEmailTemplate(firstName: string, passwordSetupLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Flint</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: #ffffff;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #4338CA;
          }
          .button-container {
            text-align: center;
          }
          .note {
            background-color: #F3F4F6;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .next-steps {
            background-color: #F9FAFB;
            padding: 20px;
            border-radius: 6px;
            margin-top: 20px;
          }
          .next-steps h3 {
            margin-top: 0;
            color: #4F46E5;
          }
          .next-steps ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .next-steps li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Flint</div>
            <h1>Welcome to Flint!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Great news! Your Flint account application has been approved. We're excited to have you join our community of savvy investors and financial enthusiasts.</p>
            
            <p>To get started, you'll need to set up your password and complete your account setup.</p>
            
            <div class="button-container">
              <a href="${passwordSetupLink}" class="button">Set Up Your Password</a>
            </div>
            
            <div class="note">
              <strong>⏰ Important:</strong> This link will expire in 24 hours for security purposes. If you don't complete the setup within this time, you'll need to request a new password reset link.
            </div>
            
            <div class="next-steps">
              <h3>Next Steps:</h3>
              <ul>
                <li><strong>Set your password</strong> using the button above</li>
                <li><strong>Connect your accounts</strong> - Link your bank accounts and brokerage accounts securely</li>
                <li><strong>Explore your dashboard</strong> - View all your financial accounts in one place</li>
                <li><strong>Set up alerts</strong> - Get notified about important portfolio changes</li>
                <li><strong>Start trading</strong> - Execute trades across your connected brokerage accounts</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help. Just reply to this email.</p>
            
            <p>Welcome aboard!</p>
            
            <p>Best regards,<br>
            The Flint Team</p>
          </div>
          
          <div class="footer">
            <p>If you didn't request a Flint account, please ignore this email.</p>
            <p><strong>Questions or need help?</strong> Email <a href="mailto:support@flint-investing.com" style="color: #4F46E5;">support@flint-investing.com</a></p>
            <p>© ${new Date().getFullYear()} Flint. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getRejectionEmailTemplate(firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flint Application Update</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .info-box {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Flint</div>
            <h1>Application Update</h1>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>Thank you for your interest in Flint. We appreciate the time you took to apply for an account.</p>
            
            <p>After careful review of your application, we're unable to approve your account at this time. This decision is based on our current eligibility requirements and capacity considerations.</p>
            
            <div class="info-box">
              <strong>What this means:</strong>
              <p style="margin: 10px 0 0 0;">Our review process considers various factors to ensure we can provide the best experience for all our users. While your application wasn't approved this time, we encourage you to reapply in the future as our platform and capacity evolve.</p>
            </div>
            
            <p>We're constantly working to improve and expand our services. If you have any questions about this decision or would like to provide additional information, please don't hesitate to reach out to our support team by replying to this email.</p>
            
            <p>We appreciate your understanding and interest in Flint.</p>
            
            <p>Best regards,<br>
            The Flint Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to you regarding your Flint account application.</p>
            <p><strong>Questions or need help?</strong> Email <a href="mailto:support@flint-investing.com" style="color: #4F46E5;">support@flint-investing.com</a></p>
            <p>© ${new Date().getFullYear()} Flint. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getPasswordResetEmailTemplate(firstName: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Flint Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background-color: #4F46E5;
            color: #ffffff;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #4338CA;
          }
          .button-container {
            text-align: center;
          }
          .warning {
            background-color: #FEE2E2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
          }
          .note {
            background-color: #F3F4F6;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Flint</div>
            <h1>Reset Your Password</h1>
          </div>
          
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <p>We received a request to reset the password for your Flint account. If you made this request, click the button below to set a new password:</p>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>
            
            <div class="note">
              <strong>⏰ Time Sensitive:</strong> This password reset link will expire in 24 hours for security purposes.
            </div>
            
            <div class="warning">
              <strong>⚠️ Didn't request a password reset?</strong>
              <p style="margin: 10px 0 0 0;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.</p>
            </div>
            
            <p style="margin-top: 30px;">For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Enabling two-factor authentication (if available)</li>
            </ul>
            
            <p>If you continue to have issues accessing your account or if you have any questions, please contact our support team by replying to this email.</p>
            
            <p>Best regards,<br>
            The Flint Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to you because a password reset was requested for your Flint account.</p>
            <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
            <p><strong>Questions or need help?</strong> Email <a href="mailto:support@flint-investing.com" style="color: #4F46E5;">support@flint-investing.com</a></p>
            <p>© ${new Date().getFullYear()} Flint. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getTestEmailTemplate(recipientName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flint Email Test</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .info-box {
            background-color: #DBEAFE;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            font-size: 14px;
            color: #6B7280;
            text-align: center;
          }
          .success {
            color: #059669;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Flint</div>
            <h1>✅ Email System Test</h1>
          </div>
          
          <div class="content">
            <p>Hi ${recipientName},</p>
            
            <p class="success">Your email system is working perfectly!</p>
            
            <p>This is a test email from the Flint platform to verify that:</p>
            
            <div class="info-box">
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Sending works:</strong> Emails are being delivered successfully</li>
                <li><strong>Custom domain:</strong> Sent from updates@updates.flint-investing.com</li>
                <li><strong>Support contact:</strong> Displayed in email footer (support@flint-investing.com)</li>
                <li><strong>Email templates:</strong> HTML formatting is rendering correctly</li>
              </ul>
            </div>
            
            <p>Check the email footer below for the support contact. Users can email support@flint-investing.com for any questions or help.</p>
            
            <p>All systems are operational and ready for production use!</p>
            
            <p>Best regards,<br>
            The Flint Development Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated test email from Flint.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
            <p><strong>Questions or need help?</strong> Email <a href="mailto:support@flint-investing.com" style="color: #4F46E5;">support@flint-investing.com</a></p>
            <p>© ${new Date().getFullYear()} Flint. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendApprovalEmail(
  email: string,
  firstName: string,
  passwordSetupLink: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Welcome to Flint - Set Up Your Account';
  const html = getApprovalEmailTemplate(firstName, passwordSetupLink);
  
  console.log(`Sending approval email to ${email}`);
  return await sendEmail(email, subject, html, 'approval');
}

export async function sendRejectionEmail(
  email: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Flint Account Application Update';
  const html = getRejectionEmailTemplate(firstName);
  
  console.log(`Sending rejection email to ${email}`);
  return await sendEmail(email, subject, html, 'rejection');
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> {
  const subject = 'Reset Your Flint Password';
  const html = getPasswordResetEmailTemplate(firstName, resetLink);
  
  console.log(`Sending password reset email to ${email}`);
  return await sendEmail(email, subject, html, 'password_reset');
}

export async function sendTestEmail(
  email: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const subject = '✅ Flint Email System Test';
  const html = getTestEmailTemplate(recipientName);
  
  console.log(`Sending test email to ${email}`);
  return await sendEmail(email, subject, html, 'test');
}

export const emailService = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendPasswordResetEmail,
  sendTestEmail,
};
