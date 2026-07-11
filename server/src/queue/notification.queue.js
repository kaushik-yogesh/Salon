import { Queue, Worker } from 'bullmq';
import { prisma } from '../utils/db.js';
import { sendSms } from '../services/sms.service.js';

// Setup Redis Connection
const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  }
};

// Create the Queue
export const notificationQueue = new Queue('notificationQueue', { connection });

notificationQueue.on('error', err => {
  if (err.code !== 'ECONNREFUSED') {
    console.error('[Redis Queue Error]:', err.message);
  }
});

// Process Jobs asynchronously (BullMQ Worker)
const notificationWorker = new Worker('notificationQueue', async (job) => {
  const { tenantId, customerId, type, subject, body, toPhone } = job.data;
  
  if (type === 'SMS' && toPhone) {
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

// Suppress unhandled redis connection errors crashing the server
notificationWorker.on('error', err => {
  if (err.code === 'ECONNREFUSED') {
    // Silently ignore to prevent log spam
  } else {
    console.error('[Redis Worker Error]:', err.message);
  }
});

