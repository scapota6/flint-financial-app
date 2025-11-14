import 'dotenv/config';

async function testEmojis() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('❌ SLACK_WEBHOOK_URL not found');
    return;
  }

  console.log('🧪 Testing emoji rendering in Slack...\n');

  // Test simple message with emojis
  const testMessage = {
    text: '🎉 Test Message with Emojis 🚀🚀🚀',
    attachments: [
      {
        color: '#36a64f',
        text: 'Testing emojis: 💰 💸 📋 🎊 🤑\n\nFlint to the moon ! 🚀🚀🚀',
        fields: [
          {
            title: 'Field with emoji',
            value: '✅ This should show checkmark',
            short: true,
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error:', response.status, errorText);
    } else {
      console.log('✅ Test message sent! Check your Slack channel.');
    }
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testEmojis();
