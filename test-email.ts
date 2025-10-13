import { emailService } from './server/services/email';

async function testEmail() {
  console.log('🧪 Testing email delivery to CEO...\n');
  
  const result = await emailService.sendTestEmail(
    'scapota@flint-investing.com',
    'CEO'
  );
  
  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log('📧 Recipient: scapota@flint-investing.com');
    console.log('📤 From: Flint <updates@flint-investing.com>');
    console.log('↩️  Reply-to: support@flint-investing.com');
    console.log('\nPlease check the inbox and verify:');
    console.log('1. Email was received');
    console.log('2. Reply-to is set to support@flint-investing.com');
  } else {
    console.log('❌ Failed to send test email');
    console.log('Error:', result.error);
  }
}

testEmail().catch(console.error);
