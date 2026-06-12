// student-evaluation-app/client/src/utils/auth.js
//
// Client-side token validity helpers. The server signs JWTs with a 2h
// expiry, but the browser previously only learned a token was dead when an
// API call came back 401 — so pages that don't immediately hit the API could
// be viewed long after the session expired. These helpers let the route
// guards (and an app-level watchdog) detect an expired/invalid token up front
// and bounce the user to /login without waiting for a failed request.

// Decode a JWT payload WITHOUT verifying its signature. This is only used to
// read the `exp` claim for a fast client-side expiry check — the server still
// fully verifies every token, so a forged payload buys nothing.
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // JWT uses base64url; convert to standard base64 before atob.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// True when a token is present, decodable, and (if it carries an `exp` claim)
// not yet past its expiry. A token we can't decode is treated as invalid.
// A decodable token with no `exp` is treated as valid and left to the server
// to reject — we never want to lock out a structurally fine token.
export function isTokenValid(token) {
  if (!token) return false;
  const decoded = decodeJwt(token);
  if (!decoded) return false;
  if (typeof decoded.exp === 'number') {
    // `exp` is seconds since epoch; Date.now() is ms.
    return decoded.exp * 1000 > Date.now();
  }
  return true;
}

// Convenience: is the stored session token currently valid?
export function isAuthenticated() {
  return isTokenValid(localStorage.getItem('token'));
}
