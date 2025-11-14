import { Router } from 'express';
import { db } from '../db';
import { featureRequests, insertFeatureRequestSchema } from '@shared/schema';
import { logger } from '@shared/logger';
import { z } from 'zod';
import { notifyFeatureRequest } from '../services/slackNotifier';

const router = Router();

// Validation schema with phone validation
const submitFeatureRequestSchema = insertFeatureRequestSchema.extend({
  phone: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      // Basic phone validation - allows various formats
      const phoneRegex = /^[\d\s()+-]+$/;
      return phoneRegex.test(val) && val.replace(/\D/g, '').length >= 10;
    },
    { message: 'Please enter a valid phone number' }
  ),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
});

/**
 * POST /api/feature-requests - Submit a new feature request
 * Public endpoint (no auth required)
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const parseResult = submitFeatureRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const featureRequestData = parseResult.data;

    // Insert into database
    const [newFeatureRequest] = await db.insert(featureRequests).values({
      name: featureRequestData.name,
      email: featureRequestData.email,
      phone: featureRequestData.phone || null,
      priority: featureRequestData.priority || 'medium',
      description: featureRequestData.description,
      status: 'pending',
    }).returning();

    logger.info('Feature request submitted', {
      metadata: {
        featureRequestId: newFeatureRequest.id,
        email: newFeatureRequest.email,
        priority: newFeatureRequest.priority,
      }
    });

    // Send Slack notification (non-blocking)
    notifyFeatureRequest({
      name: newFeatureRequest.name,
      email: newFeatureRequest.email,
      phone: newFeatureRequest.phone || undefined,
      priority: newFeatureRequest.priority,
      description: newFeatureRequest.description,
      submissionTime: newFeatureRequest.submittedAt || new Date(),
    }).catch(error => {
      logger.error('Failed to send feature request Slack notification', {
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { featureRequestId: newFeatureRequest.id }
      });
    });

    return res.status(201).json({
      message: 'Feature request submitted successfully! We\'ll review it shortly.',
      featureRequest: {
        id: newFeatureRequest.id,
        status: newFeatureRequest.status,
      },
    });
  } catch (error) {
    logger.error('Error submitting feature request', {
      error: error instanceof Error ? error : new Error(String(error))
    });

    return res.status(500).json({
      message: 'Failed to submit feature request. Please try again later.',
    });
  }
});

export default router;
