from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()


def create_app(config_class=Config):
    """Create and configure the Flask application.

    Initialises SQLAlchemy, enables CORS for all /api/* routes, and registers
    the API blueprint at the /api URL prefix.

    Args:
        config_class: A config class whose attributes are loaded into
                      app.config. Defaults to Config.

    Returns:
        flask.Flask: The fully configured Flask application instance.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
