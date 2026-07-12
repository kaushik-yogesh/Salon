import { Queue, Worker } from 'bullmq';
import { prisma } from '../utils/db.js';
import axios from 'axios';
import { sendSms } from '../services/sms.service.js';

// Parse Redis URL or fallback to host/port env vars
function getRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        maxRetriesPerRequest: null,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 50, 2000);
        }
      };
    } catch (e) {
      console.warn('[Queue] Invalid REDIS_URL, queue disabled');
      return null;
    }
  }
  
  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      }
    };
  }

  // No Redis configured — queue will be a no-op
  return null;
}

const connection = getRedisConnection();

// Create the Queue (or a stub if Redis is unavailable)
let notificationQueue;
let notificationWorker;

if (connection) {
  notificationQueue = new Queue('notificationQueue', { connection });

  notificationQueue.on('error', err => {
    if (err.code !== 'ECONNREFUSED') {
      console.error('[Redis Queue Error]:', err.message);
    }
  });

  // Process Jobs asynchronously (BullMQ Worker)
  notificationWorker = new Worker('notificationQueue', async (job) => {
    const { tenantId, customerId, type, subject, body, toPhone } = job.data;
    
    if (type === 'WEBHOOK') {
      const webhooks = await prisma.webhook.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { event: 'ALL' },
            { event: subject }
          ]
        }
      });
      
      for (const hook of webhooks) {
        try {
          await axios.post(hook.url, JSON.parse(body), {
            headers: hook.secret ? { 'x-salon-signature': hook.secret } : {}
          });
          console.log(`[Queue] Successfully fired webhook to ${hook.url}`);
        } catch (err) {
          console.error(`[Queue] Failed to fire webhook to ${hook.url}:`, err.message);
        }
      }
      return; // Do not log webhooks to NotificationLog
    } else if (type === 'SMS' && toPhone) {
      // Send actual SMS via Twilio
      await sendSms(toPhone, body);
    } else {
      // Simulated external provider delay for Email/Push
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }
    
    console.log(`[Queue] Processed ${type} Notification.`);

    // Create the record indicating it was actually SENT via the queue
    await prisma.notificationLog.create({
      data: {
        tenantId,
        customerId,
        type,
        subject,
        body,
        status: 'SENT',
        sentAt: new Date()
      }
    });

  }, { connection });

  notificationWorker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
  });

  notificationWorker.on('error', err => {
    if (err.code === 'ECONNREFUSED') {
      // Silently ignore to prevent log spam
    } else {
      console.error('[Redis Worker Error]:', err.message);
    }
  });

  console.log('[Queue] BullMQ notification queue initialized with Redis');
} else {
  // No-op queue stub for environments without Redis
  notificationQueue = {
    add: async (name, data) => {
      console.log(`[Queue Stub] Would have queued ${name}:`, data?.type || 'unknown');
      return { id: 'stub' };
    }
  };
  console.log('[Queue] No Redis available — notifications will be logged but not queued');
}

export { notificationQueue };

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, closing worker...`);
  if (notificationWorker) await notificationWorker.close();
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
