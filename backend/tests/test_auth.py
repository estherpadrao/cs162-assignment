"""
Unit tests for authentication endpoints:
  POST /api/register  – create a new user account
  POST /api/tokens    – login and obtain a bearer token
  DELETE /api/tokens  – logout and revoke the token
"""


class TestRegister:
    def test_register_success_returns_201_with_user_data(self, client):
        res = client.post('/api/register', json={
            'email': 'bob@example.com',
            'username': 'bob',
            'password': 'hunter2',
        })
        assert res.status_code == 201
        body = res.get_json()
        assert body['email'] == 'bob@example.com'
        assert body['username'] == 'bob'
        assert 'id' in body
        # Password must never be exposed
        assert 'password' not in body
        assert 'password_hash' not in body

    def test_register_duplicate_email_returns_400(self, client):
        payload = {'email': 'dup@example.com', 'username': 'user1', 'password': 'pw'}
        client.post('/api/register', json=payload)
        # Second registration with the same email
        res = client.post('/api/register', json={**payload, 'username': 'user2'})
        assert res.status_code == 400
        assert 'already registered' in res.get_json().get('error', '').lower()

    def test_register_missing_field_returns_400(self, client):
        # Missing 'password'
        res = client.post('/api/register', json={'email': 'x@x.com', 'username': 'x'})
        assert res.status_code == 400


class TestLogin:
    def test_login_correct_credentials_returns_token(self, client, registered_user):
        res = client.post('/api/tokens', json={
            'email': registered_user['email'],
            'password': registered_user['password'],
        })
        assert res.status_code == 200
        body = res.get_json()
        assert 'token' in body
        assert len(body['token']) > 0
        assert body['user']['email'] == registered_user['email']

    def test_login_wrong_password_returns_401(self, client, registered_user):
        res = client.post('/api/tokens', json={
            'email': registered_user['email'],
            'password': 'wrong-password',
        })
        assert res.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        res = client.post('/api/tokens', json={
            'email': 'nobody@example.com',
            'password': 'anything',
        })
        assert res.status_code == 401


class TestLogout:
    def test_logout_revokes_token(self, client, registered_user, auth_headers):
        # Logout
        res = client.delete('/api/tokens', headers=auth_headers)
        assert res.status_code == 204

        # The revoked token must no longer grant access
        res = client.get('/api/me', headers=auth_headers)
        assert res.status_code == 401

    def test_logout_without_token_returns_401(self, client):
        res = client.delete('/api/tokens')
        assert res.status_code == 401
