import sys
import os

# Ensure the backend directory is on the path so `app` and `config` are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from app import create_app, db as _db


class TestConfig:
    """Flask configuration used for the test suite.

    Uses an in-memory SQLite database so tests are isolated and fast, and
    sets TESTING=True so Flask propagates exceptions instead of returning
    500 responses.

    Args:
        N/A — used as a config class passed to create_app().

    Returns:
        N/A — this is a config class, not a callable.
    """

    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture(scope='function')
def app():
    """Create a fresh Flask app with an empty in-memory database for each test.

    Creates all tables before the test runs and drops them afterwards so
    every test starts with a clean state.

    Args:
        None

    Returns:
        flask.Flask: A fully configured test application instance.
    """
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """Return a Flask test client for making HTTP requests in tests.

    Args:
        app (flask.Flask): The test application fixture.

    Returns:
        flask.testing.FlaskClient: A client that can call API endpoints
                                   without running a real server.
    """
    return app.test_client()


@pytest.fixture
def registered_user(client):
    """Register a test user and return their credentials dict.

    Args:
        client (FlaskClient): The test client fixture.

    Returns:
        dict: Contains 'email', 'username', and 'password' for the
              newly created user.
    """
    payload = {'email': 'alice@example.com', 'username': 'alice', 'password': 'secret123'}
    client.post('/api/register', json=payload)
    return payload


@pytest.fixture
def auth_headers(client, registered_user):
    """Return Authorization headers for the registered test user.

    Logs in to obtain a bearer token and wraps it in an Authorization header
    dict ready for use with test client requests.

    Args:
        client (FlaskClient): The test client fixture.
        registered_user (dict): The registered user credentials fixture.

    Returns:
        dict: {'Authorization': 'Bearer <token>'}.
    """
    res = client.post('/api/tokens', json={
        'email': registered_user['email'],
        'password': registered_user['password'],
    })
    token = res.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def user_list(client, auth_headers):
    """Create a TodoList owned by the authenticated test user.

    Args:
        client (FlaskClient): The test client fixture.
        auth_headers (dict): The authorization headers fixture.

    Returns:
        dict: The created list's JSON representation (id, name, rank).
    """
    res = client.post('/api/lists', json={'name': 'My List'}, headers=auth_headers)
    return res.get_json()
