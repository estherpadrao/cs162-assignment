import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Holds Flask and SQLAlchemy configuration values read from environment variables.

    Args:
        None — values are read from environment variables at import time.

    Returns:
        N/A — used as a config class passed to create_app().
    """

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'todo.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
