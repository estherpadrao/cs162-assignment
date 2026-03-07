import sys
import os

# Ensure the backend directory is on the path so `app` and `config` are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from app import create_app, db as _db


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture(scope='function')
def app():
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def registered_user(client):
    """Register a user and return their credentials."""
    payload = {'email': 'alice@example.com', 'username': 'alice', 'password': 'secret123'}
    client.post('/api/register', json=payload)
    return payload


@pytest.fixture
def auth_headers(client, registered_user):
    """Return Authorization headers for the registered user."""
    res = client.post('/api/tokens', json={
        'email': registered_user['email'],
        'password': registered_user['password'],
    })
    token = res.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def user_list(client, auth_headers):
    """Create and return a TodoList belonging to the authenticated user."""
    res = client.post('/api/lists', json={'name': 'My List'}, headers=auth_headers)
    return res.get_json()
