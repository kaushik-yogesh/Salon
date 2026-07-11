import webpush from 'web-push';

console.log('\n--- VAPID Key Generator ---');
console.log('Generating secure VAPID keys for Web Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ Keys generated successfully!\n');

console.log('====================================================');
console.log('ADD THESE TO YOUR BACKEND .env FILE (server/.env):');
console.log('====================================================');
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"\n`);

console.log('====================================================');
console.log('ADD THIS TO YOUR FRONTEND .env FILE (client/.env):');
console.log('====================================================');
console.log(`VITE_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"\n`);
