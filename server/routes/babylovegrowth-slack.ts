/**
 * Babylovegrowth Slack Notification Helper
 * Sends Slack notifications when new content is received via webhook
 */

import { logger } from '@shared/logger';
import type { WebhookPayload } from '../services/babylovegrowth';

export async function notifySlackWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not configured - skipping webhook notification');
    return;
  }

  const message = {
    text: ':newspaper: *New SEO Content Generated!*',
    attachments: [
      {
        color: '#10B981',
        fields: [
          {
            title: 'Title',
            value: payload.title,
            short: false,
          },
          {
            title: 'Language',
            value: payload.languageCode.toUpperCase(),
            short: true,
          },
          {
            title: 'Article ID',
            value: String(payload.id),
            short: true,
          },
          {
            title: 'Public URL',
            value: payload.publicUrl || 'Not yet published',
            short: false,
          },
          {
            title: 'Created',
            value: new Date(payload.createdAt).toLocaleString('en-US', {
              timeZone: 'America/New_York',
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            short: false,
          },
        ],
        text: `_${payload.metaDescription || 'No description'}_\n\n:rocket: Import to blog from Admin Panel!`,
        footer: 'Babylovegrowth.ai Integration',
        ts: Math.floor(new Date(payload.createdAt).getTime() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.error('Slack webhook notification failed', {
        error: new Error(`HTTP ${response.status}`),
      });
    } else {
      logger.info('Slack notification sent for new babylovegrowth content');
    }
  } catch (error) {
    logger.error('Failed to send Slack notification', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}
