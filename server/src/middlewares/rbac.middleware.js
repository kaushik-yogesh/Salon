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

      // Hardcoded RBAC for default system roles to prevent 403s on unseeded DB
      const defaultPermissions = {
        'RECEPTIONIST': [
          'HR.READ', 'DASHBOARD.READ', 'BOOKINGS.READ', 'BOOKINGS.CREATE', 'BOOKINGS.UPDATE', 'BOOKINGS.DELETE',
          'CUSTOMERS.READ', 'CUSTOMERS.CREATE', 'CUSTOMERS.UPDATE', 'CUSTOMERS.DELETE',
          'CATALOG.READ', 'INVENTORY.READ', 'INVENTORY.UPDATE', 'BILLING.CREATE', 'BILLING.READ', 'BILLING.UPDATE', 'POS.READ', 'POS.CREATE', 'POS.UPDATE'
        ],
        'WORKER': [
          'HR.READ', 'BOOKINGS.READ', 'BOOKINGS.UPDATE', 'CATALOG.READ', 'EXECUTION.READ', 'EXECUTION.UPDATE', 'INVENTORY.READ', 'FINANCE.READ'
        ]
      };

      const roleNames = user.userRoles.map(ur => ur.role.name);
      
      let hasPermission = false;
      for (const roleName of roleNames) {
        if (defaultPermissions[roleName]) {
          const permString = `${moduleName}.${action}`;
          if (defaultPermissions[roleName].includes(permString)) {
            hasPermission = true;
            break;
          }
        }
      }

      if (hasPermission) {
        return next();
      }

      // Find if any of the user's roles have the required permission in DB
      const roleIds = user.userRoles.map(ur => ur.roleId);
      
      const dbHasPermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: { in: roleIds },
          permission: {
            module: moduleName,
            action: action
          }
        }
      });

      if (!dbHasPermission) {
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
