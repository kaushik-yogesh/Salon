import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Unauthorized');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
      include: {
        userRoles: { include: { role: true } }
      }
    });

    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    req.user = user;
    req.tenant = { id: user.tenantId };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token invalid or expired'));
    } else {
      next(error);
    }
  }
};

export const requireTenantContext = (req, res, next) => {
  if (!req.tenant || !req.tenant.id) {
    return next(new ForbiddenError('Tenant context required'));
  }
  next();
};
