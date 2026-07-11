import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.util.js';

export const getRoles = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    // Fetch tenant-specific roles and global default roles (tenantId = null)
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { tenantId: tenantId },
          { tenantId: null }
        ]
      },
      include: {
        permissions: {
          include: { permission: true }
        }
      },
      orderBy: { priority: 'asc' }
    });

    sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { name, description, priority, permissions } = req.body; // permissions is array of permissionIds

    const role = await prisma.role.create({
      data: {
        tenantId,
        name,
        description,
        isCustom: true,
        priority: priority || 10,
        permissions: {
          create: permissions.map(permissionId => ({
            permission: { connect: { id: permissionId } }
          }))
        }
      }
    });

    sendSuccess(res, role, 201);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, description, priority, permissions } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    
    if (!existingRole || existingRole.tenantId !== tenantId) {
      throw new NotFoundError('Role not found or you do not have permission to modify it');
    }

    if (!existingRole.isCustom) {
      throw new ForbiddenError('Cannot modify system default roles');
    }

    // Prepare update data
    const updateData = { name, description, priority };

    // If permissions array provided, we overwrite existing permissions for this role
    if (permissions !== undefined) {
      // First delete existing mappings
      await prisma.rolePermission.deleteMany({
        where: { roleId: id }
      });
      
      updateData.permissions = {
        create: permissions.map(permissionId => ({
          permission: { connect: { id: permissionId } }
        }))
      };
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData
    });

    sendSuccess(res, updatedRole);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    const existingRole = await prisma.role.findUnique({ where: { id } });
    
    if (!existingRole || existingRole.tenantId !== tenantId) {
      throw new NotFoundError('Role not found or you do not have permission to delete it');
    }

    if (!existingRole.isCustom) {
      throw new ForbiddenError('Cannot delete system default roles');
    }

    await prisma.role.delete({ where: { id } });

    sendSuccess(res, { message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
};
