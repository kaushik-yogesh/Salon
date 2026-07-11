import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@12345';

async function findOrCreateRole(name, priority, description) {
  let role = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (!role) {
    role = await prisma.role.create({ data: { name, priority, description } });
  }
  return role;
}

async function main() {
  console.log('🌱 Seeding SalonOS Database...\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Create Roles
  const superAdminRole = await findOrCreateRole('SUPER_ADMIN', 0, 'Platform Super Administrator');
  const ownerRole = await findOrCreateRole('TENANT_OWNER', 1, 'Salon Owner');
  const receptionistRole = await findOrCreateRole('RECEPTIONIST', 5, 'Salon Receptionist');
  const workerRole = await findOrCreateRole('WORKER', 5, 'Salon Worker / Stylist');
  const customerRole = await findOrCreateRole('CUSTOMER', 10, 'End Customer');

  // 2. Create Super Admin (no tenant)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@salonos.dev',
      passwordHash,
      status: 'ACTIVE',
      profile: { create: { firstName: 'Super', lastName: 'Admin' } },
      userRoles: { create: [{ roleId: superAdminRole.id }] }
    }
  });
  console.log(`✅ Super Admin: admin@salonos.dev / ${DEMO_PASSWORD}`);

  // 3. Create Tenant + Branch
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Glamour Studio',
      setupComplete: true,
      branches: {
        create: [{ name: 'Downtown Branch', address: '123 Main Street, New York, NY 10001' }]
      }
    },
    include: { branches: true }
  });
  const branch = tenant.branches[0];
  console.log(`✅ Tenant: ${tenant.name} (Branch: ${branch.name})`);

  // 4. Create Owner
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@salonos.dev',
      passwordHash,
      status: 'ACTIVE',
      tenantId: tenant.id,
      profile: { create: { firstName: 'Sarah', lastName: 'Mitchell' } },
      userRoles: { create: [{ roleId: ownerRole.id }] }
    }
  });
  console.log(`✅ Owner: owner@salonos.dev / ${DEMO_PASSWORD}`);

  // 5. Create Receptionist
  const receptionUser = await prisma.user.create({
    data: {
      email: 'reception@salonos.dev',
      passwordHash,
      status: 'ACTIVE',
      tenantId: tenant.id,
      profile: { create: { firstName: 'Emily', lastName: 'Chen' } },
      userRoles: { create: [{ roleId: receptionistRole.id }] }
    }
  });
  console.log(`✅ Receptionist: reception@salonos.dev / ${DEMO_PASSWORD}`);

  // 6. Create 3 Workers with WorkerProfiles
  const workerData = [
    { email: 'worker1@salonos.dev', first: 'Alex', last: 'Rivera', title: 'Senior Stylist', commission: 40 },
    { email: 'worker2@salonos.dev', first: 'Jordan', last: 'Taylor', title: 'Colorist', commission: 35 },
    { email: 'worker3@salonos.dev', first: 'Sam', last: 'Patel', title: 'Junior Stylist', commission: 25 },
  ];

  const workerProfiles = [];
  for (const w of workerData) {
    const user = await prisma.user.create({
      data: {
        email: w.email,
        passwordHash,
        status: 'ACTIVE',
        tenantId: tenant.id,
        profile: { create: { firstName: w.first, lastName: w.last } },
        userRoles: { create: [{ roleId: workerRole.id }] }
      }
    });

    const wp = await prisma.workerProfile.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        title: w.title,
        bio: `${w.title} with years of experience`,
        baseCommissionRate: w.commission,
        isActive: true
      }
    });

    // Create weekly schedule (Mon-Sat 9am-6pm, Sunday off)
    for (let day = 0; day <= 6; day++) {
      await prisma.workerSchedule.create({
        data: {
          workerProfileId: wp.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          isWorking: day !== 0 // Sunday off
        }
      });
    }

    workerProfiles.push(wp);
    console.log(`✅ Worker: ${w.email} / ${DEMO_PASSWORD} (${w.title})`);
  }

  // 7. Create Categories & Services
  const categoriesData = [
    { name: 'Hair Cuts', description: 'Haircut services', color: '#4F46E5', services: [
      { name: 'Men\'s Haircut', price: 30, duration: 30 },
      { name: 'Women\'s Haircut', price: 50, duration: 45 },
      { name: 'Kids Haircut', price: 20, duration: 20 },
    ]},
    { name: 'Hair Color', description: 'Coloring and highlights', color: '#DC2626', services: [
      { name: 'Full Color', price: 120, duration: 90 },
      { name: 'Highlights', price: 150, duration: 120 },
      { name: 'Balayage', price: 200, duration: 150 },
    ]},
    { name: 'Styling', description: 'Blow dry and styling', color: '#059669', services: [
      { name: 'Blow Dry', price: 40, duration: 30 },
      { name: 'Updo', price: 80, duration: 60 },
      { name: 'Bridal Styling', price: 250, duration: 120 },
    ]},
    { name: 'Treatments', description: 'Hair treatments', color: '#D97706', services: [
      { name: 'Deep Conditioning', price: 60, duration: 45 },
      { name: 'Keratin Treatment', price: 300, duration: 180 },
      { name: 'Scalp Treatment', price: 45, duration: 30 },
    ]},
    { name: 'Beard & Grooming', description: 'Beard and grooming services', color: '#7C3AED', services: [
      { name: 'Beard Trim', price: 15, duration: 15 },
      { name: 'Hot Towel Shave', price: 35, duration: 30 },
      { name: 'Facial Grooming', price: 40, duration: 30 },
    ]},
  ];

  const allServices = [];
  for (let i = 0; i < categoriesData.length; i++) {
    const cat = await prisma.serviceCategory.create({
      data: {
        tenantId: tenant.id,
        name: categoriesData[i].name,
        description: categoriesData[i].description,
        color: categoriesData[i].color,
        displayOrder: i,
        status: 'ACTIVE'
      }
    });

    for (const svc of categoriesData[i].services) {
      const service = await prisma.service.create({
        data: {
          tenantId: tenant.id,
          categoryId: cat.id,
          name: svc.name,
          basePrice: svc.price,
          baseDuration: svc.duration,
          status: 'ACTIVE'
        }
      });
      allServices.push(service);
    }
  }
  console.log(`✅ Created ${categoriesData.length} categories, ${allServices.length} services`);

  // Link all workers to all services
  for (const wp of workerProfiles) {
    for (const svc of allServices) {
      await prisma.workerService.create({
        data: { workerProfileId: wp.id, serviceId: svc.id }
      });
    }
  }

  // 8. Create 20 Customers
  const customerNames = [
    ['Jane', 'Doe'], ['John', 'Smith'], ['Maria', 'Garcia'], ['David', 'Wilson'], ['Lisa', 'Brown'],
    ['Michael', 'Jones'], ['Jennifer', 'Davis'], ['Robert', 'Miller'], ['Linda', 'Moore'], ['William', 'Anderson'],
    ['Patricia', 'Thomas'], ['James', 'Jackson'], ['Barbara', 'White'], ['Charles', 'Harris'], ['Susan', 'Martin'],
    ['Joseph', 'Thompson'], ['Margaret', 'Robinson'], ['Thomas', 'Clark'], ['Dorothy', 'Lewis'], ['Daniel', 'Walker'],
  ];

  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const c = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName: customerNames[i][0],
        lastName: customerNames[i][1],
        email: `customer${i + 1}@example.com`,
        phone: `555-${String(i + 1).padStart(4, '0')}`,
      }
    });
    customers.push(c);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // 9. Create 20 Appointments with varied statuses
  const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  const today = new Date();
  const appointments = [];

  for (let i = 0; i < 20; i++) {
    const dayOffset = Math.floor(i / 4) - 2;
    const apptDate = new Date(today);
    apptDate.setDate(apptDate.getDate() + dayOffset);
    apptDate.setHours(0, 0, 0, 0);

    const hour = 9 + (i % 8);
    const svc = allServices[i % allServices.length];
    const wp = workerProfiles[i % workerProfiles.length];
    const cust = customers[i % customers.length];
    const status = statuses[i % statuses.length];

    const startTime = new Date(apptDate);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + svc.baseDuration * 60000);

    const qrToken = `QR-SEED-${String(i + 1).padStart(4, '0')}-${Date.now()}`;

    const appt = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: cust.id,
        date: apptDate,
        totalPrice: svc.basePrice,
        totalDuration: svc.baseDuration,
        status,
        qrToken,
        qrExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        services: {
          create: [{
            serviceId: svc.id,
            workerProfileId: wp.id,
            startTime,
            endTime,
            price: svc.basePrice,
            status: status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
          }]
        }
      }
    });
    appointments.push({ ...appt, status });
  }
  console.log(`✅ Created ${appointments.length} appointments`);

  // 10. Create Invoices for COMPLETED appointments
  const completedAppts = appointments.filter(a => a.status === 'COMPLETED');
  for (const appt of completedAppts) {
    await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        appointmentId: appt.id,
        customerId: appt.customerId,
        subtotal: appt.totalPrice,
        taxTotal: appt.totalPrice * 0.1,
        grandTotal: appt.totalPrice * 1.1,
        status: 'PAID',
        lineItems: {
          create: [{
            type: 'SERVICE',
            name: 'Service Charge',
            quantity: 1,
            unitPrice: appt.totalPrice,
            totalPrice: appt.totalPrice,
          }]
        },
        payments: {
          create: [{
            amount: appt.totalPrice * 1.1,
            method: 'CASH',
            status: 'COMPLETED'
          }]
        }
      }
    });
  }
  console.log(`✅ Created ${completedAppts.length} invoices`);

  // 11. Create Inventory
  const products = [
    { sku: 'PROD-001', name: 'Professional Shampoo', retailPrice: 24.99, costPrice: 12.00, stock: 25 },
    { sku: 'PROD-002', name: 'Moisturizing Conditioner', retailPrice: 22.99, costPrice: 10.00, stock: 20 },
    { sku: 'PROD-003', name: 'Hair Serum', retailPrice: 34.99, costPrice: 15.00, stock: 15 },
    { sku: 'PROD-004', name: 'Hair Spray - Strong Hold', retailPrice: 18.99, costPrice: 8.00, stock: 30 },
    { sku: 'PROD-005', name: 'Color Developer', retailPrice: 12.99, costPrice: 5.00, stock: 3 },
    { sku: 'PROD-006', name: 'Bleach Powder', retailPrice: 15.99, costPrice: 6.00, stock: 2 },
    { sku: 'PROD-007', name: 'Styling Gel', retailPrice: 14.99, costPrice: 6.50, stock: 18 },
    { sku: 'PROD-008', name: 'Beard Oil', retailPrice: 19.99, costPrice: 8.00, stock: 12 },
    { sku: 'PROD-009', name: 'Pomade', retailPrice: 16.99, costPrice: 7.00, stock: 10 },
    { sku: 'PROD-010', name: 'Keratin Treatment Kit', retailPrice: 89.99, costPrice: 40.00, stock: 5 },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        sku: p.sku, name: p.name, retailPrice: p.retailPrice, costPrice: p.costPrice,
        stockQuantity: p.stock, lowStockThreshold: 5, status: 'ACTIVE'
      }
    });
  }
  console.log(`✅ Created ${products.length} inventory products`);

  // 12. Create Expenses
  const expenseCategories = ['SUPPLIES', 'RENT', 'UTILITIES', 'MARKETING', 'PETTY_CASH', 'SUPPLIES', 'UTILITIES', 'OTHER'];
  for (let i = 0; i < 8; i++) {
    const expenseDate = new Date(today);
    expenseDate.setDate(expenseDate.getDate() - i * 3);
    await prisma.expense.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        category: expenseCategories[i],
        amount: 50 + Math.floor(Math.random() * 500),
        date: expenseDate,
        description: `${expenseCategories[i]} expense #${i + 1}`,
        status: 'APPROVED'
      }
    });
  }
  console.log(`✅ Created 8 expenses`);

  // 13. Create Payroll
  const periodStart = new Date(today); periodStart.setDate(1);
  const periodEnd = new Date(today); periodEnd.setMonth(periodEnd.getMonth() + 1, 0);

  const salaryRun = await prisma.salaryRun.create({
    data: { tenantId: tenant.id, periodStart, periodEnd, status: 'DRAFT', totalPayout: 0 }
  });

  let totalPayout = 0;
  for (const wp of workerProfiles) {
    const baseSalary = 2000 + Math.floor(Math.random() * 1000);
    const commissionTotal = 300 + Math.floor(Math.random() * 500);
    const tipsTotal = 50 + Math.floor(Math.random() * 150);
    const net = baseSalary + commissionTotal + tipsTotal;
    totalPayout += net;
    await prisma.salaryRunItem.create({
      data: { salaryRunId: salaryRun.id, workerProfileId: wp.id, baseSalary, commissionTotal, tipsTotal, netPayout: net }
    });
  }
  await prisma.salaryRun.update({ where: { id: salaryRun.id }, data: { totalPayout } });
  console.log(`✅ Created payroll (total: $${totalPayout.toFixed(2)})`);

  console.log('\n========================================');
  console.log('🎉 Seeding Complete!');
  console.log('========================================');
  console.log(`\nAll accounts use password: ${DEMO_PASSWORD}\n`);
  console.log('  Super Admin:   admin@salonos.dev');
  console.log('  Salon Owner:   owner@salonos.dev');
  console.log('  Receptionist:  reception@salonos.dev');
  console.log('  Worker 1:      worker1@salonos.dev');
  console.log('  Worker 2:      worker2@salonos.dev');
  console.log('  Worker 3:      worker3@salonos.dev');
  console.log('\n========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
