from app import create_app, db

"""
Application entry point.

Creates the Flask app, ensures all database tables exist, and starts the
development server on port 5001 when the file is run directly.

Args:
    N/A — executed as a script, not called as a function.

Returns:
    N/A — runs until the server is stopped.
"""

app = create_app()


with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
