import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';


const DEMO_PASSWORD = 'Demo@12345';

// Helper to find or create a global role
const findOrCreateRole = async (name, priority, description) => {
  let role = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (!role) {
    role = await prisma.role.create({ data: { name, priority, description } });
  }
  return role;
};

// Create a user with profile, role, and optional tenant
const createDemoUser = async (email, firstName, lastName, roleName, tenantId, passwordHash) => {
  const role = await findOrCreateRole(
    roleName,
    roleName === 'SUPER_ADMIN' ? 0 : roleName === 'TENANT_OWNER' ? 1 : 10,
    `${roleName} role`
  );

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: 'ACTIVE',
      tenantId,
      profile: { create: { firstName, lastName } },
      userRoles: { create: [{ roleId: role.id }] }
    }
  });

  return user;
};

export const seedDemoData = async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // 1. Create Tenant + Branch
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

    // 2. Create Super Admin (no tenant)
    await createDemoUser('admin@salonos.dev', 'Super', 'Admin', 'SUPER_ADMIN', null, passwordHash);

    // 3. Create Owner
    await createDemoUser('owner@salonos.dev', 'Sarah', 'Mitchell', 'TENANT_OWNER', tenant.id, passwordHash);

    // 4. Create Receptionist
    await createDemoUser('reception@salonos.dev', 'Emily', 'Chen', 'RECEPTIONIST', tenant.id, passwordHash);

    // 5. Create 3 Workers with WorkerProfiles
    const workerEmails = [
      { email: 'worker1@salonos.dev', first: 'Alex', last: 'Rivera', title: 'Senior Stylist', commission: 40 },
      { email: 'worker2@salonos.dev', first: 'Jordan', last: 'Taylor', title: 'Colorist', commission: 35 },
      { email: 'worker3@salonos.dev', first: 'Sam', last: 'Patel', title: 'Junior Stylist', commission: 25 },
    ];

    const workerProfiles = [];
    for (const w of workerEmails) {
      const user = await createDemoUser(w.email, w.first, w.last, 'WORKER', tenant.id, passwordHash);
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

      // Create weekly schedule (Mon-Sat, 9am-6pm)
      for (let day = 1; day <= 6; day++) {
        await prisma.workerSchedule.create({
          data: {
            workerProfileId: wp.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '18:00',
            isWorking: true
          }
        });
      }
      // Sunday off
      await prisma.workerSchedule.create({
        data: { workerProfileId: wp.id, dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isWorking: false }
      });

      workerProfiles.push(wp);
    }

    // 6. Create Categories & Services
    const categories = [
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
    for (let i = 0; i < categories.length; i++) {
      const cat = await prisma.serviceCategory.create({
        data: {
          tenantId: tenant.id,
          name: categories[i].name,
          description: categories[i].description,
          color: categories[i].color,
          displayOrder: i,
          status: 'ACTIVE'
        }
      });

      for (const svc of categories[i].services) {
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

    // Link workers to services
    for (const wp of workerProfiles) {
      for (const svc of allServices) {
        await prisma.workerService.create({
          data: { workerProfileId: wp.id, serviceId: svc.id }
        });
      }
    }

    // 7. Create 20 Customers
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

    // 8. Create 20 Bookings with varied statuses
    const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    const today = new Date();
    const appointments = [];

    for (let i = 0; i < 20; i++) {
      const dayOffset = Math.floor(i / 4) - 2; // spread across -2 to +2 days from today
      const apptDate = new Date(today);
      apptDate.setDate(apptDate.getDate() + dayOffset);
      apptDate.setHours(0, 0, 0, 0);

      const hour = 9 + (i % 8); // 9am to 4pm
      const svc = allServices[i % allServices.length];
      const wp = workerProfiles[i % workerProfiles.length];
      const cust = customers[i % customers.length];
      const status = statuses[i % statuses.length];

      const startTime = new Date(apptDate);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + svc.baseDuration * 60000);

      const qrToken = `QR-${tenant.id.slice(0, 8)}-${String(i + 1).padStart(4, '0')}`;

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
      appointments.push(appt);
    }

    // 9. Create Invoices for COMPLETED appointments
    const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
    for (const appt of completedAppointments) {

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
              name: 'Service',
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

    // 10. Create Inventory Products
    const products = [
      { sku: 'PROD-001', name: 'Shampoo - Professional', retailPrice: 24.99, costPrice: 12.00, stock: 25 },
      { sku: 'PROD-002', name: 'Conditioner - Moisturizing', retailPrice: 22.99, costPrice: 10.00, stock: 20 },
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
          tenantId: tenant.id,
          branchId: branch.id,
          sku: p.sku,
          name: p.name,
          retailPrice: p.retailPrice,
          costPrice: p.costPrice,
          stockQuantity: p.stock,
          lowStockThreshold: 5,
          status: 'ACTIVE'
        }
      });
    }

    // 11. Create Expenses
    const expenseCategories = ['SUPPLIES', 'RENT', 'UTILITIES', 'MARKETING', 'PETTY_CASH', 'SUPPLIES', 'UTILITIES', 'OTHER'];
    for (let i = 0; i < 8; i++) {
      const expenseDate = new Date(today);
      expenseDate.setDate(expenseDate.getDate() - i * 3);
      await prisma.expense.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          category: expenseCategories[i],
          amount: 50 + Math.floor(Math.random() * 500),
          date: expenseDate,
          description: `${expenseCategories[i]} expense #${i + 1}`,
          status: 'APPROVED'
        }
      });
    }

    // 12. Create Payroll (SalaryRun)
    const periodStart = new Date(today);
    periodStart.setDate(1);
    const periodEnd = new Date(today);
    periodEnd.setMonth(periodEnd.getMonth() + 1, 0);

    const salaryRun = await prisma.salaryRun.create({
      data: {
        tenantId: tenant.id,
        periodStart,
        periodEnd,
        status: 'DRAFT',
        totalPayout: 0
      }
    });

    let totalPayout = 0;
    for (const wp of workerProfiles) {
      const baseSalary = 2000 + Math.floor(Math.random() * 1000);
      const commissionTotal = 300 + Math.floor(Math.random() * 500);
      const tipsTotal = 50 + Math.floor(Math.random() * 150);
      const net = baseSalary + commissionTotal + tipsTotal;
      totalPayout += net;

      await prisma.salaryRunItem.create({
        data: {
          salaryRunId: salaryRun.id,
          workerProfileId: wp.id,
          baseSalary,
          commissionTotal,
          tipsTotal,
          netPayout: net
        }
      });
    }

    await prisma.salaryRun.update({
      where: { id: salaryRun.id },
      data: { totalPayout }
    });

    // Return credentials
    const credentials = [
      { role: 'Super Admin', email: 'admin@salonos.dev', password: DEMO_PASSWORD, portal: '/admin' },
      { role: 'Salon Owner', email: 'owner@salonos.dev', password: DEMO_PASSWORD, portal: '/owner' },
      { role: 'Receptionist', email: 'reception@salonos.dev', password: DEMO_PASSWORD, portal: '/reception' },
      { role: 'Worker 1', email: 'worker1@salonos.dev', password: DEMO_PASSWORD, portal: '/worker' },
      { role: 'Worker 2', email: 'worker2@salonos.dev', password: DEMO_PASSWORD, portal: '/worker' },
      { role: 'Worker 3', email: 'worker3@salonos.dev', password: DEMO_PASSWORD, portal: '/worker' },
    ];

    console.log('\n========================================');
    console.log('✅ Demo data seeded successfully!');
    console.log('========================================');
    credentials.forEach(c => console.log(`  ${c.role}: ${c.email} / ${c.password}`));
    console.log('========================================\n');

    sendSuccess(res, {
      message: 'Demo data seeded successfully',
      tenantId: tenant.id,
      branchId: branch.id,
      credentials,
      counts: {
        categories: categories.length,
        services: allServices.length,
        workers: workerProfiles.length,
        customers: customers.length,
        appointments: appointments.length,
        products: products.length,
        expenses: 8,
        salaryRuns: 1
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const resetDemoData = async (req, res, next) => {
  try {
    // Delete in correct FK order to avoid constraint violations
    // Use deleteMany on all tables (cascades handle most, but we need to be thorough)
    await prisma.executionLog.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceLineItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.appointmentService.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.workerService.deleteMany({});
    await prisma.workerSchedule.deleteMany({});
    await prisma.timeOffRequest.deleteMany({});
    await prisma.salaryRunItem.deleteMany({});
    await prisma.salaryRun.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.workerProfile.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.notificationLog.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.packageService.deleteMany({});
    await prisma.package.deleteMany({});
    await prisma.serviceVariation.deleteMany({});
    await prisma.service.deleteMany({});
    await prisma.serviceCategory.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.device.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.otpVerification.deleteMany({});
    await prisma.branchAssignment.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.tenant.deleteMany({});

    console.log('\n========================================');
    console.log('🗑️  All data has been reset');
    console.log('========================================\n');

    sendSuccess(res, { message: 'All demo data has been reset. Database is clean.' });
  } catch (error) {
    next(error);
  }
};
