import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './cocktailsApi';

// The one test file that stubs `fetch`: it tests the request helper itself. Everything
// else mocks this module instead (see src/test/render.tsx).

const fetchMock = vi.fn();

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

const lastRequest = () => {
  const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('request helper', () => {
  it('sends cookies and stays same-origin', async () => {
    respond(200, []);
    await api.fetchOrders({ today: true, fulfilled: false });
    const { url, init } = lastRequest();
    expect(url).toBe('/api/orders/?today=true&fulfilled=false');
    expect(init.credentials).toBe('include');
  });

  it('adds the CSRF token to writes, read fresh from the cookie each time', async () => {
    respond(204);
    document.cookie = 'csrftoken=first; path=/';
    await api.logout();
    expect(lastRequest().headers['X-CSRFToken']).toBe('first');
    // Django rotates the token at login; a cached copy would break every later write.
    document.cookie = 'csrftoken=rotated; path=/';
    await api.logout();
    expect(lastRequest().headers['X-CSRFToken']).toBe('rotated');
  });

  it('does not send the CSRF token on reads', async () => {
    respond(200, { user: null });
    document.cookie = 'csrftoken=first; path=/';
    await api.fetchSession();
    expect(lastRequest().headers['X-CSRFToken']).toBeUndefined();
  });

  it('calls the unauthorized handler on a 401, and only on a 401', async () => {
    const onUnauthorized = vi.fn();
    api.setUnauthorizedHandler(onUnauthorized);
    respond(403, { detail: 'CSRF Failed' });
    await expect(api.fetchOrders()).rejects.toThrow();
    expect(onUnauthorized).not.toHaveBeenCalled();
    respond(401, { detail: 'Authentication credentials were not provided.' });
    await expect(api.fetchOrders()).rejects.toThrow('Failed to fetch orders');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    api.setUnauthorizedHandler(() => {});
  });
});

describe('auth calls', () => {
  it('fetchSession unwraps the user, or null when signed out', async () => {
    respond(200, { user: null });
    expect(await api.fetchSession()).toBeNull();
    respond(200, { user: { id: 1, username: 'sam', email: 's@example.com', fullname: '' } });
    expect((await api.fetchSession())?.username).toBe('sam');
  });

  it('login posts the identifier and password', async () => {
    respond(200, { user: { id: 1, username: 'sam', email: 's@example.com', fullname: '' } });
    await api.login('sam', 'pw');
    const { url, init } = lastRequest();
    expect(url).toBe('/api/auth/login/');
    expect(JSON.parse(init.body as string)).toEqual({ identifier: 'sam', password: 'pw' });
  });

  it("login passes on the server's message for a 400 or 429 only", async () => {
    respond(400, { detail: 'Incorrect email, username or password.' });
    await expect(api.login('sam', 'no')).rejects.toThrow('Incorrect email, username or password.');
    respond(429, { detail: 'Too many failed sign-in attempts. Please wait 30 minutes and try again.' });
    await expect(api.login('sam', 'no')).rejects.toThrow('Please wait 30 minutes');
    respond(403, { detail: 'CSRF Failed: CSRF token missing.' });
    await expect(api.login('sam', 'pw')).rejects.toThrow('Could not sign in. Reload the page and try again.');
  });
});

describe('current-password checks', () => {
  it('updateProfile and changePassword say how long to wait after too many tries', async () => {
    const detail = 'Too many requests. Please wait 45 minutes and try again.';
    respond(429, { detail });
    await expect(api.updateProfile({ email: 'new@example.com', current_password: 'pw' })).rejects.toThrow('Please wait 45 minutes');
    respond(429, { detail });
    await expect(api.changePassword('pw', 'a-new-long-passphrase')).rejects.toThrow('Please wait 45 minutes');
  });
});

describe('password reset calls', () => {
  it('requestPasswordReset posts the identifier and returns whether it was emailed', async () => {
    respond(200, { emailed: false });
    expect(await api.requestPasswordReset('sam')).toEqual({ emailed: false });
    const { url, init } = lastRequest();
    expect(url).toBe('/api/auth/password-reset/');
    expect(JSON.parse(init.body as string)).toEqual({ identifier: 'sam' });
  });

  it('requestPasswordReset says how long to wait when asked too often, and nothing else', async () => {
    respond(429, { detail: 'Too many requests. Please wait 60 minutes and try again.' });
    await expect(api.requestPasswordReset('sam')).rejects.toThrow('Please wait 60 minutes');
    respond(403, { detail: 'CSRF Failed: CSRF token missing.' });
    await expect(api.requestPasswordReset('sam')).rejects.toThrow('Could not send a reset link. Reload the page and try again.');
  });

  it('resetPassword posts to the link and unwraps the user', async () => {
    respond(200, { user: { id: 1, username: 'sam', email: 's@example.com', fullname: '' } });
    expect((await api.resetPassword('MQ', 'abc-123', 'pw')).username).toBe('sam');
    const { url, init } = lastRequest();
    expect(url).toBe('/api/auth/password-reset/MQ/abc-123/');
    expect(JSON.parse(init.body as string)).toEqual({ password: 'pw' });
  });

  it("resetPassword passes on the server's reasons, but not a CSRF failure", async () => {
    respond(400, { password: ['This password is too short.', 'This password is too common.'] });
    await expect(api.resetPassword('MQ', 't', 'pw')).rejects.toThrow('This password is too short. This password is too common.');
    respond(404, { detail: 'This reset link has expired or has already been used.' });
    await expect(api.resetPassword('MQ', 't', 'pw')).rejects.toThrow('expired or has already been used');
    respond(403, { detail: 'CSRF Failed: CSRF token missing.' });
    await expect(api.resetPassword('MQ', 't', 'pw')).rejects.toThrow('Could not reset your password. Reload the page and try again.');
  });
});

describe('guest order calls', () => {
  const TOKEN = '11111111-2222-3333-4444-555555555555';

  it('go through the share token, never /api/orders/', async () => {
    respond(201, {});
    await api.createGuestOrder(TOKEN, 7, 'Sam');
    expect(lastRequest().url).toBe(`/api/public/menu/${TOKEN}/orders/`);
    expect(JSON.parse(lastRequest().init.body as string)).toEqual({ recipe_id: 7, guest_name: 'Sam' });

    respond(200, []);
    await api.fetchGuestOrders(TOKEN, 'Sam & Co');
    expect(lastRequest().url).toBe(`/api/public/menu/${TOKEN}/orders/?guest_name=Sam+%26+Co`);

    respond(204);
    await api.cancelGuestOrder(TOKEN, 9, 'Sam');
    expect(lastRequest().url).toBe(`/api/public/menu/${TOKEN}/orders/9/?guest_name=Sam`);
    expect(lastRequest().init.method).toBe('DELETE');
  });

  it("a refused order carries the server's reason", async () => {
    respond(403, { detail: "This menu isn't taking orders right now." });
    await expect(api.createGuestOrder(TOKEN, 7, 'Sam')).rejects.toThrow("This menu isn't taking orders right now.");
  });
});
