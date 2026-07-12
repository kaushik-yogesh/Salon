import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { UnauthorizedError, AppError, NotFoundError } from '../utils/errors.util.js';
import { sendSms } from '../services/sms.service.js';
import { sendEmail } from '../services/email.service.js';

const ACCESS_TOKEN_EXPIRY = '60d';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

const generateTokens = (userId, tenantId) => {
  const payload = tenantId ? { userId, tenantId } : { userId };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
};

// Helper to find or create a global role by name
const findOrCreateGlobalRole = async (name, priority, description) => {
  let role = await prisma.role.findFirst({ where: { name, tenantId: null } });
  if (!role) {
    role = await prisma.role.create({
      data: { name, priority, description }
    });
  }
  return role;
};

// Helper to assign a role to a user (idempotent)
const assignRole = async (userId, roleId) => {
  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId, roleId } }
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, roleId } });
  }
};

// Set refresh token cookie
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MS
  });
};

// 0. Check User (Decide between Password or OTP)
export const checkUser = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier) throw new AppError('Email or Phone is required', 400);

    const isEmail = identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier.trim() }
    });

    if (!user) {
      return sendSuccess(res, { exists: false, hasPassword: false });
    }

    const hasPassword = Boolean(user.passwordHash);
    return sendSuccess(res, { exists: true, hasPassword });
  } catch (error) {
    next(error);
  }
};

// 1. Request OTP
export const requestOtp = async (req, res, next) => {
  try {
    const { identifier } = req.body; // Can be email or phone
    if (!identifier) throw new AppError('Email or Phone is required', 400);

    const otp = process.env.NODE_ENV === 'production' ? crypto.randomInt(100000, 999999).toString() : '123456';
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    await prisma.otpVerification.upsert({
      where: { identifier },
      update: { otp, expiresAt, attempts: 0 },
      create: { identifier, otp, expiresAt }
    });

    const isEmail = identifier.includes('@');
    const bodyText = `Your SalonOS verification code is: ${otp}. It will expire in 10 minutes.`;

    if (!isEmail) {
      // Format Indian numbers automatically for Twilio if needed
      let toPhone = identifier;
      if (toPhone.length === 10 && !toPhone.startsWith('+')) {
        toPhone = '+91' + toPhone;
      }
      
      try {
        await sendSms(toPhone, bodyText);
      } catch (smsErr) {
        console.error('[Auth] Failed to send real SMS:', smsErr.message);
        if (process.env.NODE_ENV !== 'production') {
          console.warn('⚠️ [Auth] DEV MODE: SMS failed but continuing so you can test using terminal logs.');
        } else {
          await prisma.otpVerification.delete({ where: { identifier } });
          throw new AppError(`Failed to send SMS: ${smsErr.message}`, 500);
        }
      }
    } else {
      // Send Email
      try {
        if (process.env.NODE_ENV === 'production') {
          await sendEmail(identifier, 'Your SalonOS Login Code', bodyText, `<p>Your verification code is: <strong>${otp}</strong></p>`);
        }
      } catch (emailErr) {
        console.error('[Auth] Failed to send real Email:', emailErr.message);
        await prisma.otpVerification.delete({ where: { identifier } });
        throw new AppError(`Failed to send email: ${emailErr.message}`, 500);
      }
    }

    // Always log OTP for easy local development debugging
    console.log(`\n========================================`);
    console.log(`🔑 OTP for ${identifier}: ${otp}`);
    console.log(`========================================\n`);

    sendSuccess(res, { message: `OTP sent to ${identifier}` });
  } catch (error) {
    next(error);
  }
};

// 1b. Request Email OTP specifically
export const requestEmailOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) throw new AppError('Valid email is required', 400);

    const otp = process.env.NODE_ENV === 'production' ? crypto.randomInt(100000, 999999).toString() : '123456';
    const expiresAt = new Date(Date.now() + 10 * 60000);

    await prisma.otpVerification.upsert({
      where: { identifier: email },
      update: { otp, expiresAt, attempts: 0 },
      create: { identifier: email, otp, expiresAt }
    });

    const bodyText = `Your SalonOS email verification code is: ${otp}.`;
    try {
      if (process.env.NODE_ENV === 'production') {
        await sendEmail(email, 'Verify your Email for SalonOS', bodyText, `<p>Your email verification code is: <strong>${otp}</strong></p>`);
      }
    } catch (emailErr) {
      console.error('[Auth] Failed to send real Email:', emailErr.message);
      await prisma.otpVerification.delete({ where: { identifier: email } });
      throw new AppError(`Failed to send email: ${emailErr.message}. Please check your configuration or try again.`, 500);
    }

    console.log(`\n========================================`);
    console.log(`✉️ EMAIL OTP for ${email}: ${otp}`);
    console.log(`========================================\n`);

    sendSuccess(res, { message: `Email OTP sent to ${email}` });
  } catch (error) {
    next(error);
  }
};

// 2. Verify OTP & Login
export const verifyOtp = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    
    const record = await prisma.otpVerification.findUnique({ where: { identifier } });
    if (!record) throw new AppError('No OTP request found for this identifier', 400);
    
    if (record.attempts >= 5) throw new AppError('Too many failed attempts. Request a new OTP.', 400);
    if (new Date() > record.expiresAt) throw new AppError('OTP has expired', 400);

    if (record.otp !== otp) {
      await prisma.otpVerification.update({
        where: { identifier },
        data: { attempts: record.attempts + 1 }
      });
      throw new UnauthorizedError('Invalid OTP');
    }

    await prisma.otpVerification.delete({ where: { identifier } });

    const isEmail = identifier.includes('@');
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier },
      include: { profile: true, userRoles: { include: { role: true } } }
    });

    if (!user) {
      const registerToken = jwt.sign({ identifier, isEmail }, process.env.JWT_SECRET, { expiresIn: '15m' });
      return sendSuccess(res, { 
        isRegistered: false, 
        registerToken, 
        message: 'OTP Verified. Please complete registration.' 
      });
    }

    if (user.status === 'SUSPENDED') throw new UnauthorizedError('Account suspended');

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const { accessToken, refreshToken } = generateTokens(user.id, user.tenantId);
    setRefreshCookie(res, refreshToken);

    // Include setupComplete for owner context
    let setupComplete = true;
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      setupComplete = tenant?.setupComplete ?? true;
    }

    sendSuccess(res, { isRegistered: true, user: { ...user, setupComplete }, accessToken });
  } catch (error) {
    next(error);
  }
};

// 2b. Login with Password
export const loginWithPassword = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) throw new AppError('Identifier and password are required', 400);

    const isEmail = identifier.includes('@');
    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: normalizedIdentifier } : { phone: normalizedIdentifier },
      include: { profile: true, userRoles: { include: { role: true } } }
    });

    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (!user.passwordHash) throw new UnauthorizedError('Please login with OTP');
    if (user.status === 'SUSPENDED') throw new UnauthorizedError('Account suspended');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedError('Invalid credentials');

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const { accessToken, refreshToken } = generateTokens(user.id, user.tenantId);
    setRefreshCookie(res, refreshToken);

    // Include setupComplete for owner context
    let setupComplete = true;
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      setupComplete = tenant?.setupComplete ?? true;
    }

    sendSuccess(res, { user: { ...user, setupComplete }, accessToken });
  } catch (error) {
    next(error);
  }
};

// 3. Complete Registration (via OTP token)
export const register = async (req, res, next) => {
  try {
    const { registerToken, role, firstName, lastName, salonName, email, emailOtp, password } = req.body;

    if (!registerToken) throw new UnauthorizedError('Registration token required');
    const decoded = jwt.verify(registerToken, process.env.JWT_SECRET);
    const { identifier, isEmail } = decoded;

    // If they registered via Phone, they MUST provide an email and emailOtp now
    if (!isEmail) {
      if (!email || !emailOtp) throw new AppError('Email and Email OTP are required to complete registration.', 400);
      
      const record = await prisma.otpVerification.findUnique({ where: { identifier: email } });
      if (!record || record.otp !== emailOtp || new Date() > record.expiresAt) {
        throw new AppError('Invalid or expired Email OTP', 400);
      }
      
      await prisma.otpVerification.delete({ where: { identifier: email } });
    }

    let user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier }
    });

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: isEmail ? identifier : email,
          phone: !isEmail ? identifier : null,
          status: 'ACTIVE',
          passwordHash,
          profile: { create: { firstName, lastName } }
        }
      });
    } else if (passwordHash && !user.passwordHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });
    }

    let targetTenantId = null;

    if (role === 'OWNER') {
      if (!salonName) throw new AppError('Salon Name is required to register as Owner', 400);
      
      // Create Tenant + default Branch in one transaction
      const newTenant = await prisma.tenant.create({
        data: {
          name: salonName,
          setupComplete: false,
          branches: {
            create: [{ name: 'Main Branch' }]
          }
        }
      });
      targetTenantId = newTenant.id;

      const ownerRole = await findOrCreateGlobalRole('TENANT_OWNER', 1, 'Salon Owner');
      await assignRole(user.id, ownerRole.id);
      await prisma.user.update({ where: { id: user.id }, data: { tenantId: targetTenantId } });

    } else if (role === 'CUSTOMER') {
      const customerRole = await findOrCreateGlobalRole('CUSTOMER', 10, 'Customer');
      await assignRole(user.id, customerRole.id);
    }

    // Refresh user object with all relations
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true, userRoles: { include: { role: true } } }
    });

    const { accessToken, refreshToken } = generateTokens(updatedUser.id, updatedUser.tenantId);
    setRefreshCookie(res, refreshToken);

    // Include setupComplete
    let setupComplete = true;
    if (updatedUser.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: updatedUser.tenantId } });
      setupComplete = tenant?.setupComplete ?? true;
    }

    sendSuccess(res, { user: { ...updatedUser, setupComplete }, accessToken }, 201);
  } catch (error) {
    next(error);
  }
};

// 3b. Standalone Registration (no OTP token required — direct email+password signup)
export const registerDirect = async (req, res, next) => {
  try {
    const { email, password, confirmPassword, role, firstName, lastName, salonName } = req.body;

    if (!email || !password) throw new AppError('Email and password are required', 400);
    if (!email.includes('@')) throw new AppError('Valid email is required', 400);
    if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);
    if (password !== confirmPassword) throw new AppError('Passwords do not match', 400);
    if (!firstName || !lastName) throw new AppError('First name and last name are required', 400);
    if (!['OWNER', 'CUSTOMER'].includes(role)) throw new AppError('Role must be OWNER or CUSTOMER', 400);

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) throw new AppError('An account with this email already exists. Please log in.', 400);

    const passwordHash = await bcrypt.hash(password, 10);

    let user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        status: 'ACTIVE',
        passwordHash,
        profile: { create: { firstName, lastName } }
      }
    });

    let targetTenantId = null;

    if (role === 'OWNER') {
      if (!salonName) throw new AppError('Salon Name is required to register as Owner', 400);

      const newTenant = await prisma.tenant.create({
        data: {
          name: salonName,
          setupComplete: false,
          branches: {
            create: [{ name: 'Main Branch' }]
          }
        }
      });
      targetTenantId = newTenant.id;

      const ownerRole = await findOrCreateGlobalRole('TENANT_OWNER', 1, 'Salon Owner');
      await assignRole(user.id, ownerRole.id);
      await prisma.user.update({ where: { id: user.id }, data: { tenantId: targetTenantId } });

    } else if (role === 'CUSTOMER') {
      const customerRole = await findOrCreateGlobalRole('CUSTOMER', 10, 'Customer');
      await assignRole(user.id, customerRole.id);
    }

    // Refresh user object
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true, userRoles: { include: { role: true } } }
    });

    const { accessToken, refreshToken } = generateTokens(updatedUser.id, updatedUser.tenantId);
    setRefreshCookie(res, refreshToken);

    const setupComplete = role === 'OWNER' ? false : true;

    sendSuccess(res, { user: { ...updatedUser, setupComplete }, accessToken }, 201);
  } catch (error) {
    next(error);
  }
};

// 4. Update Email for Existing Users
export const updateEmail = async (req, res, next) => {
  try {
    const { email, emailOtp } = req.body;
    if (!email || !emailOtp) throw new AppError('Email and Email OTP are required.', 400);

    const record = await prisma.otpVerification.findUnique({ where: { identifier: email } });
    if (!record || record.otp !== emailOtp || new Date() > record.expiresAt) {
      throw new AppError('Invalid or expired Email OTP', 400);
    }
    
    await prisma.otpVerification.delete({ where: { identifier: email } });

    // Ensure email is not already taken by another user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== req.user.id) {
      throw new AppError('This email is already registered to another account.', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { email },
      include: { profile: true, userRoles: { include: { role: true } } }
    });

    sendSuccess(res, { user: updatedUser, message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
};

// Clear refresh token cookie
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedError('Refresh token required');

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');

    const user = await prisma.user.findUnique({ where: { id: decoded.userId, deletedAt: null } });
    if (!user || user.status === 'SUSPENDED') throw new UnauthorizedError('User not found or suspended');

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.tenantId);
    setRefreshCookie(res, newRefreshToken);

    sendSuccess(res, { accessToken });
  } catch (_error) {
    clearRefreshCookie(res);
    next(new UnauthorizedError('Invalid refresh token'));
  }
};

export const logout = async (req, res, next) => {
  try {
    clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true, userRoles: { include: { role: true } }, WorkerProfile: true }
    });
    
    if (!user) throw new NotFoundError('User not found');

    // Include setupComplete for tenant owners
    let setupComplete = true;
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      setupComplete = tenant?.setupComplete ?? true;
    }

    sendSuccess(res, { user: { ...user, setupComplete } });
  } catch (error) {
    next(error);
  }
};
