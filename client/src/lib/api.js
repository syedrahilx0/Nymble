const JWT_KEY = 'nymble.jwt';

export const getJwt = () => localStorage.getItem(JWT_KEY);
export const setJwt = (t) => localStorage.setItem(JWT_KEY, t);
export const clearJwt = () => localStorage.removeItem(JWT_KEY);

// The raw Nymble token is shown once by the server, so the browser keeps it per account.
export const tokenStore = {
  get: (uid) => (uid ? localStorage.getItem(`nymble.token.${uid}`) : null),
  set: (uid, t) => localStorage.setItem(`nymble.token.${uid}`, t),
  clear: (uid) => localStorage.removeItem(`nymble.token.${uid}`),
};

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || 'Something went wrong. Try again.');
    this.status = status;
    this.code = data?.code;
    this.fields = data?.fields || {};
    this.data = data || {};
  }
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const jwt = getJwt();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { message: 'Cannot reach the server. Check that the API is running.', code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && ['unauthenticated', 'invalid_session'].includes(data.code)) window.dispatchEvent(new Event('nymble:logout'));
    throw new ApiError(res.status, data);
  }
  return data;
}
