import { jest } from '@jest/globals';

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
  serviceCategory: { findMany: jest.fn(), create: jest.fn() },
  service: { count: jest.fn(), create: jest.fn() }
};

jest.unstable_mockModule('../src/utils/db.js', () => ({ prisma: mockPrisma }));
jest.unstable_mockModule('../src/utils/notification.service.js', () => ({ sendBookingConfirmation: jest.fn() }));
jest.unstable_mockModule('../src/services/appointment.service.js', () => ({ validateWorkerAvailability: jest.fn() }));

const { getPublicCatalog } = await import('../src/controllers/public.controller.js');

describe('getPublicCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a fallback catalog when a tenant has no active services', async () => {
    const req = { params: { tenantId: 'tenant-123' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-123', status: 'ACTIVE' });
    mockPrisma.serviceCategory.findMany.mockResolvedValue([]);
    mockPrisma.service.count.mockResolvedValue(0);
    mockPrisma.serviceCategory.create.mockResolvedValue({
      id: 'category-1',
      tenantId: 'tenant-123',
      name: 'General Services',
      description: 'Default services for booking',
      status: 'ACTIVE'
    });
    mockPrisma.service.create.mockResolvedValue({
      id: 'service-1',
      tenantId: 'tenant-123',
      categoryId: 'category-1',
      name: 'Standard Service',
      basePrice: 50,
      baseDuration: 60,
      status: 'ACTIVE'
    });

    await getPublicCatalog(req, res, next);

    expect(mockPrisma.serviceCategory.create).toHaveBeenCalled();
    expect(mockPrisma.service.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(next).not.toHaveBeenCalled();
  });
});
