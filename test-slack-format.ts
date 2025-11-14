import 'dotenv/config';

async function testSlackFormat() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('❌ SLACK_WEBHOOK_URL not found');
    return;
  }

  console.log('🧪 Testing Slack emoji shortcodes...\n');

  // Test with Slack emoji shortcodes instead of Unicode
  const testMessage = {
    text: ':tada: *Test with Slack Emojis* :rocket::rocket::rocket:',
    attachments: [
      {
        color: '#f2c744',
        text: '_Ka-ching! Time to update the revenue dashboard_ :moneybag:\n\nFlint to the moon ! :rocket::rocket::rocket:',
        fields: [
          {
            title: 'Customer Name',
            value: 'Test Customer',
            short: true,
          },
          {
            title: 'Plan',
            value: 'Pro (Monthly)',
            short: true,
          }
        ],
        footer: 'Flint Investment Platform',
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error:', response.status, errorText);
    } else {
      console.log('✅ Slack shortcode test sent! Check your Slack.');
    }
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testSlackFormat();
