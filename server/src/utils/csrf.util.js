import { csrfSync } from "csrf-sync";

export const {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  getTokenFromState,
  storeTokenInState,
  revokeToken,
  csrfSynchronisedProtection,
} = csrfSync({
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
  // Store the CSRF token in a cookie instead of req.session to remain stateless
  getTokenFromState: (req) => {
    return req.cookies['csrf-token'];
  },
  storeTokenInState: (req, token) => {
    req.res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
});
