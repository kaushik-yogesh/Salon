export const getPortalRouteByRoles = (userRoles = []) => {
    const roleNames = userRoles.map((role) => role?.name).filter(Boolean);

    if (roleNames.includes('SUPER_ADMIN')) return '/admin';
    if (roleNames.includes('TENANT_OWNER')) return '/owner';
    if (roleNames.includes('RECEPTIONIST')) return '/reception';
    if (roleNames.includes('WORKER')) return '/worker';
    if (roleNames.includes('CUSTOMER')) return '/customer';
    return '/login'; // Fallback to login instead of assuming owner
};
