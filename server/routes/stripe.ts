import { Router, Request as ExpressRequest } from 'express';
import { stripe, getPriceByTierAndPeriod, getTierByPriceId, STRIPE_CONFIG } from '../lib/stripe-config';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { requireAuth } from '../middleware/jwt-auth';
import { rateLimits } from '../middleware/rateLimiter';
import Stripe from 'stripe';
import crypto from 'crypto';
import { generateSecureToken, hashToken } from '../lib/token-utils';
import { sendPasswordResetEmail } from '../services/email';
import { notifyNewSubscription } from '../services/slackNotifier';

const router = Router();

// Create Stripe Embedded Checkout Session (unauthenticated)
router.post('/create-embedded-checkout', rateLimits.publicCheckout, async (req, res) => {
  try {
    const { email, tier, billingPeriod = 'monthly' } = req.body;

    // Validate tier and billingPeriod
    const validTiers = ['basic', 'pro'];
    const validBillingPeriods = ['monthly', 'yearly'];
    
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be one of: basic, pro' 
      });
    }
    
    if (!billingPeriod || !validBillingPeriods.includes(billingPeriod)) {
      return res.status(400).json({ 
        error: 'Invalid billing period. Must be one of: monthly, yearly' 
      });
    }

    // Get pricing plan
    const plan = getPriceByTierAndPeriod(tier, billingPeriod);
    if (!plan) {
      return res.status(400).json({ error: 'Pricing plan not available' });
    }

    // Optional: Support pre-filled email if provided
    let customerId: string | undefined;
    let existingUser = null;

    if (email && email.includes('@')) {
      // Check if user already exists with this email
      [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      customerId = existingUser?.stripeCustomerId || undefined;

      // Create or retrieve Stripe customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: email.toLowerCase(),
          metadata: {
            isNewCustomer: 'true',
          },
        });
        customerId = customer.id;

        logger.info('Created Stripe customer for embedded checkout', {
          metadata: { email: email.toLowerCase(), customerId }
        });

        // Persist the customer ID to the existing user
        if (existingUser && !existingUser.stripeCustomerId) {
          await db.update(users)
            .set({ stripeCustomerId: customerId, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));

          logger.info('Persisted Stripe customer ID to existing user', {
            metadata: { userId: existingUser.id, customerId }
          });
        }
      }
    }

    // Create Embedded Checkout Session
    // Note: Using redirect_on_completion: 'never' because we handle navigation
    // via onComplete callback in the frontend component
    const session = await stripe.checkout.sessions.create({
      customer: customerId, // undefined is ok - Stripe will create customer and collect email
      mode: 'subscription',
      ui_mode: 'embedded',
      redirect_on_completion: 'never',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tier,
        billingPeriod,
        ...(email && email.includes('@') ? { 
          customerEmail: email.toLowerCase(),
          isNewUser: existingUser ? 'false' : 'true'
        } : {}),
      },
      subscription_data: {
        metadata: {
          tier,
          billingPeriod,
          ...(email && email.includes('@') ? { customerEmail: email.toLowerCase() } : {}),
        },
      },
    });

    logger.info('Created Stripe embedded checkout session', {
      metadata: {
        sessionId: session.id,
        email: email || 'none (Stripe will collect)',
        tier,
        billingPeriod,
        priceId: plan.priceId,
        isNewUser: existingUser ? false : 'unknown',
      }
    });

    res.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error: any) {
    logger.error('Failed to create embedded checkout session', {
      error: error.message,
      metadata: {
        email: req.body?.email,
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

// POST /api/stripe/checkout/standard - Quick checkout for Standard plan
router.post('/checkout/standard', rateLimits.publicCheckout, async (req, res) => {
  try {
    const { billingPeriod = 'monthly' } = req.body;
    
    // Validate billingPeriod
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return res.status(400).json({ 
        error: 'Invalid billing period. Must be monthly or yearly' 
      });
    }

    // Get pricing plan for Standard (basic tier)
    const plan = getPriceByTierAndPeriod('basic', billingPeriod);
    if (!plan) {
      return res.status(400).json({ error: 'Pricing plan not available' });
    }

    // Get app URL for success/cancel redirects
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    // Create Checkout Session (redirect mode)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
      metadata: {
        tier: 'basic',
        billingPeriod,
      },
    });

    logger.info('Created Standard plan checkout session', {
      metadata: {
        sessionId: session.id,
        billingPeriod,
        priceId: plan.priceId,
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Failed to create Standard checkout session', {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// POST /api/stripe/checkout/pro - Quick checkout for Pro plan
router.post('/checkout/pro', rateLimits.publicCheckout, async (req, res) => {
  try {
    const { billingPeriod = 'monthly' } = req.body;
    
    // Validate billingPeriod
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return res.status(400).json({ 
        error: 'Invalid billing period. Must be monthly or yearly' 
      });
    }

    // Get pricing plan for Pro tier
    const plan = getPriceByTierAndPeriod('pro', billingPeriod);
    if (!plan) {
      return res.status(400).json({ error: 'Pricing plan not available' });
    }

    // Get app URL for success/cancel redirects
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    // Create Checkout Session (redirect mode)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
      metadata: {
        tier: 'pro',
        billingPeriod,
      },
    });

    logger.info('Created Pro plan checkout session', {
      metadata: {
        sessionId: session.id,
        billingPeriod,
        priceId: plan.priceId,
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Failed to create Pro checkout session', {
      error: error.message,
    });
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// Create Stripe Checkout Session (authenticated - legacy for logged-in users)
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { tier, billingPeriod = 'monthly' } = req.body;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate tier and billingPeriod
    const validTiers = ['basic', 'pro'];
    const validBillingPeriods = ['monthly', 'yearly'];
    
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be one of: basic, pro' 
      });
    }
    
    if (!billingPeriod || !validBillingPeriods.includes(billingPeriod)) {
      return res.status(400).json({ 
        error: 'Invalid billing period. Must be one of: monthly, yearly' 
      });
    }

    // Get pricing plan
    const plan = getPriceByTierAndPeriod(tier, billingPeriod);
    if (!plan) {
      return res.status(400).json({ error: 'Pricing plan not available' });
    }

    // Get or create Stripe customer
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          flintUserId: userId,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await db.update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, userId));

      logger.info('Created Stripe customer', {
        metadata: { userId, customerId }
      });
    }

    // Get app URL for success/cancel redirects
    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
      metadata: {
        flintUserId: userId,
        tier,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          flintUserId: userId,
          tier,
          billingPeriod,
        },
      },
    });

    logger.info('Created Stripe checkout session', {
      metadata: {
        sessionId: session.id,
        userId,
        tier,
        billingPeriod,
        priceId: plan.priceId,
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url,
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

// Create Customer Portal Session
router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const appUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    logger.info('Created customer portal session', {
      metadata: { userId, customerId: user.stripeCustomerId }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Failed to create portal session', { error: error.message });
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Verify checkout session (called after successful payment redirect)
router.get('/verify-session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Verify this session belongs to the user
    if (session.metadata?.flintUserId !== userId) {
      return res.status(403).json({ error: 'Session does not belong to user' });
    }

    logger.info('Checkout session verified', {
      metadata: { sessionId, userId, tier: session.metadata?.tier }
    });

    res.json({
      success: true,
      tier: session.metadata?.tier,
      subscriptionId: session.subscription,
    });
  } catch (error: any) {
    logger.error('Failed to verify session', { error: error.message });
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Stripe Webhook Handler
export async function handleStripeWebhook(req: ExpressRequest, res: any) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    logger.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const bodyString = req.body;
    
    if (!STRIPE_CONFIG.webhookSecret) {
      logger.warn('STRIPE_WEBHOOK_SECRET not configured - skipping signature verification');
      event = JSON.parse(bodyString);
    } else {
      event = stripe.webhooks.constructEvent(
        bodyString,
        sig,
        STRIPE_CONFIG.webhookSecret
      );
    }
  } catch (err: any) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info('Stripe webhook received', {
    metadata: { type: event.type, id: event.id }
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info('Unhandled webhook event type', { metadata: { type: event.type } });
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle checkout.session.completed
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Get email from metadata (if pre-filled) or from Stripe's customer_details (if collected by Stripe)
    const emailSource = session.metadata?.customerEmail ? 'metadata' : 
                        session.customer_details?.email ? 'customer_details' :
                        session.customer_email ? 'customer_email' : 'none';
    const customerEmail = session.metadata?.customerEmail || session.customer_details?.email || session.customer_email;
    const tier = session.metadata?.tier as 'basic' | 'pro';
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    logger.info('Processing checkout session', {
      metadata: {
        sessionId: session.id,
        emailSource,
        hasEmail: !!customerEmail,
        tier,
        stripeCustomerId,
      }
    });

    // STEP 1: Try to find user by Stripe customer ID first (most reliable)
    let [user] = await db.select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);

    // STEP 2: If not found, try by email
    if (!user && customerEmail) {
      [user] = await db.select()
        .from(users)
        .where(eq(users.email, customerEmail.toLowerCase()))
        .limit(1);
    }

    if (user) {
      // EXISTING USER: Update subscription (idempotent)
      await db.update(users)
        .set({
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      logger.info('Subscription activated for existing user', {
        metadata: { userId: user.id, tier, subscriptionId: stripeSubscriptionId }
      });

      // Send Slack notification for subscription (non-blocking)
      notifyNewSubscription({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        email: user.email || customerEmail || 'No email',
        tier: tier || 'unknown',
        billingPeriod: session.metadata?.billingPeriod || 'monthly',
        subscriptionTime: new Date(),
      }).catch(err => {
        logger.error('Failed to send Slack notification for subscription', { error: err });
      });
    } else if (customerEmail) {
      // NEW USER: Create account with password reset token
      const userId = crypto.randomUUID();
      
      const [newUser] = await db.insert(users)
        .values({
          id: userId,
          email: customerEmail.toLowerCase(),
          passwordHash: null, // No password yet
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .onConflictDoNothing(); // Idempotent: If race condition, ignore

      if (!newUser) {
        // Race condition: user was created by another webhook retry
        logger.warn('User already exists (race condition)', {
          metadata: { email: customerEmail, stripeCustomerId }
        });
        return;
      }

      // Generate password reset token (24 hour expiry)
      const plainToken = generateSecureToken();
      const tokenHash = hashToken(plainToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.insert(passwordResetTokens).values({
        userId: newUser.id,
        token: tokenHash,
        tokenType: 'password_reset',
        expiresAt,
        used: false,
      });

      // Build password setup link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'https://www.flint-investing.com';
      const passwordSetupLink = `${baseUrl}/setup-password?token=${plainToken}`;

      // Send password reset email with password setup link
      const emailResult = await sendPasswordResetEmail(
        customerEmail,
        newUser.firstName || 'User',
        passwordSetupLink
      );

      if (!emailResult.success) {
        // Log error but don't throw - Stripe will retry webhook if we throw
        logger.error('Failed to send welcome email to new user', {
          metadata: { 
            userId: newUser.id, 
            email: customerEmail, 
            error: emailResult.error 
          }
        });
      }

      logger.info('New user account created via Stripe checkout', {
        metadata: { 
          userId: newUser.id, 
          email: customerEmail, 
          tier, 
          subscriptionId: stripeSubscriptionId 
        }
      });

      // Log structured metric for Grafana
      logger.logMetric('user_signup', {
        user_id: newUser.id,
        subscription_tier: tier,
        subscription_status: 'active',
        signup_source: 'stripe_checkout',
      });

      // Send Slack notification for new subscription (non-blocking)
      notifyNewSubscription({
        name: newUser.firstName || 'New User',
        email: customerEmail,
        tier: tier || 'unknown',
        billingPeriod: session.metadata?.billingPeriod || 'monthly',
        subscriptionTime: new Date(),
      }).catch(err => {
        logger.error('Failed to send Slack notification for new subscription', { error: err });
      });
    } else {
      logger.error('Cannot create user - no email in metadata', {
        metadata: { sessionId: session.id }
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle checkout.session.completed', { error: error.message });
    throw error;
  }
}

// Handle customer.subscription.updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.flintUserId;
    let finalUserId: string | null = null;
    let previousTier: string | null = null;

    if (!userId) {
      // Try to find user by Stripe customer ID
      const [user] = await db.select()
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);

      if (!user) {
        logger.error('User not found for subscription update', {
          metadata: { subscriptionId: subscription.id, customerId: subscription.customer }
        });
        return;
      }

      finalUserId = user.id;
      previousTier = user.subscriptionTier;

      // Determine tier from price ID
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId ? getTierByPriceId(priceId) : null;

      const status = subscription.status === 'active' || subscription.status === 'trialing' 
        ? 'active' 
        : subscription.status === 'canceled' 
          ? 'cancelled' 
          : 'expired';

      await db.update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          ...(tier && { subscriptionTier: tier }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Track subscription metrics
      if (tier && previousTier !== tier) {
        const tierHierarchy: Record<string, number> = { free: 0, basic: 1, pro: 2, premium: 3 };
        const isNew = !user.stripeSubscriptionId || previousTier === 'free';
        const isUpgrade = tierHierarchy[tier] > tierHierarchy[previousTier || 'free'];
        
        if (isNew) {
          logger.logMetric('subscription_started', {
            user_id: user.id,
            subscription_id: subscription.id,
            plan_tier: tier,
            billing_period: subscription.metadata?.billingPeriod || 'monthly',
            mrr: subscription.items.data[0]?.price.unit_amount ? (subscription.items.data[0].price.unit_amount / 100) : 0,
            trial_used: subscription.status === 'trialing',
          });
        } else if (isUpgrade) {
          logger.logMetric('subscription_upgraded', {
            user_id: user.id,
            subscription_id: subscription.id,
            from_tier: previousTier,
            to_tier: tier,
          });
        } else {
          logger.logMetric('subscription_downgraded', {
            user_id: user.id,
            subscription_id: subscription.id,
            from_tier: previousTier,
            to_tier: tier,
          });
        }
      }

      logger.info('Subscription updated', {
        metadata: { userId: user.id, subscriptionId: subscription.id, status, tier }
      });
    } else {
      // User ID from metadata
      finalUserId = userId;
      
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      previousTier = user?.subscriptionTier || null;

      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId ? getTierByPriceId(priceId) : null;

      const status = subscription.status === 'active' || subscription.status === 'trialing' 
        ? 'active' 
        : subscription.status === 'canceled' 
          ? 'cancelled' 
          : 'expired';

      await db.update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          ...(tier && { subscriptionTier: tier }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Track subscription metrics
      if (tier && previousTier !== tier) {
        const tierHierarchy: Record<string, number> = { free: 0, basic: 1, pro: 2, premium: 3 };
        const isNew = !user?.stripeSubscriptionId || previousTier === 'free';
        const isUpgrade = tierHierarchy[tier] > tierHierarchy[previousTier || 'free'];
        
        if (isNew) {
          logger.logMetric('subscription_started', {
            user_id: userId,
            subscription_id: subscription.id,
            plan_tier: tier,
            billing_period: subscription.metadata?.billingPeriod || 'monthly',
            mrr: subscription.items.data[0]?.price.unit_amount ? (subscription.items.data[0].price.unit_amount / 100) : 0,
            trial_used: subscription.status === 'trialing',
          });
        } else if (isUpgrade) {
          logger.logMetric('subscription_upgraded', {
            user_id: userId,
            subscription_id: subscription.id,
            from_tier: previousTier,
            to_tier: tier,
          });
        } else {
          logger.logMetric('subscription_downgraded', {
            user_id: userId,
            subscription_id: subscription.id,
            from_tier: previousTier,
            to_tier: tier,
          });
        }
      }

      logger.info('Subscription updated', {
        metadata: { userId, subscriptionId: subscription.id, status, tier }
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle subscription update', { error: error.message });
    throw error;
  }
}

// Handle customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.flintUserId;

    if (!userId) {
      // Find user by customer ID
      const [user] = await db.select()
        .from(users)
        .where(eq(users.stripeCustomerId, subscription.customer as string))
        .limit(1);

      if (!user) {
        logger.error('User not found for subscription deletion', {
          metadata: { subscriptionId: subscription.id }
        });
        return;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const previousTier = priceId ? getTierByPriceId(priceId) : user.subscriptionTier;

      await db.update(users)
        .set({
          subscriptionTier: 'free',
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Track subscription cancellation metric
      logger.logMetric('subscription_canceled', {
        user_id: user.id,
        subscription_id: subscription.id,
        plan_tier: previousTier,
        mrr_lost: subscription.items.data[0]?.price.unit_amount ? (subscription.items.data[0].price.unit_amount / 100) : 0,
      });

      logger.info('Subscription cancelled', {
        metadata: { userId: user.id, subscriptionId: subscription.id }
      });
    } else {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const priceId = subscription.items.data[0]?.price.id;
      const previousTier = priceId ? getTierByPriceId(priceId) : user?.subscriptionTier;

      await db.update(users)
        .set({
          subscriptionTier: 'free',
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Track subscription cancellation metric
      logger.logMetric('subscription_canceled', {
        user_id: userId,
        subscription_id: subscription.id,
        plan_tier: previousTier,
        mrr_lost: subscription.items.data[0]?.price.unit_amount ? (subscription.items.data[0].price.unit_amount / 100) : 0,
      });

      logger.info('Subscription cancelled', {
        metadata: { userId, subscriptionId: subscription.id }
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle subscription deletion', { error: error.message });
    throw error;
  }
}

// Handle invoice.paid
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    const invoiceData = invoice as any;
    const subscriptionId = typeof invoiceData.subscription === 'string' 
      ? invoiceData.subscription 
      : invoiceData.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    // Find user by subscription ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscriptionId))
      .limit(1);

    if (user) {
      await db.update(users)
        .set({
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Track payment succeeded metric
      logger.logMetric('payment_succeeded', {
        user_id: user.id,
        subscription_id: subscriptionId,
        amount: invoice.amount_paid / 100,
        plan_tier: user.subscriptionTier,
      });

      logger.info('Invoice paid - subscription active', {
        metadata: { userId: user.id, invoiceId: invoice.id }
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle invoice.paid', { error: error.message });
    throw error;
  }
}

// Handle invoice.payment_failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const invoiceData = invoice as any;
    const subscriptionId = typeof invoiceData.subscription === 'string' 
      ? invoiceData.subscription 
      : invoiceData.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    // Find user by subscription ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscriptionId))
      .limit(1);

    if (user) {
      // Track payment failed metric
      logger.logMetric('payment_failed', {
        user_id: user.id,
        subscription_id: subscriptionId,
        amount: invoice.amount_due / 100,
        failure_reason: invoice.last_payment_error?.message || 'unknown',
        retry_count: invoice.attempt_count || 0,
      });

      logger.warn('Invoice payment failed', {
        metadata: { userId: user.id, invoiceId: invoice.id }
      });
    }
  } catch (error: any) {
    logger.error('Failed to handle invoice.payment_failed', { error: error.message });
    throw error;
  }
}

// Register webhook route
router.post('/webhook', handleStripeWebhook);

export default router;
