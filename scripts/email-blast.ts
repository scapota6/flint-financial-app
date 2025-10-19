import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface Contact {
  firstName: string;
  email: string;
}

// Resend client setup
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
  const fromEmail = 'Flint Support <updates@updates.flint-investing.com>';
  
  return {
    client: new Resend(credentials.apiKey),
    fromEmail
  };
}

// Email template matching the screenshot
function getWaitlistEmailTemplate(firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flint is Live!</title>
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
          a {
            color: #4F46E5;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <p>${firstName},</p>
            
            <p>We're excited to finally share this <strong>Flint is live!</strong> 🎉</p>
            
            <p>Thank you for being part of our early waitlist and believing in what we're building. Your early support means everything to us.</p>
            
            <p>Flint's goal has always been simple: <strong>make it effortless to see all your investments in one place</strong>: stocks, crypto, banks, everything. Not only that, but you can also <strong>execute trades and transfer money</strong> all from the same platform. We're just getting started, and we can't wait to keep improving with your feedback.</p>
            
            <p><strong>Try it out for free here:</strong> <a href="https://www.flint-investing.com/">https://www.flint-investing.com/</a></p>
            
            <p>Thank you again for being part of the first group to experience Flint. The future of the platform is bright, and we're so grateful you're with us from day one.</p>
            
            <p>With appreciation,<br>
            The Flint Team</p>
          </div>
          
          <div class="footer">
            <p><strong>Questions or need help?</strong> Email <a href="mailto:support@flint-investing.com">support@flint-investing.com</a></p>
            <p>© ${new Date().getFullYear()} Flint. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Read and parse CSV
function readContacts(csvPath: string): Contact[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  const contacts: Contact[] = [];
  
  for (const record of records) {
    const firstName = (record as any)['First Name']?.trim();
    const email = (record as any)['Email']?.trim();
    
    if (firstName && email) {
      contacts.push({ firstName, email });
    }
  }
  
  return contacts;
}

// Send email with retry logic
async function sendEmail(
  client: Resend,
  fromEmail: string,
  contact: Contact
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: [contact.email],
      replyTo: 'support@flint-investing.com',
      subject: 'youre off the waitlist - Flint',
      html: getWaitlistEmailTemplate(contact.firstName),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

// Add delay between emails to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  console.log('🚀 Flint Waitlist Email Blast\n');

  // Read CSV
  const csvPath = path.join(process.cwd(), 'attached_assets', 'apollo-contacts-export_1760916491011.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
  }

  const contacts = readContacts(csvPath);
  console.log(`📋 Found ${contacts.length} contacts\n`);

  // Show preview
  console.log('📧 Email Preview:');
  console.log('---');
  console.log('Subject: youre off the waitlist - Flint');
  console.log('From: Flint Support <updates@updates.flint-investing.com>');
  console.log('Reply-To: support@flint-investing.com');
  console.log('---');
  console.log('Sample email body for first contact:');
  console.log(contacts[0]?.firstName + ',');
  console.log('\nWe\'re excited to finally share this Flint is live! 🎉');
  console.log('\nThank you for being part of our early waitlist...');
  console.log('\nLink: https://www.flint-investing.com/');
  console.log('---\n');

  // Show contact list
  console.log('👥 Recipients:');
  contacts.forEach((contact, i) => {
    console.log(`  ${i + 1}. ${contact.firstName} <${contact.email}>`);
  });
  console.log('');

  // Confirmation prompt (skip if --yes flag is provided)
  const autoConfirm = process.argv.includes('--yes');
  
  let confirmed = autoConfirm;
  
  if (!autoConfirm) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    confirmed = await new Promise<boolean>((resolve) => {
      readline.question(`⚠️  Are you sure you want to send ${contacts.length} emails? (yes/no): `, (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
  } else {
    console.log('⚡ Auto-confirmed via --yes flag\n');
  }

  if (!confirmed) {
    console.log('❌ Cancelled. No emails were sent.');
    process.exit(0);
  }

  // Get Resend client
  console.log('\n🔐 Authenticating with Resend...');
  const { client, fromEmail } = await getResendClient();
  console.log('✅ Authenticated\n');

  // Send emails
  console.log('📨 Sending emails...\n');
  
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ contact: Contact; error: string }>
  };

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const progress = `[${i + 1}/${contacts.length}]`;
    
    process.stdout.write(`${progress} Sending to ${contact.firstName} <${contact.email}>...`);
    
    const result = await sendEmail(client, fromEmail, contact);
    
    if (result.success) {
      console.log(' ✅ Sent');
      results.sent++;
    } else {
      console.log(` ❌ Failed: ${result.error}`);
      results.failed++;
      results.errors.push({ contact, error: result.error || 'Unknown error' });
    }
    
    // Rate limiting: wait 500ms between emails
    if (i < contacts.length - 1) {
      await delay(500);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  ✅ Sent: ${results.sent}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed emails:');
    results.errors.forEach(({ contact, error }) => {
      console.log(`  - ${contact.firstName} <${contact.email}>: ${error}`);
    });
  }

  console.log('\n✨ Email blast complete!');
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
