import { Router } from 'express';
import { db } from '../db';
import { businessLeads, insertBusinessLeadSchema } from '@shared/schema';
import { notifyBusinessLead } from '../services/slackNotifier';
import { emailService } from '../services/email';
import { logger } from '@shared/logger';
import { z } from 'zod';
import { rateLimits } from '../middleware/rateLimiter';

const router = Router();

const submitBusinessLeadSchema = insertBusinessLeadSchema.extend({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  companySize: z.string().optional(),
  useCase: z.string().optional(),
});

router.post('/', rateLimits.register, async (req, res) => {
  try {
    const parseResult = submitBusinessLeadSchema.safeParse(req.body);
    
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

    const [newLead] = await db.insert(businessLeads).values({
      companyName: leadData.companyName,
      contactName: leadData.contactName,
      email: leadData.email,
      phone: leadData.phone || null,
      companySize: leadData.companySize || null,
      useCase: leadData.useCase || null,
    }).returning();

    logger.info('Business lead captured', {
      metadata: {
        leadId: newLead.id,
        companyName: newLead.companyName,
        email: newLead.email,
      }
    });

    notifyBusinessLead({
      companyName: newLead.companyName,
      contactName: newLead.contactName,
      email: newLead.email,
      phone: newLead.phone || undefined,
      companySize: newLead.companySize || undefined,
      useCase: newLead.useCase || undefined,
      submissionTime: newLead.submittedAt || new Date(),
    }).catch(err => {
      logger.error('Failed to send Slack notification for business lead', {
        error: err instanceof Error ? err : new Error(String(err)),
        metadata: { leadId: newLead.id }
      });
    });

    emailService.sendTestEmail(
      'support@flint-investing.com',
      `New Business Lead: ${newLead.companyName}`,
      `
        <h2>New Flint for Business Lead</h2>
        <p><strong>Company:</strong> ${newLead.companyName}</p>
        <p><strong>Contact:</strong> ${newLead.contactName}</p>
        <p><strong>Email:</strong> ${newLead.email}</p>
        <p><strong>Phone:</strong> ${newLead.phone || 'Not provided'}</p>
        <p><strong>Company Size:</strong> ${newLead.companySize || 'Not specified'}</p>
        <p><strong>Use Case:</strong> ${newLead.useCase || 'Not specified'}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
      `
    ).catch((err: Error) => {
      logger.error('Failed to send email notification for business lead', {
        error: err instanceof Error ? err : new Error(String(err)),
        metadata: { leadId: newLead.id }
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! We\'ll be in touch soon.',
      lead: {
        id: newLead.id,
        companyName: newLead.companyName,
      }
    });
  } catch (error) {
    logger.error('Error submitting business lead', {
      error: error instanceof Error ? error : new Error(String(error))
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to submit. Please try again.',
    });
  }
});

export default router;
