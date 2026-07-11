import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_xEmcBq5lGrn4@ep-empty-tree-ao0e4unx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  // Get the most recently registered user
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!user) {
    console.log("No users found in the database.");
    process.exit(1);
  }

  // Find or create SUPER_ADMIN role
  let role = await prisma.role.findFirst({
    where: { name: 'SUPER_ADMIN' }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full access'
      }
    });
  }

  // Assign the role to the user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id
    }
  });

  console.log(`Successfully made user ${user.email} a SUPER_ADMIN!`);
  process.exit(0);
}

main().catch(console.error);
