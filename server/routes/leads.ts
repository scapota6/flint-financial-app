import { Router } from 'express';
import { db } from '../db';
import { leadCaptures, insertLeadCaptureSchema } from '@shared/schema';
import { notifyLeadCapture } from '../services/slackNotifier';
import { logger } from '@shared/logger';
import { z } from 'zod';
import { rateLimits } from '../middleware/rateLimiter';

const router = Router();

// Validation schema for lead capture submission
const submitLeadSchema = insertLeadCaptureSchema.extend({
  email: z.string().email('Please enter a valid email address'),
  goals: z.array(z.string()).optional().default([]),
  source: z.string().default('exit_intent'),
});

/**
 * POST /api/leads - Submit a new lead capture
 * Public endpoint (no auth required) with rate limiting
 */
router.post('/', rateLimits.register, async (req, res) => {
  try {
    // Validate request body
    const parseResult = submitLeadSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const leadData = parseResult.data;

    // Insert into database
    const [newLead] = await db.insert(leadCaptures).values({
      email: leadData.email,
      goals: leadData.goals,
      source: leadData.source || 'exit_intent',
    }).returning();

    logger.info('Lead captured', {
      metadata: {
        leadId: newLead.id,
        email: newLead.email,
        source: newLead.source,
      }
    });

    // Send Slack notification (non-blocking)
    notifyLeadCapture({
      email: newLead.email,
      goals: newLead.goals || [],
      source: newLead.source,
      submissionTime: newLead.submittedAt || new Date(),
    }).catch(err => {
      logger.error('Failed to send Slack notification for lead capture', {
        error: err instanceof Error ? err : new Error(String(err)),
        metadata: { leadId: newLead.id }
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! We\'ll be in touch soon.',
      lead: {
        id: newLead.id,
        email: newLead.email,
      }
    });
  } catch (error) {
    logger.error('Error submitting lead capture', {
      error: error instanceof Error ? error : new Error(String(error))
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to submit. Please try again.',
    });
  }
});

export default router;
