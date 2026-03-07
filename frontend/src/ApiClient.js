/**
 * Thin HTTP client that wraps fetch for all API calls.
 *
 * Stores and restores the bearer token from localStorage, attaches it to
 * every request, and returns a normalised { ok, ... } object from each
 * method so callers never have to touch fetch directly.
 */
export default class ApiClient {
  /**
   * Restore any previously stored token from localStorage.
   *
   * @param {void}
   * @returns {ApiClient}
   */
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // ── low-level ──────────────────────────────────────────────────────────────

  /**
   * Make an authenticated HTTP request to the backend API.
   *
   * Attaches the Content-Type header, the Bearer token (if present), and
   * serialises the body as JSON. Skips JSON parsing for 204 responses.
   *
   * @param {string} method - HTTP verb ('GET', 'POST', 'PUT', 'DELETE').
   * @param {string} url    - Path relative to /api (e.g. '/lists').
   * @param {object} [data] - Optional request body, serialised to JSON.
   * @returns {Promise<{status: number, body: object|null}>}
   */
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

    const response = await fetch('http://localhost:5001/api' + url, options);
    let body = null;
    if (response.status !== 204) {
      try { body = await response.json(); } catch (_) { body = null; }
    }
    return { status: response.status, body };
  }

  // ── auth ───────────────────────────────────────────────────────────────────

  /**
   * Log in with email and password, storing the returned token.
   *
   * @param {string} email    - The user's email address.
   * @param {string} password - The user's plain-text password.
   * @returns {Promise<{ok: boolean, user?: object, error?: string}>}
   */
  async login(email, password) {
    const { status, body } = await this.request('POST', '/tokens', { email, password });
    if (status === 200) {
      this.token = body.token;
      localStorage.setItem('token', body.token);
      return { ok: true, user: body.user };
    }
    return { ok: false, error: body?.error || 'Login failed' };
  }

  /**
   * Log out by revoking the token on the server and clearing it locally.
   *
   * @param {void}
   * @returns {Promise<void>}
   */
  async logout() {
    await this.request('DELETE', '/tokens');
    this.token = null;
    localStorage.removeItem('token');
  }

  /**
   * Create a new user account.
   *
   * @param {string} username - Desired display name.
   * @param {string} email    - Email address (must be unique).
   * @param {string} password - Plain-text password.
   * @returns {Promise<{ok: boolean, user?: object, error?: string}>}
   */
  async register(username, email, password) {
    const { status, body } = await this.request('POST', '/register', { username, email, password });
    if (status === 201) return { ok: true, user: body };
    return { ok: false, error: body?.error || 'Registration failed' };
  }

  /**
   * Fetch the profile of the currently authenticated user.
   *
   * Used on startup to restore a session from a stored token.
   *
   * @param {void}
   * @returns {Promise<{ok: boolean, user?: object}>}
   */
  async getMe() {
    const { status, body } = await this.request('GET', '/me');
    if (status === 200) return { ok: true, user: body };
    return { ok: false };
  }

  // ── lists ─────────────────────────────────────────────────────────────────

  /**
   * Fetch all lists owned by the current user.
   *
   * @param {void}
   * @returns {Promise<{ok: boolean, lists?: object[], error?: string}>}
   */
  async getLists() {
    const { status, body } = await this.request('GET', '/lists');
    if (status === 200) return { ok: true, lists: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Create a new list with the given name.
   *
   * @param {string} name - The list name.
   * @returns {Promise<{ok: boolean, list?: object, error?: string}>}
   */
  async createList(name) {
    const { status, body } = await this.request('POST', '/lists', { name });
    if (status === 201) return { ok: true, list: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Update one or more fields of an existing list.
   *
   * @param {number} listId - The list's primary key.
   * @param {object} data   - Fields to update (e.g. { name: 'New name' }).
   * @returns {Promise<{ok: boolean, list?: object, error?: string}>}
   */
  async updateList(listId, data) {
    const { status, body } = await this.request('PUT', `/lists/${listId}`, data);
    if (status === 200) return { ok: true, list: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Delete a list and all of its items.
   *
   * @param {number} listId - The list's primary key.
   * @returns {Promise<{ok: boolean}>}
   */
  async deleteList(listId) {
    const { status } = await this.request('DELETE', `/lists/${listId}`);
    return { ok: status === 204 };
  }

  /**
   * Swap a list's rank with the neighbour above or below it.
   *
   * @param {number} listId    - The list's primary key.
   * @param {string} direction - 'up' or 'down'.
   * @returns {Promise<{ok: boolean}>}
   */
  async moveList(listId, direction) {
    const { status } = await this.request('POST', `/lists/${listId}/move`, { direction });
    return { ok: status === 200 };
  }

  // ── items ─────────────────────────────────────────────────────────────────

  /**
   * Fetch all top-level items for a list, each with nested sub-items.
   *
   * @param {number} listId - The list's primary key.
   * @returns {Promise<{ok: boolean, items?: object[], error?: string}>}
   */
  async getListItems(listId) {
    const { status, body } = await this.request('GET', `/lists/${listId}/items`);
    if (status === 200) return { ok: true, items: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Create a new item (or sub-item) inside a list.
   *
   * @param {object} data - Must include list_id and title; optionally
   *                        description, due_date, parent_item_id.
   * @returns {Promise<{ok: boolean, item?: object, error?: string}>}
   */
  async createItem(data) {
    const { status, body } = await this.request('POST', '/items', data);
    if (status === 201) return { ok: true, item: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Update one or more fields of an existing item.
   *
   * @param {number} itemId - The item's primary key.
   * @param {object} data   - Fields to update (e.g. { column: 'done' }).
   * @returns {Promise<{ok: boolean, item?: object, error?: string}>}
   */
  async updateItem(itemId, data) {
    const { status, body } = await this.request('PUT', `/items/${itemId}`, data);
    if (status === 200) return { ok: true, item: body };
    return { ok: false, error: body?.error };
  }

  /**
   * Delete an item and all of its sub-items.
   *
   * @param {number} itemId - The item's primary key.
   * @returns {Promise<{ok: boolean}>}
   */
  async deleteItem(itemId) {
    const { status } = await this.request('DELETE', `/items/${itemId}`);
    return { ok: status === 204 };
  }

  /**
   * Swap an item's rank with the sibling immediately above or below it.
   *
   * @param {number} itemId    - The item's primary key.
   * @param {string} direction - 'up' or 'down'.
   * @returns {Promise<{ok: boolean}>}
   */
  async moveItem(itemId, direction) {
    const { status } = await this.request('POST', `/items/${itemId}/move`, { direction });
    return { ok: status === 200 };
  }
}
