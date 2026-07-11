import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import webpush from 'web-push';

const router = express.Router();

router.use(requireAuth);

router.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    
    // Save or update subscription
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });

    sendSuccess(res, subscription, 201);
  } catch (error) {
    next(error);
  }
});

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    await prisma.pushSubscription.delete({ where: { endpoint } });
    sendSuccess(res, { message: 'Unsubscribed' });
  } catch (error) {
    next(error);
  }
});

// Test endpoint to trigger a push
router.post('/test', async (req, res, next) => {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId: req.user.id } });
    
    const payload = JSON.stringify({ title: 'Test Notification', body: 'This is a test web push!' });
    
    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { auth: sub.auth, p256dh: sub.p256dh }
      };
      await webpush.sendNotification(pushConfig, payload).catch(err => console.error(err));
    }

    sendSuccess(res, { message: 'Sent' });
  } catch (error) {
    next(error);
  }
});

export default router;
