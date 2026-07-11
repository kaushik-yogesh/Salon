import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  try {
    let ownerRole = await prisma.role.findFirst({ where: { name: 'TENANT_OWNER', tenantId: null } });
    if (!ownerRole) {
      console.log('Creating TENANT_OWNER role...');
      ownerRole = await prisma.role.create({ data: { name: 'TENANT_OWNER', priority: 1, description: 'Salon Owner' } });
    }

    // Find users with tenantId but no userRoles
    const users = await prisma.user.findMany({
      where: {
        tenantId: { not: null },
        userRoles: { none: {} }
      }
    });

    for (const user of users) {
      console.log(`Fixing role for user ${user.email || user.phone}`);
      await prisma.userRole.create({
        data: { userId: user.id, roleId: ownerRole.id }
      });
    }

    console.log(`Fixed ${users.length} users.`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
