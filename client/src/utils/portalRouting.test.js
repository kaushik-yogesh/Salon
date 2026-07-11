import test from 'node:test';
import assert from 'node:assert/strict';
import { getPortalRouteByRoles } from './portalRouting.js';

test('maps owner roles to the owner portal', () => {
    assert.equal(getPortalRouteByRoles([{ name: 'TENANT_OWNER' }]), '/owner');
});

test('maps admin roles to the admin portal', () => {
    assert.equal(getPortalRouteByRoles([{ name: 'SUPER_ADMIN' }]), '/admin');
});

test('maps customers to the customer portal', () => {
    assert.equal(getPortalRouteByRoles([{ name: 'CUSTOMER' }]), '/customer');
});
