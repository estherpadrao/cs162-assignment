"""API blueprint registration.

Defines the 'api' Blueprint and imports all route modules so their
@bp.route decorators are registered before the blueprint is attached
to the Flask app.

Args:
    N/A — this module is imported automatically by create_app().

Returns:
    N/A — exports the 'bp' Blueprint object.
"""

from flask import Blueprint

bp = Blueprint('api', __name__)

from app.api import errors, auth, users, lists, items  # noqa: F401, E402
