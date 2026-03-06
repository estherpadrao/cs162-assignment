from flask import jsonify
from app.api import bp
from app.api.auth import token_auth_required


@bp.route('/me', methods=['GET'])
@token_auth_required
def get_me(current_user):
    return jsonify(current_user.to_dict())
