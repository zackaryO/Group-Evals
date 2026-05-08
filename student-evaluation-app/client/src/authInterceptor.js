// authInterceptor.js
//
// Installs a global axios response interceptor: any 401 from the server is
// treated as "auth failed / token expired" and forces a full logout +
// redirect to /login. Imported once at app entry (index.js) for side effect.
//
// Why 401 specifically? The server middleware returns 401 only when the JWT
// is missing/invalid/expired. 403 means "authenticated but not authorized
// for THIS resource" — the user can stay logged in. Splitting these lets us
// boot stale sessions without kicking users out of pages they can't view
// (e.g. a student trying to read another student's record).

import axios from 'axios';

const TOKEN_KEYS = ['token', 'userId', 'role', 'username', 'firstName', 'lastName'];

let alreadyHandlingExpiry = false;

export function forceLogoutAndRedirect(reason = 'session_expired') {
  if (alreadyHandlingExpiry) return;
  alreadyHandlingExpiry = true;
  TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  // Full nav (not React Router) so every component remounts with no stale
  // user state. Pass a query so the login page can show a friendly note.
  const target = `/login?reason=${encodeURIComponent(reason)}`;
  // window.location.assign isn't mockable in jsdom tests; this guard makes
  // the helper tolerable to import from test files.
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign(target);
  }
}

export function installAuthInterceptor() {
  // Avoid double-install if the entry file is hot-reloaded in dev.
  if (axios.__authInterceptorInstalled) return;
  axios.__authInterceptorInstalled = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        forceLogoutAndRedirect('session_expired');
      }
      return Promise.reject(error);
    }
  );
}

// Install on import.
installAuthInterceptor();
