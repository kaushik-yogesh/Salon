import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_xEmcBq5lGrn4@ep-empty-tree-ao0e4unx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Salon",
        subscriptionTier: "BASIC",
        defaultCurrency: "USD",
        defaultTimezone: "UTC"
      }
    });
  }
  console.log("----------------------------------------");
  console.log("TENANT ID FOR TESTING:", tenant.id);
  console.log("----------------------------------------");
  process.exit(0);
}
main().catch(console.error);
