import secrets
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """Represents a registered user account.

    Stores credentials (hashed password) and a bearer token used for API
    authentication. A user owns zero or more TodoLists.

    Args:
        N/A — constructed by SQLAlchemy or directly via keyword arguments.

    Returns:
        N/A — this is a database model class.
    """

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    token = db.Column(db.String(64), index=True, unique=True)

    lists = db.relationship(
        'TodoList', backref='owner', lazy='dynamic', cascade='all, delete-orphan'
    )

    def set_password(self, password):
        """Hash and store a plain-text password.

        Args:
            password (str): The plain-text password to hash and store.

        Returns:
            None
        """
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check a plain-text password against the stored hash.

        Args:
            password (str): The plain-text password to verify.

        Returns:
            bool: True if the password matches, False otherwise.
        """
        return check_password_hash(self.password_hash, password)

    def get_token(self):
        """Return the current bearer token, generating one if none exists.

        Args:
            None

        Returns:
            str: A 64-character hex token string.
        """
        if self.token is None:
            self.token = secrets.token_hex(32)
        return self.token

    def revoke_token(self):
        """Invalidate the current bearer token by setting it to None.

        Args:
            None

        Returns:
            None
        """
        self.token = None

    @staticmethod
    def check_token(token):
        """Look up a user by their bearer token.

        Args:
            token (str): The bearer token to look up.

        Returns:
            User | None: The matching User, or None if the token is invalid.
        """
        return User.query.filter_by(token=token).first()

    def to_dict(self):
        """Serialize the user to a JSON-safe dictionary.

        Args:
            None

        Returns:
            dict: Contains 'id', 'username', and 'email'. Never includes
                  the password hash or raw token.
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
        }


class TodoList(db.Model):
    """Represents a named list of items owned by a user.

    Lists are ordered by their 'rank' field. Deleting a list cascades to
    all its items.

    Args:
        N/A — constructed by SQLAlchemy or directly via keyword arguments.

    Returns:
        N/A — this is a database model class.
    """

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
        """Serialize the list to a JSON-safe dictionary.

        Args:
            None

        Returns:
            dict: Contains 'id', 'name', and 'rank'.
        """
        return {
            'id': self.id,
            'name': self.name,
            'rank': self.rank,
        }


class Item(db.Model):
    """Represents a task item inside a TodoList.

    Items can be nested: setting parent_item_id makes an item a sub-item of
    another. They are ordered within their column by 'rank'. Deleting an item
    cascades to all its sub-items.

    Args:
        N/A — constructed by SQLAlchemy or directly via keyword arguments.

    Returns:
        N/A — this is a database model class.
    """

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
        """Serialize the item to a JSON-safe dictionary.

        Optionally recurses into sub-items, ordered by rank.

        Args:
            include_subitems (bool): When True, a 'subitems' key is added
                                     containing each child serialized the
                                     same way. Defaults to True.

        Returns:
            dict: Contains 'id', 'title', 'description', 'due_date',
                  'list_id', 'parent_item_id', 'column', 'rank',
                  'is_collapsed', and optionally 'subitems'.
        """
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
