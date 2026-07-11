import { prisma } from '../utils/db.js';

export const requirePermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      }

      // If Super Admin or Tenant Owner logic applies, bypass check
      // Tenant isolation is handled by requireTenantContext and query filters
      const hasFullAccess = user.userRoles.some(ur => ur.role.name === 'SUPER_ADMIN' || ur.role.name === 'TENANT_OWNER');
      if (hasFullAccess) {
        return next();
      }

      // Find if any of the user's roles have the required permission
      const roleIds = user.userRoles.map(ur => ur.roleId);
      
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: { in: roleIds },
          permission: {
            module: moduleName,
            action: action
          }
        }
      });

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: { message: `Forbidden: Requires ${moduleName}.${action} permission` } 
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
