import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, passwordResetTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/logger';
import { getVariantByCTA, getLemonSqueezyCheckoutUrl, LEMONSQUEEZY_VARIANTS } from '../lib/lemonsqueezy-config';
import { sendApprovalEmail } from '../services/email';
import { generateSecureToken, hashToken } from '../lib/token-utils';

const router = Router();

// Get checkout URL for a specific CTA/variant using Lemon Squeezy API
router.get('/checkout/:ctaId', async (req, res) => {
  try {
    const { ctaId } = req.params;
    const { email } = req.query;

    // Get variant config by CTA ID
    const variant = getVariantByCTA(ctaId);
    
    if (!variant) {
      logger.warn('Invalid CTA ID requested', { metadata: { ctaId } });
      return res.status(400).json({ 
        error: 'Invalid pricing option' 
      });
    }

    // Get Lemon Squeezy credentials
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;

    if (!apiKey || !storeId) {
      logger.error('Lemon Squeezy credentials not configured');
      return res.status(500).json({ 
        error: 'Payment system not configured' 
      });
    }

    // Generate base URL for success redirect
    const baseUrl = process.env.REPLIT_DEPLOYMENT 
      ? `https://${process.env.REPLIT_DEPLOYMENT}` 
      : 'http://localhost:5000';

    // Create checkout via Lemon Squeezy API
    const checkoutData: any = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            success_url: email 
              ? `${baseUrl}/payment-success?email=${encodeURIComponent(email as string)}`
              : `${baseUrl}/payment-success`
          },
          checkout_data: {},
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variant.variantId,
            },
          },
        },
      },
    };

    // Add email to checkout if provided
    if (email) {
      checkoutData.data.attributes.checkout_data.email = email;
    }

    // Make API request to create checkout
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Lemon Squeezy API error', { 
        metadata: {
          status: response.status,
          error: errorData 
        }
      });
      return res.status(500).json({ 
        error: 'Unable to create checkout session' 
      });
    }

    const checkoutResponse = await response.json();
    const checkoutUrl = checkoutResponse.data?.attributes?.url;

    if (!checkoutUrl) {
      logger.error('No checkout URL in API response', { 
        metadata: { response: checkoutResponse }
      });
      return res.status(500).json({ 
        error: 'Invalid checkout response' 
      });
    }

    logger.info('Checkout created via API', { 
      metadata: {
        ctaId, 
        variantId: variant.variantId,
        checkoutId: checkoutResponse.data?.id,
        email: email || 'none'
      }
    });

    res.json({ 
      checkoutUrl,
      variant: {
        name: variant.name,
        price: variant.price,
        tier: variant.tier
      }
    });
  } catch (error: any) {
    logger.error('Checkout creation failed', { error: error.message });
    res.status(500).json({ 
      error: 'Unable to create checkout' 
    });
  }
});

// Webhook endpoint for Lemon Squeezy events
// NOTE: This route MUST receive raw body for signature verification
// It's configured in server/index.ts to use express.raw() middleware
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get signature from header
    const signature = req.headers['x-signature'] as string;
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
    // Lemon Squeezy sends signature as hex string in X-Signature header
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
          bodyLength: bodyString.length,
          secretLength: webhookSecret.length
        }
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload only after signature verification
    const payload = JSON.parse(bodyString);
    const eventName = payload.meta?.event_name;
    const eventData = payload.data;

    logger.info('Lemon Squeezy webhook received', { 
      metadata: {
        eventName,
        orderId: eventData?.id 
      }
    });

    // Handle order_created event
    if (eventName === 'order_created') {
      await handleOrderCreated(eventData);
    }

    // Handle subscription events
    if (eventName === 'subscription_created') {
      await handleSubscriptionCreated(eventData);
    }

    if (eventName === 'subscription_updated') {
      await handleSubscriptionUpdated(eventData);
    }

    if (eventName === 'subscription_cancelled') {
      await handleSubscriptionCancelled(eventData);
    }

    // Respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle order_created event
async function handleOrderCreated(orderData: any) {
  try {
    const orderId = orderData.id;
    const attributes = orderData.attributes;
    
    const customerEmail = attributes.user_email;
    const customerName = attributes.user_name;
    const customerId = attributes.customer_id;
    const variantId = attributes.first_order_item?.variant_id?.toString();
    const orderNumber = attributes.order_number;
    const total = attributes.total;
    const status = attributes.status;

    logger.info('Processing order_created event', { 
      metadata: {
        orderId,
        customerEmail,
        variantId,
        status 
      }
    });

    // Only process paid orders
    if (status !== 'paid') {
      logger.info('Order not paid, skipping', { metadata: { orderId, status } });
      return;
    }

    // Get variant configuration
    const variant = variantId ? LEMONSQUEEZY_VARIANTS[variantId] : null;
    if (!variant) {
      logger.error('Unknown variant ID in order', { metadata: { orderId, variantId } });
      return;
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, customerEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists - update their subscription tier
      await db
        .update(users)
        .set({
          subscriptionTier: variant.tier,
          subscriptionStatus: 'active',
          lemonSqueezyOrderId: orderId,
          lemonSqueezyCustomerId: customerId?.toString(),
          lemonSqueezyVariantId: variantId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser[0].id));

      logger.info('Updated existing user subscription', { 
        metadata: {
          userId: existingUser[0].id,
          tier: variant.tier 
        }
      });
    } else {
      // Create new user account
      const userId = uuidv4();
      const firstName = customerName?.split(' ')[0] || 'User';
      const lastName = customerName?.split(' ').slice(1).join(' ') || '';

      await db.insert(users).values({
        id: userId,
        email: customerEmail,
        firstName,
        lastName: lastName || undefined,
        subscriptionTier: variant.tier,
        subscriptionStatus: 'active',
        lemonSqueezyOrderId: orderId,
        lemonSqueezyCustomerId: customerId?.toString(),
        lemonSqueezyVariantId: variantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info('Created new user from order', { 
        metadata: {
          userId,
          email: customerEmail,
          tier: variant.tier 
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
          expiresAt,
          used: false,
        });

        // Generate password setup link
        const baseUrl = process.env.REPLIT_DEPLOYMENT 
          ? `https://${process.env.REPLIT_DEPLOYMENT}` 
          : 'http://localhost:5000';
        const passwordSetupLink = `${baseUrl}/setup-password?token=${plainToken}`;

        // Send approval email with password setup link
        await sendApprovalEmail(customerEmail, firstName, passwordSetupLink);
        logger.info('Password setup email sent', { metadata: { email: customerEmail } });
      } catch (emailError: any) {
        logger.error('Failed to send password setup email', { 
          error: emailError.message,
          metadata: { email: customerEmail }
        });
      }
    }
  } catch (error: any) {
    logger.error('Failed to process order_created event', { 
      error: error.message,
      metadata: { orderId: orderData?.id }
    });
    throw error;
  }
}

// Handle subscription_created event
async function handleSubscriptionCreated(subscriptionData: any) {
  try {
    const attributes = subscriptionData.attributes;
    const customerEmail = attributes.user_email;
    const variantId = attributes.variant_id?.toString();

    logger.info('Processing subscription_created event', { 
      metadata: {
        customerEmail,
        variantId 
      }
    });

    // Find variant config
    const variant = variantId ? LEMONSQUEEZY_VARIANTS[variantId] : null;
    if (!variant) {
      logger.error('Unknown variant ID in subscription', { metadata: { variantId } });
      return;
    }

    // Update user subscription status
    await db
      .update(users)
      .set({
        subscriptionTier: variant.tier,
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.email, customerEmail));

    logger.info('Updated user subscription from webhook', { 
      metadata: {
        email: customerEmail,
        tier: variant.tier 
      }
    });
  } catch (error: any) {
    logger.error('Failed to process subscription_created event', { 
      error: error.message 
    });
  }
}

// Handle subscription_updated event
async function handleSubscriptionUpdated(subscriptionData: any) {
  try {
    const attributes = subscriptionData.attributes;
    const customerEmail = attributes.user_email;
    const status = attributes.status;

    logger.info('Processing subscription_updated event', { 
      metadata: {
        customerEmail,
        status 
      }
    });

    // Map Lemon Squeezy status to our status
    const subscriptionStatus = status === 'active' ? 'active' : 
                               status === 'cancelled' ? 'cancelled' : 
                               status === 'expired' ? 'expired' : 'active';

    await db
      .update(users)
      .set({
        subscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.email, customerEmail));

    logger.info('Updated subscription status', { 
      metadata: {
        email: customerEmail,
        status: subscriptionStatus 
      }
    });
  } catch (error: any) {
    logger.error('Failed to process subscription_updated event', { 
      error: error.message 
    });
  }
}

// Handle subscription_cancelled event
async function handleSubscriptionCancelled(subscriptionData: any) {
  try {
    const attributes = subscriptionData.attributes;
    const customerEmail = attributes.user_email;

    logger.info('Processing subscription_cancelled event', { 
      metadata: { customerEmail }
    });

    await db
      .update(users)
      .set({
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(users.email, customerEmail));

    logger.info('Cancelled user subscription', { 
      metadata: { email: customerEmail }
    });
  } catch (error: any) {
    logger.error('Failed to process subscription_cancelled event', { 
      error: error.message 
    });
  }
}

export default router;
