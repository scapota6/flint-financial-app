import { Router, Request as ExpressRequest } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { WHOP_CONFIG, WHOP_PRODUCTS, getProductByCTA, getTierByPlanId } from '../lib/whop-config';
import { sendApprovalEmail } from '../services/email';
import { generateSecureToken, hashToken } from '../lib/token-utils';
import { whopSdk } from '../lib/whop-sdk';
import { makeWebhookValidator } from '@whop/api';
import { requireAuth } from '../middleware/jwt-auth';

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

// Create Whop webhook validator
const validateWhopWebhook = webhookSecret 
  ? makeWebhookValidator({ 
      webhookSecret,
      signatureHeaderName: 'x-whop-signature'
    }) 
  : null;

// Create checkout session using Whop API
router.post('/create-checkout', async (req, res) => {
  try {
    const { tier, billingPeriod = 'monthly', email } = req.body;

    // Validate tier
    if (!tier || !['basic', 'pro', 'premium'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be basic, pro, or premium' 
      });
    }

    // Validate billing period
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return res.status(400).json({ 
        error: 'Invalid billing period. Must be monthly or yearly' 
      });
    }

    // Map tier + billing period to CTA ID
    const ctaId = `${tier}-${billingPeriod}`;
    const product = getProductByCTA(ctaId);

    if (!product || !product.planId) {
      logger.error('No plan ID found for tier/billing period', {
        metadata: { tier, billingPeriod, ctaId, hasPlanId: !!product?.planId }
      });
      return res.status(400).json({ 
        error: 'Invalid pricing configuration' 
      });
    }

    // Create checkout session via Whop API
    // This is required for the React embed component
    const checkoutSessionResponse = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: product.planId,
        metadata: {
          tier,
          billingPeriod,
          source: 'flint-landing-page'
        }
      })
    });

    if (!checkoutSessionResponse.ok) {
      const errorText = await checkoutSessionResponse.text();
      throw new Error(`Whop API error: ${checkoutSessionResponse.status} - ${errorText}`);
    }

    const checkoutSession = await checkoutSessionResponse.json();

    logger.info('Created Whop checkout session', {
      metadata: {
        sessionId: checkoutSession.id,
        planId: product.planId,
        tier,
        billingPeriod,
        planName: product.name,
        email: email || 'not provided',
      }
    });

    // Return session ID for embedded checkout
    res.json({
      sessionId: checkoutSession.id,
      planId: product.planId,
      planName: product.name,
      ...(email && { email }) // Pass email for prefill
    });
  } catch (error: any) {
    logger.error('Failed to create checkout session', { 
      error: error.message,
      metadata: {
        tier: req.body?.tier,
        billingPeriod: req.body?.billingPeriod,
      }
    });
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// Activate subscription after successful payment
// SECURITY: This endpoint requires authentication and verifies payment with Whop API
router.post('/activate-subscription', requireAuth, async (req, res) => {
  try {
    const { planId, receiptId } = req.body;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    // Validate inputs
    if (!planId || !receiptId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing planId or receiptId' 
      });
    }

    // Ensure user is authenticated (requireAuth middleware should handle this, but double-check)
    if (!userId || !userEmail) {
      logger.error('Activate subscription called without authenticated user', {
        metadata: { hasUserId: !!userId, hasUserEmail: !!userEmail }
      });
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    logger.info('Activating subscription with verification', {
      metadata: {
        planId,
        receiptId,
        userId,
        userEmail,
      }
    });

    // STEP 1: Verify payment with Whop API
    // Using direct REST API call since the SDK version doesn't expose payments.retrievePayment
    let payment;
    try {
      const whopApiUrl = `https://api.whop.com/api/v5/payments/${receiptId}`;
      const response = await fetch(whopApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Whop API payment retrieval failed', {
          metadata: {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            receiptId,
          }
        });
        return res.status(400).json({ 
          success: false,
          error: 'Invalid receipt ID - payment not found' 
        });
      }

      payment = await response.json();
    } catch (error: any) {
      logger.error('Failed to retrieve payment from Whop API', { 
        error: error.message,
        metadata: { receiptId, userId }
      });
      return res.status(400).json({ 
        success: false,
        error: 'Invalid receipt ID - payment not found' 
      });
    }

    // STEP 2: Verify payment belongs to the authenticated user
    const paymentUserEmail = payment.email;
    if (paymentUserEmail !== userEmail) {
      logger.error('Payment email does not match authenticated user', {
        metadata: {
          receiptId,
          userId,
          authenticatedEmail: userEmail,
          paymentEmail: paymentUserEmail,
        }
      });
      return res.status(403).json({ 
        success: false,
        error: 'Payment does not belong to authenticated user' 
      });
    }

    // STEP 3: Verify payment status is completed
    if (payment.status !== 'paid') {
      logger.error('Payment status is not paid', {
        metadata: {
          receiptId,
          userId,
          status: payment.status,
        }
      });
      return res.status(400).json({ 
        success: false,
        error: `Payment not completed - status: ${payment.status}` 
      });
    }

    // STEP 4: Verify payment has not been refunded
    if (payment.refunded_at) {
      logger.error('Payment has been refunded', {
        metadata: {
          receiptId,
          userId,
          refundedAt: payment.refunded_at,
        }
      });
      return res.status(400).json({ 
        success: false,
        error: 'Payment has been refunded' 
      });
    }

    // STEP 5: Verify plan ID matches what was actually paid for
    const paidPlanId = payment.plan_id;
    if (paidPlanId !== planId) {
      logger.error('Plan ID mismatch between request and payment', {
        metadata: {
          receiptId,
          userId,
          requestedPlanId: planId,
          paidPlanId,
        }
      });
      return res.status(403).json({ 
        success: false,
        error: 'Plan ID does not match payment' 
      });
    }

    // STEP 6: Get tier from verified plan ID
    const tier = getTierByPlanId(planId);
    
    if (!tier) {
      logger.error('Unknown plan ID after verification', { 
        metadata: { planId, receiptId, userId } 
      });
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plan ID' 
      });
    }

    // STEP 7: All verifications passed - update user subscription
    await db.update(users)
      .set({ 
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        whopMembershipId: payment.membership_id || null,
        whopCustomerId: payment.user_id || null,
        whopPlanId: planId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info('Subscription activated successfully after verification', {
      metadata: {
        userId,
        userEmail,
        tier,
        planId,
        receiptId,
        membershipId: payment.membership_id,
      }
    });

    res.json({ 
      success: true,
      tier,
      message: 'Subscription activated successfully'
    });

  } catch (error: any) {
    logger.error('Failed to activate subscription', { 
      error: error.message,
      metadata: {
        planId: req.body?.planId,
        receiptId: req.body?.receiptId,
        userId: req.user?.userId,
      }
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to activate subscription - please contact support' 
    });
  }
});

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

    // Build checkout URL with email parameter and iframe mode
    const url = new URL(product.url);
    
    // Enable iframe embedding mode
    url.searchParams.set('iframe', 'true');
    
    // Add email parameter if provided
    if (email && typeof email === 'string') {
      url.searchParams.set('email', email);
    }
    
    const checkoutUrl = url.toString();

    logger.info('Checkout URL generated', { 
      metadata: {
        ctaId, 
        url: checkoutUrl,
        email: email || 'none',
        planId: product.planId || 'none'
      }
    });

    // Return the plan ID for Whop embed component and URL as fallback
    res.json({ 
      checkoutUrl,
      planId: product.planId,
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

// Helper function to convert Express Request to Web API Request
function expressToWebApiRequest(req: ExpressRequest): Request {
  // Get raw body string from Express
  const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  // Build full URL
  const protocol = req.protocol || 'https';
  const host = req.get('host') || '';
  const url = `${protocol}://${host}${req.originalUrl || req.url}`;
  
  // Convert Express headers to Headers object
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      const headerValue = Array.isArray(value) ? value.join(', ') : String(value);
      headers.set(key, headerValue);
    }
  });
  
  // Create Web API Request
  return new Request(url, {
    method: req.method,
    headers,
    body: bodyString,
  });
}

// Webhook handler function (can be called directly or through router)
export async function handleWhopWebhook(req: ExpressRequest, res: any) {
  try {
    if (!validateWhopWebhook) {
      logger.error('WHOP_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get raw body - should be a string from express.text() middleware
    const bodyString = req.body;
    
    if (typeof bodyString !== 'string') {
      logger.error('Webhook body is not a string - middleware configuration error');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Debug logging - check what headers we're receiving
    logger.info('Whop webhook request received', {
      metadata: {
        bodyLength: bodyString.length,
        headers: {
          'x-whop-signature': req.headers['x-whop-signature'],
          'content-type': req.headers['content-type'],
        },
        url: req.url,
        method: req.method
      }
    });

    // Convert Express request to Web API Request for validator
    const webApiRequest = expressToWebApiRequest(req);
    
    // Validate webhook signature and parse payload using official Whop SDK
    let webhook;
    try {
      webhook = await validateWhopWebhook(webApiRequest);
    } catch (error: any) {
      logger.error('Webhook validation failed', { 
        metadata: { 
          error: error.message,
          signature: req.headers['x-whop-signature']?.toString(),
          bodyPreview: bodyString.substring(0, 100)
        }
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extract event type and data from validated webhook
    const rawEventType = webhook.action;
    const eventData = webhook.data;

    // Normalize event type - strip 'app_' prefix if present
    // Whop sends events like 'app_payment.succeeded' but we handle 'payment.succeeded'
    const eventType = rawEventType.startsWith('app_') 
      ? rawEventType.substring(4) // Remove 'app_' prefix
      : rawEventType;

    logger.info('Whop webhook received', { 
      metadata: {
        rawEventType,
        normalizedEventType: eventType,
        id: eventData?.id,
        planId: (eventData as any)?.plan || (eventData as any)?.plan_id 
      }
    });

    // Handle different Whop webhook events
    switch (eventType) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(eventData as any);
        break;
      case 'payment.failed':
        logger.info('Payment failed event received', { metadata: { paymentId: (eventData as any)?.id } });
        break;
      case 'payment.pending':
        logger.info('Payment pending event received', { metadata: { paymentId: (eventData as any)?.id } });
        break;
      case 'membership.went_valid':
        await handleMembershipWentValid(eventData as any);
        break;
      case 'membership.went_invalid':
        await handleMembershipWentInvalid(eventData as any);
        break;
      case 'membership.cancel_at_period_end_changed':
        // Handle membership cancellation (when user cancels, membership stays active until period ends)
        await handleMembershipCancelled(eventData as any);
        break;
      default:
        logger.info('Unhandled webhook event type', { metadata: { rawEventType, normalizedEventType: eventType } });
    }

    // Respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Register webhook route (for compatibility if accessed via router)
router.post('/webhook', handleWhopWebhook);

// Map Whop plan ID to subscription tier using the configuration mapping
function mapPlanIdToTier(planId: string): 'free' | 'basic' | 'pro' | 'premium' {
  // Use the centralized plan ID to tier mapping from whop-config
  const tier = getTierByPlanId(planId);
  
  if (tier) {
    return tier;
  }
  
  // Fallback to inferring from plan ID string if not in mapping
  const planIdLower = planId.toLowerCase();
  
  if (planIdLower.includes('unlimited') || planIdLower.includes('premium')) {
    return 'premium';
  } else if (planIdLower.includes('pro')) {
    return 'pro';
  } else if (planIdLower.includes('basic') || planIdLower.includes('plus')) {
    return 'basic';
  }
  
  logger.warn('Unknown plan ID, defaulting to basic tier', { metadata: { planId } });
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
        await createUserFromWhopPayment(userEmail, userName ?? undefined, tier, membershipId, userId, planId);
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

// Handle membership cancellation (membership.cancelled or membership.cancel_at_period_end_changed)
async function handleMembershipCancelled(membershipData: any) {
  try {
    const membershipId = membershipData.id;
    let userEmail = extractEmailFromPayload(membershipData);

    logger.info('Processing membership cancellation event', { 
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
