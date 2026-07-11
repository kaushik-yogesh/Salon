import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';

export const getAllInvoices = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { status, limit = 50 } = req.query;

    const where = { tenantId };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        lineItems: true,
        payments: true,
        branch: { select: { name: true } }
      }
    });

    // Manually fetch appointments and customers since relations are missing in Invoice schema
    const appointmentIds = invoices.map(i => i.appointmentId).filter(Boolean);
    const appointments = await prisma.appointment.findMany({
      where: { id: { in: appointmentIds } }
    });

    const customerIds = [...new Set([
      ...invoices.map(i => i.customerId),
      ...appointments.map(a => a.customerId)
    ])].filter(Boolean);

    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } }
    });

    const enrichedInvoices = invoices.map(inv => {
      let appt = null;
      if (inv.appointmentId) {
        const baseAppt = appointments.find(a => a.id === inv.appointmentId);
        if (baseAppt) {
          appt = {
            ...baseAppt,
            customer: customers.find(c => c.id === baseAppt.customerId) || null
          };
        }
      }
      return { ...inv, appointment: appt };
    });

    sendSuccess(res, enrichedInvoices);
  } catch (error) {
    next(error);
  }
};
