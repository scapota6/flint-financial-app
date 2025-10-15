import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { WHOP_CONFIG, WHOP_PRODUCTS, getProductByCTA } from '../lib/whop-config';
import { sendApprovalEmail } from '../services/email';
import { generateSecureToken, hashToken } from '../lib/token-utils';
import { whopSdk } from '../lib/whop-sdk';

const router = Router();

// Whop API configuration
const whopApiKey = process.env.WHOP_API_KEY;
const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

if (!whopApiKey) {
  logger.error('WHOP_API_KEY not configured');
}

if (!webhookSecret) {
  logger.error('WHOP_WEBHOOK_SECRET not configured');
}

// Get checkout URL for a specific plan
router.get('/checkout/:ctaId', async (req, res) => {
  try {
    const { ctaId } = req.params;
    const { email } = req.query;

    // Get product config by CTA ID
    const product = getProductByCTA(ctaId);
    
    if (!product) {
      logger.warn('Invalid CTA ID requested', { metadata: { ctaId } });
      return res.status(400).json({ 
        error: 'Invalid pricing option' 
      });
    }

    // Build checkout URL with email parameter if provided
    let checkoutUrl = product.url;
    if (email && typeof email === 'string') {
      const url = new URL(product.url);
      url.searchParams.set('email', email);
      checkoutUrl = url.toString();
    }

    logger.info('Checkout URL generated', { 
      metadata: {
        ctaId, 
        url: checkoutUrl,
        email: email || 'none'
      }
    });

    // Return the Whop product URL with email parameter
    res.json({ 
      checkoutUrl,
      product: {
        name: product.name,
        price: product.price,
        tier: product.tier
      }
    });
  } catch (error: any) {
    logger.error('Checkout creation failed', { error: error.message });
    res.status(500).json({ 
      error: 'Unable to create checkout' 
    });
  }
});

// Webhook endpoint for Whop events
// NOTE: This route receives raw body for signature verification
router.post('/webhook', async (req, res) => {
  try {
    if (!webhookSecret) {
      logger.error('WHOP_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get signature from header (Whop uses X-Whop-Signature)
    const signature = req.headers['x-whop-signature'] as string;
    if (!signature) {
      logger.warn('Webhook received without signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Get raw body - should be a string from express.text() middleware
    const bodyString = req.body;
    
    if (typeof bodyString !== 'string') {
      logger.error('Webhook body is not a string - middleware configuration error');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify signature using raw body with timing-safe comparison
    const computedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    // Convert both to Buffers for timing-safe comparison
    const expectedSig = Buffer.from(computedHmac, 'utf8');
    const receivedSig = Buffer.from(signature, 'utf8');

    // Use timing-safe comparison to prevent timing attacks
    if (expectedSig.length !== receivedSig.length || 
        !crypto.timingSafeEqual(expectedSig, receivedSig)) {
      logger.warn('Invalid webhook signature', { 
        metadata: { 
          error: 'Signature mismatch',
          received: signature.substring(0, 10) + '...', 
          computed: computedHmac.substring(0, 10) + '...',
        }
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload only after signature verification
    const payload = JSON.parse(bodyString);
    const eventType = payload.action || payload.type;
    const eventData = payload.data;

    logger.info('Whop webhook received', { 
      metadata: {
        eventType,
        id: eventData?.id,
        planId: eventData?.plan || eventData?.plan_id 
      }
    });

    // Handle different Whop webhook events
    switch (eventType) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(eventData);
        break;
      case 'membership.went_valid':
        await handleMembershipWentValid(eventData);
        break;
      case 'membership.went_invalid':
        await handleMembershipWentInvalid(eventData);
        break;
      case 'membership.cancelled':
        await handleMembershipCancelled(eventData);
        break;
      default:
        logger.info('Unhandled webhook event type', { metadata: { eventType } });
    }

    // Respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Map Whop plan ID to subscription tier
// This will need to be updated once we receive actual plan IDs from webhooks
function mapPlanIdToTier(planId: string): 'free' | 'basic' | 'pro' | 'premium' {
  // Extract tier from plan internal notes or metadata
  // For now, default to basic until we see actual webhook data
  const planIdLower = planId.toLowerCase();
  
  if (planIdLower.includes('unlimited') || planIdLower.includes('premium')) {
    return 'premium';
  } else if (planIdLower.includes('pro')) {
    return 'pro';
  } else if (planIdLower.includes('basic') || planIdLower.includes('plus')) {
    return 'basic';
  }
  
  return 'basic'; // Default fallback
}

// Helper function to extract email from webhook payload
function extractEmailFromPayload(data: any): string | null {
  // Try multiple possible locations for email in webhook payload
  const possibleEmailFields = [
    data.email,
    data.user?.email,
    data.customer?.email,
    data.metadata?.email,
    data.billing?.email,
  ];

  for (const email of possibleEmailFields) {
    if (email && typeof email === 'string' && email.includes('@')) {
      return email;
    }
  }

  return null;
}

// Helper function to extract username from webhook payload
function extractUsernameFromPayload(data: any): string | null {
  const possibleUsernameFields = [
    data.username,
    data.user?.username,
    data.customer?.username,
    data.metadata?.username,
  ];

  for (const username of possibleUsernameFields) {
    if (username && typeof username === 'string') {
      return username;
    }
  }

  return null;
}

// Handle payment.succeeded event
async function handlePaymentSucceeded(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const userId = paymentData.user_id || paymentData.user;
    const membershipId = paymentData.membership_id || paymentData.membership;
    const planId = paymentData.plan_id || paymentData.plan;

    logger.info('Processing payment.succeeded event', { 
      metadata: {
        paymentId,
        userId,
        membershipId,
        planId,
        payloadKeys: Object.keys(paymentData)
      }
    });

    // Map plan ID to tier
    const tier = mapPlanIdToTier(planId);

    // Extract email and username from payload
    let userEmail = extractEmailFromPayload(paymentData);
    let userName = extractUsernameFromPayload(paymentData);

    // If email is missing from payload, try to find user by membership ID or customer ID
    if (!userEmail) {
      logger.warn('Email not found in payment.succeeded webhook payload, attempting user lookup', {
        metadata: {
          paymentId,
          userId,
          membershipId,
          payloadStructure: JSON.stringify(paymentData, null, 2).substring(0, 500)
        }
      });
      
      // Try to find existing user by Whop membership ID or customer ID
      if (membershipId) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.whopMembershipId, membershipId))
          .limit(1);
        
        if (existingUser.length > 0) {
          userEmail = existingUser[0].email;
          logger.info('Found user by membership ID', {
            metadata: { userId: existingUser[0].id, membershipId }
          });
        }
      }
      
      // If still no email and we have a customer ID, try that
      if (!userEmail && userId) {
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.whopCustomerId, userId))
          .limit(1);
        
        if (existingUser.length > 0) {
          userEmail = existingUser[0].email;
          logger.info('Found user by customer ID', {
            metadata: { userId: existingUser[0].id, whopCustomerId: userId }
          });
        }
      }
      
      // If we still don't have an email, we cannot proceed
      if (!userEmail) {
        logger.error('Unable to process payment: no email in payload and no existing user found', {
          metadata: {
            paymentId,
            userId,
            membershipId
          }
        });
        return;
      }
    }

    // Check if user already exists in our system
    if (userEmail) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (existingUser.length > 0) {
        // Update existing user subscription
        await db
          .update(users)
          .set({
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            whopMembershipId: membershipId,
            whopCustomerId: userId,
            whopPlanId: planId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id));

        logger.info('Updated existing user subscription', { 
          metadata: {
            userId: existingUser[0].id,
            tier 
          }
        });
      } else {
        // Create new user account
        await createUserFromWhopPayment(userEmail, userName, tier, membershipId, userId, planId);
      }
    }
  } catch (error: any) {
    logger.error('Failed to process payment.succeeded event', { 
      error: error.message,
      metadata: { paymentId: paymentData?.id }
    });
    throw error;
  }
}

// Create new user from Whop payment
async function createUserFromWhopPayment(
  email: string, 
  username: string | undefined, 
  tier: 'free' | 'basic' | 'pro' | 'premium',
  membershipId: string,
  customerId: string,
  planId: string
) {
  try {
    // Generate secure password and tokens
    const tempPassword = generateSecureToken(16);
    const passwordResetToken = generateSecureToken(32);
    const hashedResetToken = hashToken(passwordResetToken);

    // Create user (id is auto-generated as varchar with UUID)
    await db.insert(users).values({
      id: uuidv4(),
      email,
      passwordHash: '', // Will be set when user resets password
      subscriptionTier: tier,
      subscriptionStatus: 'active',
      whopMembershipId: membershipId,
      whopCustomerId: customerId,
      whopPlanId: planId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get newly created user to get their ID
    const newUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (newUser.length === 0) {
      throw new Error('Failed to create user');
    }

    // Create password reset token
    await db.insert(passwordResetTokens).values({
      userId: newUser[0].id,
      token: hashedResetToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    });

    // Send welcome email with password reset link
    const firstName = username || email.split('@')[0];
    const passwordSetupLink = `${process.env.APP_URL || 'https://flint-investing.com'}/reset-password?token=${passwordResetToken}`;
    await sendApprovalEmail(email, firstName, passwordSetupLink);

    logger.info('Created new user from Whop payment', { 
      metadata: {
        userId: newUser[0].id,
        email,
        tier 
      }
    });
  } catch (error: any) {
    logger.error('Failed to create user from Whop payment', { 
      error: error.message 
    });
    throw error;
  }
}

// Handle membership.went_valid event
async function handleMembershipWentValid(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    const planId = membershipData.plan_id || membershipData.plan;
    let userEmail = extractEmailFromPayload(membershipData);

    logger.info('Processing membership.went_valid event', { 
      metadata: {
        membershipId,
        planId,
        email: userEmail,
        payloadKeys: Object.keys(membershipData)
      }
    });

    // If email is missing, try to find user by membership ID
    if (!userEmail && membershipId) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.whopMembershipId, membershipId))
        .limit(1);
      
      if (existingUser.length > 0) {
        userEmail = existingUser[0].email;
        logger.info('Found user by membership ID for went_valid event', {
          metadata: { userId: existingUser[0].id, membershipId }
        });
      }
    }

    if (!userEmail) {
      logger.warn('Unable to process membership.went_valid: no email and no user found', {
        metadata: {
          membershipId,
          payloadStructure: JSON.stringify(membershipData, null, 2).substring(0, 500)
        }
      });
      return;
    }

    // Find user and update subscription status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (user.length > 0) {
      const tier = mapPlanIdToTier(planId);
      
      await db
        .update(users)
        .set({
          subscriptionStatus: 'active',
          subscriptionTier: tier,
          whopMembershipId: membershipId,
          whopPlanId: planId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0].id));

      logger.info('Activated membership', { 
        metadata: {
          userId: user[0].id,
          tier 
        }
      });
    }
  } catch (error: any) {
    logger.error('Failed to process membership.went_valid event', { 
      error: error.message 
    });
    throw error;
  }
}

// Handle membership.went_invalid event
async function handleMembershipWentInvalid(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    let userEmail = extractEmailFromPayload(membershipData);

    logger.info('Processing membership.went_invalid event', { 
      metadata: {
        membershipId,
        email: userEmail,
        payloadKeys: Object.keys(membershipData)
      }
    });

    // If email is missing, try to find user by membership ID
    if (!userEmail && membershipId) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.whopMembershipId, membershipId))
        .limit(1);
      
      if (existingUser.length > 0) {
        userEmail = existingUser[0].email;
        logger.info('Found user by membership ID for went_invalid event', {
          metadata: { userId: existingUser[0].id, membershipId }
        });
      }
    }

    if (!userEmail) {
      logger.warn('Unable to process membership.went_invalid: no email and no user found', {
        metadata: {
          membershipId,
          payloadStructure: JSON.stringify(membershipData, null, 2).substring(0, 500)
        }
      });
      return;
    }

    // Find user and update subscription status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (user.length > 0) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0].id));

      logger.info('Deactivated membership', { 
        metadata: {
          userId: user[0].id 
        }
      });
    }
  } catch (error: any) {
    logger.error('Failed to process membership.went_invalid event', { 
      error: error.message 
    });
    throw error;
  }
}

// Handle membership.cancelled event
async function handleMembershipCancelled(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    let userEmail = extractEmailFromPayload(membershipData);

    logger.info('Processing membership.cancelled event', { 
      metadata: {
        membershipId,
        email: userEmail,
        payloadKeys: Object.keys(membershipData)
      }
    });

    // If email is missing, try to find user by membership ID
    if (!userEmail && membershipId) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.whopMembershipId, membershipId))
        .limit(1);
      
      if (existingUser.length > 0) {
        userEmail = existingUser[0].email;
        logger.info('Found user by membership ID for cancelled event', {
          metadata: { userId: existingUser[0].id, membershipId }
        });
      }
    }

    if (!userEmail) {
      logger.warn('Unable to process membership.cancelled: no email and no user found', {
        metadata: {
          membershipId,
          payloadStructure: JSON.stringify(membershipData, null, 2).substring(0, 500)
        }
      });
      return;
    }

    // Find user and update subscription status
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (user.length > 0) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user[0].id));

      logger.info('Cancelled membership', { 
        metadata: {
          userId: user[0].id 
        }
      });
    }
  } catch (error: any) {
    logger.error('Failed to process membership.cancelled event', { 
      error: error.message 
    });
    throw error;
  }
}

export default router;
