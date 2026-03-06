from app import create_app, db

app = create_app()

# Create all tables on startup (safe to call multiple times)
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
