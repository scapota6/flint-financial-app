import { Router } from 'express';
import { captureEvent, identifyUser } from '../lib/posthog';

const router = Router();

/**
 * GET /api/posthog/test
 * Test endpoint to verify PostHog integration
 */
router.get('/test', async (req, res) => {
  try {
    const testId = `test-${Date.now()}`;
    
    // Send test event
    captureEvent(testId, 'posthog_test_event', {
      source: 'api_endpoint',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    
    // Also identify the test user
    identifyUser(testId, {
      name: 'Test User',
      test: true
    });
    
    res.json({
      success: true,
      message: 'PostHog test events sent',
      distinctId: testId,
      events: [
        'posthog_test_event',
        'identify'
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
