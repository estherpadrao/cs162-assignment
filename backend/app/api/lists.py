from flask import jsonify, request
from app import db
from app.models import TodoList, Item
from app.api import bp
from app.api.auth import token_auth_required
from app.api.errors import bad_request, error_response


@bp.route('/lists', methods=['GET'])
@token_auth_required
def get_lists(current_user):
    lists = (
        TodoList.query
        .filter_by(user_id=current_user.id)
        .order_by(TodoList.rank)
        .all()
    )
    return jsonify([l.to_dict() for l in lists])


@bp.route('/lists', methods=['POST'])
@token_auth_required
def create_list(current_user):
    data = request.get_json() or {}
    name = data.get('name', 'New List').strip() or 'New List'
    max_rank = (
        db.session.query(db.func.max(TodoList.rank))
        .filter_by(user_id=current_user.id)
        .scalar()
    ) or 0
    todo_list = TodoList(name=name, user_id=current_user.id, rank=max_rank + 1)
    db.session.add(todo_list)
    db.session.commit()
    return jsonify(todo_list.to_dict()), 201


@bp.route('/lists/<int:list_id>', methods=['PUT'])
@token_auth_required
def update_list(current_user, list_id):
    todo_list = TodoList.query.get_or_404(list_id)
    if todo_list.user_id != current_user.id:
        return error_response(403)
    data = request.get_json() or {}
    if 'name' in data:
        todo_list.name = data['name'].strip() or todo_list.name
    db.session.commit()
    return jsonify(todo_list.to_dict())


@bp.route('/lists/<int:list_id>', methods=['DELETE'])
@token_auth_required
def delete_list(current_user, list_id):
    todo_list = TodoList.query.get_or_404(list_id)
    if todo_list.user_id != current_user.id:
        return error_response(403)
    db.session.delete(todo_list)
    db.session.commit()
    return '', 204


@bp.route('/lists/<int:list_id>/move', methods=['POST'])
@token_auth_required
def move_list(current_user, list_id):
    """Swap this list's rank with the neighbour above or below."""
    todo_list = TodoList.query.get_or_404(list_id)
    if todo_list.user_id != current_user.id:
        return error_response(403)
    data = request.get_json() or {}
    direction = data.get('direction')
    if direction not in ('up', 'down'):
        return bad_request('direction must be "up" or "down"')

    lists = (
        TodoList.query
        .filter_by(user_id=current_user.id)
        .order_by(TodoList.rank)
        .all()
    )
    idx = next((i for i, l in enumerate(lists) if l.id == list_id), None)
    if idx is None:
        return error_response(404)

    if direction == 'up' and idx > 0:
        lists[idx].rank, lists[idx - 1].rank = lists[idx - 1].rank, lists[idx].rank
    elif direction == 'down' and idx < len(lists) - 1:
        lists[idx].rank, lists[idx + 1].rank = lists[idx + 1].rank, lists[idx].rank

    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/lists/<int:list_id>/items', methods=['GET'])
@token_auth_required
def get_list_items(current_user, list_id):
    """Return all top-level items for a list, each with nested subitems."""
    todo_list = TodoList.query.get_or_404(list_id)
    if todo_list.user_id != current_user.id:
        return error_response(403)
    items = (
        Item.query
        .filter_by(list_id=list_id, parent_item_id=None)
        .order_by(Item.rank)
        .all()
    )
    return jsonify([item.to_dict(include_subitems=True) for item in items])
