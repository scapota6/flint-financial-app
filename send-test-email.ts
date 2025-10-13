import { emailService } from './server/services/email';

async function sendTestEmail() {
  console.log('📧 Sending test email to scapota@flint-investing.com...\n');
  
  const result = await emailService.sendTestEmail(
    'scapota@flint-investing.com',
    'CEO'
  );
  
  if (result.success) {
    console.log('✅ SUCCESS! Test email delivered');
    console.log('\n📬 Email Details:');
    console.log('  To: scapota@flint-investing.com');
    console.log('  From: Flint <updates@flint-investing.com>');
    console.log('  Reply-To: support@flint-investing.com');
    console.log('\n✉️  Please check your inbox and verify:');
    console.log('  1. Email was received');
    console.log('  2. Reply-to address is support@flint-investing.com');
    console.log('  3. Try replying to confirm it goes to support email');
  } else {
    console.log('❌ FAILED to send email');
    console.log('Error:', result.error);
  }
}

sendTestEmail().catch(console.error).finally(() => process.exit(0));
