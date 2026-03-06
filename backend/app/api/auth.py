from functools import wraps
from flask import jsonify, request
from app import db
from app.models import User
from app.api import bp
from app.api.errors import bad_request, error_response


def token_auth_required(f):
    """Decorator that validates the Bearer token and injects current_user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        if not token:
            return error_response(401, 'Missing token')
        user = User.check_token(token)
        if user is None:
            return error_response(401, 'Invalid or expired token')
        return f(user, *args, **kwargs)
    return decorated


@bp.route('/tokens', methods=['POST'])
def get_token():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    if not email or not password:
        return bad_request('Email and password are required')
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return error_response(401, 'Invalid email or password')
    token = user.get_token()
    db.session.commit()
    return jsonify({'token': token, 'user': user.to_dict()})


@bp.route('/tokens', methods=['DELETE'])
@token_auth_required
def revoke_token(current_user):
    current_user.revoke_token()
    db.session.commit()
    return '', 204


@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not email or not username or not password:
        return bad_request('Email, username and password are required')
    if User.query.filter_by(email=email).first():
        return bad_request('Email is already registered')

    user = User(email=email, username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
