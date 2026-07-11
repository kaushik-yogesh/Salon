import { prisma } from './db.js';

/**
 * Logs an activity to the database audit trail.
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} [params.actorId] - User ID who performed the action (null if system)
 * @param {string} params.action - e.g., 'USER_CREATED', 'ROLE_UPDATED'
 * @param {string} params.resourceType - e.g., 'User', 'Role'
 * @param {string} params.resourceId - ID of the affected resource
 * @param {Object} [params.oldValues] - Previous state
 * @param {Object} [params.newValues] - New state
 * @param {string} [params.ipAddress]
 */
export const logActivity = async ({
  tenantId,
  actorId,
  action,
  resourceType,
  resourceId,
  oldValues = null,
  newValues = null,
  ipAddress = null
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId,
        actorId,
        action,
        resourceType,
        resourceId,
        oldValues,
        newValues,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
};
