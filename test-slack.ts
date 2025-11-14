import 'dotenv/config';
import { notifyNewUserSignup, notifyNewSubscription, notifyNewApplication } from './server/services/slackNotifier';

async function testSlackNotifications() {
  console.log('🔍 Checking SLACK_WEBHOOK_URL:', process.env.SLACK_WEBHOOK_URL ? '✅ Found' : '❌ Not found');
  console.log('');
  console.log('🧪 Sending test Slack notifications...\n');

  // Test 1: New User Signup
  console.log('1️⃣ Sending test user signup notification...');
  await notifyNewUserSignup({
    name: 'Test User',
    email: 'test@flint.com',
    subscriptionTier: 'basic',
    signupTime: new Date(),
  });
  console.log('✅ User signup notification sent!\n');

  // Wait a second between messages
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: New Subscription
  console.log('2️⃣ Sending test subscription notification...');
  await notifyNewSubscription({
    name: 'Premium Customer',
    email: 'premium@flint.com',
    tier: 'pro',
    billingPeriod: 'monthly',
    amount: 29.99,
    subscriptionTime: new Date(),
  });
  console.log('✅ Subscription notification sent!\n');

  // Wait a second between messages
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: New Application
  console.log('3️⃣ Sending test application notification...');
  await notifyNewApplication({
    name: 'New Applicant',
    email: 'applicant@flint.com',
    accountCount: '5-10',
    connectType: 'Bank & Brokerage',
    submissionTime: new Date(),
  });
  console.log('✅ Application notification sent!\n');

  console.log('🎉 All test notifications sent successfully! Check your Slack channel.');
}

testSlackNotifications().catch(console.error);
