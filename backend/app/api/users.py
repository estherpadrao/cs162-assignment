from flask import jsonify
from app.api import bp
from app.api.auth import token_auth_required


@bp.route('/me', methods=['GET'])
@token_auth_required
def get_me(current_user):
    """Return the profile of the currently authenticated user.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.

    Returns:
        flask.Response: 200 with the user dict (id, username, email).
    """
    return jsonify(current_user.to_dict())
