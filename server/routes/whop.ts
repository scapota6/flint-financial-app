import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { WHOP_CONFIG, WHOP_PLANS, getPlanByCTA, getPlanById } from '../lib/whop-config';
import { sendApprovalEmail } from '../services/email';
import { generateSecureToken, hashToken } from '../lib/token-utils';

const router = Router();

// Whop API configuration
const whopApiKey = process.env.WHOP_API_KEY;
if (!whopApiKey) {
  logger.error('WHOP_API_KEY not configured');
}

// Get checkout URL for a specific plan
router.get('/checkout/:ctaId', async (req, res) => {
  try {
    const { ctaId } = req.params;
    const { email } = req.query;

    // Get plan config by CTA ID
    const plan = getPlanByCTA(ctaId);
    
    if (!plan) {
      logger.warn('Invalid CTA ID requested', { metadata: { ctaId } });
      return res.status(400).json({ 
        error: 'Invalid pricing option' 
      });
    }

    if (!whopApiKey) {
      logger.error('Whop API key not configured');
      return res.status(500).json({ 
        error: 'Payment system not configured' 
      });
    }

    // For Whop, we'll return the checkout iframe URL
    // The frontend will embed this in an iframe
    const checkoutUrl = `https://whop.com/checkout/${plan.planId}`;
    
    logger.info('Checkout URL generated', { 
      metadata: {
        ctaId, 
        planId: plan.planId,
        email: email || 'none'
      }
    });

    res.json({ 
      checkoutUrl,
      plan: {
        name: plan.name,
        price: plan.price,
        tier: plan.tier
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
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    
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
        id: eventData?.id 
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

// Handle payment.succeeded event
async function handlePaymentSucceeded(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    const userId = paymentData.user_id;
    const membershipId = paymentData.membership_id;
    const planId = paymentData.plan_id;

    logger.info('Processing payment.succeeded event', { 
      metadata: {
        paymentId,
        userId,
        membershipId,
        planId
      }
    });

    // Get plan configuration
    const plan = getPlanById(planId);
    if (!plan) {
      logger.error('Unknown plan ID in payment', { metadata: { paymentId, planId } });
      return;
    }

    // Try to fetch user info from Whop if available
    let userEmail = paymentData.user?.email;
    let userName = paymentData.user?.username;

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
            subscriptionTier: plan.tier,
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
            tier: plan.tier 
          }
        });
      } else {
        // Create new user account
        await createUserFromWhopPayment(userEmail, userName, plan, membershipId, userId, planId);
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

// Handle membership.went_valid event
async function handleMembershipWentValid(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    const userId = membershipData.user_id;
    const planId = membershipData.plan_id;
    const userEmail = membershipData.user?.email;

    logger.info('Processing membership.went_valid event', { 
      metadata: {
        membershipId,
        userId,
        planId,
        userEmail
      }
    });

    // Get plan configuration
    const plan = getPlanById(planId);
    if (!plan) {
      logger.error('Unknown plan ID in membership', { metadata: { membershipId, planId } });
      return;
    }

    if (userEmail) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (existingUser.length > 0) {
        // Update user subscription status
        await db
          .update(users)
          .set({
            subscriptionTier: plan.tier,
            subscriptionStatus: 'active',
            whopMembershipId: membershipId,
            whopCustomerId: userId,
            whopPlanId: planId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id));

        logger.info('Updated user subscription from membership.went_valid', { 
          metadata: {
            email: userEmail,
            tier: plan.tier 
          }
        });
      } else {
        // Create new user if doesn't exist
        await createUserFromWhopPayment(
          userEmail, 
          membershipData.user?.username, 
          plan, 
          membershipId, 
          userId, 
          planId
        );
      }
    }
  } catch (error: any) {
    logger.error('Failed to process membership.went_valid event', { 
      error: error.message 
    });
  }
}

// Handle membership.went_invalid event
async function handleMembershipWentInvalid(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    const userEmail = membershipData.user?.email;

    logger.info('Processing membership.went_invalid event', { 
      metadata: {
        membershipId,
        userEmail 
      }
    });

    if (userEmail) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'expired',
          updatedAt: new Date(),
        })
        .where(eq(users.email, userEmail));

      logger.info('Marked user subscription as expired', { 
        metadata: { email: userEmail }
      });
    }
  } catch (error: any) {
    logger.error('Failed to process membership.went_invalid event', { 
      error: error.message 
    });
  }
}

// Handle membership.cancelled event
async function handleMembershipCancelled(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    const userEmail = membershipData.user?.email;

    logger.info('Processing membership.cancelled event', { 
      metadata: {
        membershipId,
        userEmail 
      }
    });

    if (userEmail) {
      await db
        .update(users)
        .set({
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(users.email, userEmail));

      logger.info('Cancelled user subscription', { 
        metadata: { email: userEmail }
      });
    }
  } catch (error: any) {
    logger.error('Failed to process membership.cancelled event', { 
      error: error.message 
    });
  }
}

// Helper function to create a new user from Whop payment
async function createUserFromWhopPayment(
  email: string,
  username: string | undefined,
  plan: any,
  membershipId: string,
  customerId: string,
  planId: string
) {
  const userId = uuidv4();
  const firstName = username || email.split('@')[0] || 'User';

  await db.insert(users).values({
    id: userId,
    email,
    firstName,
    subscriptionTier: plan.tier,
    subscriptionStatus: 'active',
    whopMembershipId: membershipId,
    whopCustomerId: customerId,
    whopPlanId: planId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info('Created new user from Whop payment', { 
    metadata: {
      userId,
      email,
      tier: plan.tier 
    }
  });

  // Generate password setup token and link
  try {
    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId,
      token: tokenHash,
      tokenType: 'password_reset',
      expiresAt,
      used: false,
    });

    // Generate password setup link
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const baseUrl = process.env.REPLIT_DEPLOYMENT 
      ? `https://${process.env.REPLIT_DEPLOYMENT}`
      : replitDomain
        ? `https://${replitDomain}`
        : 'http://localhost:5000';
    const passwordSetupLink = `${baseUrl}/setup-password?token=${plainToken}`;

    // Send approval email with password setup link
    await sendApprovalEmail(email, firstName, passwordSetupLink);
    logger.info('Password setup email sent', { metadata: { email } });
  } catch (emailError: any) {
    logger.error('Failed to send password setup email', { 
      error: emailError.message,
      metadata: { email }
    });
  }
}

export default router;
