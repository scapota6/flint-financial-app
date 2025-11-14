import { logger } from '@shared/logger';

/**
 * Slack Notification Service
 * Sends real-time notifications to Slack via webhook for key business events
 */

// Funny messages to spice things up
const SIGNUP_QUIPS = [
  "Another soul joins the financial revolution :rocket:",
  "Cha-ching! That's the sound of success :money_with_wings:",
  "Money doesn't grow on trees, but it does grow in Flint :seedling:",
  "New user alert! Someone's about to get rich (or at least try) :moneybag:",
  "Breaking news: Your bank account just got some competition :bank:",
  "Plot twist: They actually read the terms and conditions :scroll:",
];

const SUBSCRIPTION_QUIPS = [
  "Show me the money! :dollar:",
  "Someone just leveled up their financial game :chart_with_upwards_trend:",
  "This calls for a celebration! :confetti_ball:",
  "Ka-ching! Time to update the revenue dashboard :money_with_wings:",
  "Another happy customer (and a happier bank account) :money_mouth_face:",
  "Stripe just sent us good vibes :sparkles:",
];

const APPLICATION_QUIPS = [
  "Fresh meat! :cut_of_meat:",
  "Someone wants in on the action :eyes:",
  "A new challenger approaches! :video_game:",
  "Knock knock. Who's there? A new applicant! :door:",
  "They found us on the internet (probably) :detective:",
  "Time to dust off the admin panel :broom:",
  "Another brave soul requests access to financial enlightenment :person_in_lotus_position:",
];

function getRandomQuip(quips: string[]): string {
  return quips[Math.floor(Math.random() * quips.length)];
}

interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: SlackField[];
  footer?: string;
  ts?: number;
}

interface SlackMessage {
  text?: string;
  attachments?: SlackAttachment[];
}

/**
 * Send a message to Slack webhook
 * Non-blocking - errors are logged but don't throw
 */
async function sendSlackMessage(message: SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not configured - skipping Slack notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Slack webhook request failed', {
        error: new Error(`HTTP ${response.status}: ${errorText}`),
        metadata: { statusCode: response.status }
      });
    } else {
      logger.info('Slack notification sent successfully');
    }
  } catch (error) {
    logger.error('Failed to send Slack notification', {
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}

/**
 * Send notification for new user signup
 */
export async function notifyNewUserSignup(data: {
  name: string;
  email: string;
  subscriptionTier: string;
  signupTime: Date;
}): Promise<void> {
  const message: SlackMessage = {
    text: ':tada: *New User Signup!*',
    attachments: [
      {
        color: '#36a64f', // Green
        fields: [
          {
            title: 'Name',
            value: data.name || 'Not provided',
            short: true,
          },
          {
            title: 'Email',
            value: data.email,
            short: true,
          },
          {
            title: 'Subscription Plan',
            value: data.subscriptionTier.charAt(0).toUpperCase() + data.subscriptionTier.slice(1),
            short: true,
          },
          {
            title: 'Signup Time',
            value: data.signupTime.toLocaleString('en-US', {
              timeZone: 'America/New_York',
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            short: true,
          },
        ],
        text: `_${getRandomQuip(SIGNUP_QUIPS)}_\n\nFlint to the moon ! :rocket::rocket::rocket:`,
        footer: 'Flint Investment Platform',
        ts: Math.floor(data.signupTime.getTime() / 1000),
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send notification for new subscription purchase
 */
export async function notifyNewSubscription(data: {
  name: string;
  email: string;
  tier: string;
  billingPeriod?: string;
  amount?: number;
  subscriptionTime: Date;
}): Promise<void> {
  const tierDisplay = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);
  const periodDisplay = data.billingPeriod === 'yearly' ? 'Annual' : 'Monthly';
  const amountDisplay = data.amount ? `$${data.amount.toFixed(2)}` : 'N/A';

  const message: SlackMessage = {
    text: ':moneybag: *New Subscription Purchase!*',
    attachments: [
      {
        color: '#f2c744', // Gold
        fields: [
          {
            title: 'Customer Name',
            value: data.name || 'Not provided',
            short: true,
          },
          {
            title: 'Email',
            value: data.email,
            short: true,
          },
          {
            title: 'Plan',
            value: `${tierDisplay} (${periodDisplay})`,
            short: true,
          },
          {
            title: 'Amount',
            value: amountDisplay,
            short: true,
          },
          {
            title: 'Purchase Time',
            value: data.subscriptionTime.toLocaleString('en-US', {
              timeZone: 'America/New_York',
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            short: false,
          },
        ],
        text: `_${getRandomQuip(SUBSCRIPTION_QUIPS)}_\n\nFlint to the moon ! :rocket::rocket::rocket:`,
        footer: 'Flint Investment Platform',
        ts: Math.floor(data.subscriptionTime.getTime() / 1000),
      },
    ],
  };

  await sendSlackMessage(message);
}

/**
 * Send notification for new account application
 */
export async function notifyNewApplication(data: {
  name: string;
  email: string;
  accountCount: string;
  connectType: string;
  submissionTime: Date;
}): Promise<void> {
  const message: SlackMessage = {
    text: ':clipboard: *New Account Application Submitted!*',
    attachments: [
      {
        color: '#3AA3E3', // Blue
        fields: [
          {
            title: 'Applicant Name',
            value: data.name,
            short: true,
          },
          {
            title: 'Email',
            value: data.email,
            short: true,
          },
          {
            title: 'Accounts to Connect',
            value: data.accountCount,
            short: true,
          },
          {
            title: 'Connection Type',
            value: data.connectType,
            short: true,
          },
          {
            title: 'Submitted',
            value: data.submissionTime.toLocaleString('en-US', {
              timeZone: 'America/New_York',
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            short: false,
          },
        ],
        text: `_${getRandomQuip(APPLICATION_QUIPS)}_\n\nFlint to the moon ! :rocket::rocket::rocket:`,
        footer: 'Flint Investment Platform • Review in Admin Panel',
        ts: Math.floor(data.submissionTime.getTime() / 1000),
      },
    ],
  };

  await sendSlackMessage(message);
}
