import { prisma } from './src/utils/db.js';

const tenants = await prisma.tenant.findMany({
  select: {
    id: true,
    name: true,
    _count: {
      select: {
        serviceCategories: true,
        services: true,
      },
    },
  },
});

console.log(JSON.stringify(tenants, null, 2));
await prisma.$disconnect();
