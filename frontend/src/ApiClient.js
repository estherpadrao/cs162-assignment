/**
 * ApiClient — thin wrapper around fetch that:
 *   - stores / restores the auth token in localStorage
 *   - attaches Authorization: Bearer <token> on every request
 *   - returns { ok, body } (or { ok, error }) for every call
 *
 * Pattern inspired by the React Mega-Tutorial (Miguel Grinberg)
 */
export default class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // ── low-level ──────────────────────────────────────────────────────────────

  async request(method, url, data) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch('/api' + url, options);
    let body = null;
    if (response.status !== 204) {
      try { body = await response.json(); } catch (_) { body = null; }
    }
    return { status: response.status, body };
  }

  // ── auth ───────────────────────────────────────────────────────────────────

  async login(email, password) {
    const { status, body } = await this.request('POST', '/tokens', { email, password });
    if (status === 200) {
      this.token = body.token;
      localStorage.setItem('token', body.token);
      return { ok: true, user: body.user };
    }
    return { ok: false, error: body?.error || 'Login failed' };
  }

  async logout() {
    await this.request('DELETE', '/tokens');
    this.token = null;
    localStorage.removeItem('token');
  }

  async register(username, email, password) {
    const { status, body } = await this.request('POST', '/register', { username, email, password });
    if (status === 201) return { ok: true, user: body };
    return { ok: false, error: body?.error || 'Registration failed' };
  }

  async getMe() {
    const { status, body } = await this.request('GET', '/me');
    if (status === 200) return { ok: true, user: body };
    return { ok: false };
  }

  // ── lists ─────────────────────────────────────────────────────────────────

  async getLists() {
    const { status, body } = await this.request('GET', '/lists');
    if (status === 200) return { ok: true, lists: body };
    return { ok: false, error: body?.error };
  }

  async createList(name) {
    const { status, body } = await this.request('POST', '/lists', { name });
    if (status === 201) return { ok: true, list: body };
    return { ok: false, error: body?.error };
  }

  async updateList(listId, data) {
    const { status, body } = await this.request('PUT', `/lists/${listId}`, data);
    if (status === 200) return { ok: true, list: body };
    return { ok: false, error: body?.error };
  }

  async deleteList(listId) {
    const { status } = await this.request('DELETE', `/lists/${listId}`);
    return { ok: status === 204 };
  }

  async moveList(listId, direction) {
    const { status } = await this.request('POST', `/lists/${listId}/move`, { direction });
    return { ok: status === 200 };
  }

  // ── items ─────────────────────────────────────────────────────────────────

  async getListItems(listId) {
    const { status, body } = await this.request('GET', `/lists/${listId}/items`);
    if (status === 200) return { ok: true, items: body };
    return { ok: false, error: body?.error };
  }

  async createItem(data) {
    const { status, body } = await this.request('POST', '/items', data);
    if (status === 201) return { ok: true, item: body };
    return { ok: false, error: body?.error };
  }

  async updateItem(itemId, data) {
    const { status, body } = await this.request('PUT', `/items/${itemId}`, data);
    if (status === 200) return { ok: true, item: body };
    return { ok: false, error: body?.error };
  }

  async deleteItem(itemId) {
    const { status } = await this.request('DELETE', `/items/${itemId}`);
    return { ok: status === 204 };
  }

  async moveItem(itemId, direction) {
    const { status } = await this.request('POST', `/items/${itemId}/move`, { direction });
    return { ok: status === 200 };
  }
}
