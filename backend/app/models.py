import secrets
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    token = db.Column(db.String(64), index=True, unique=True)

    lists = db.relationship(
        'TodoList', backref='owner', lazy='dynamic', cascade='all, delete-orphan'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_token(self):
        if self.token is None:
            self.token = secrets.token_hex(32)
        return self.token

    def revoke_token(self):
        self.token = None

    @staticmethod
    def check_token(token):
        return User.query.filter_by(token=token).first()

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
        }


class TodoList(db.Model):
    __tablename__ = 'todo_list'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False, default='New List')
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    rank = db.Column(db.Integer, default=0)

    items = db.relationship(
        'Item',
        backref='todo_list',
        lazy='dynamic',
        foreign_keys='Item.list_id',
        cascade='all, delete-orphan',
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'rank': self.rank,
        }


class Item(db.Model):
    __tablename__ = 'item'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text, default='')
    due_date = db.Column(db.String(20), nullable=True)
    list_id = db.Column(db.Integer, db.ForeignKey('todo_list.id'), nullable=False)
    parent_item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=True)
    column = db.Column(db.String(10), default='todo')   # 'todo' | 'doing' | 'done'
    rank = db.Column(db.Integer, default=0)
    is_collapsed = db.Column(db.Boolean, default=False)

    subitems = db.relationship(
        'Item',
        backref=db.backref('parent', remote_side='Item.id'),
        foreign_keys='Item.parent_item_id',
        lazy='dynamic',
        cascade='all, delete-orphan',
    )

    def to_dict(self, include_subitems=True):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description or '',
            'due_date': self.due_date,
            'list_id': self.list_id,
            'parent_item_id': self.parent_item_id,
            'column': self.column,
            'rank': self.rank,
            'is_collapsed': self.is_collapsed,
        }
        if include_subitems:
            data['subitems'] = [
                s.to_dict(include_subitems=True)
                for s in self.subitems.order_by(Item.rank).all()
            ]
        return data
