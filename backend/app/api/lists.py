from flask import jsonify, request
from app import db
from app.models import TodoList, Item
from app.api import bp
from app.api.auth import token_auth_required
from app.api.errors import bad_request, error_response


@bp.route('/lists', methods=['GET'])
@token_auth_required
def get_lists(current_user):
    """Return all lists owned by the current user, sorted by rank.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.

    Returns:
        flask.Response: 200 with a JSON array of list dicts.
    """
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
    """Create a new list for the current user.

    Expects an optional JSON body with 'name'. Defaults to 'New List' if
    omitted or blank. The new list is appended at the end by receiving
    the highest rank.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.

    Returns:
        flask.Response: 201 with the new list dict on success.
    """
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
    """Rename a list the current user owns.

    Expects a JSON body with 'name'. Ignores blank names (keeps the old one).

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        list_id (int): The primary key of the list to rename.

    Returns:
        flask.Response: 200 with the updated list dict on success, or
                        403/404 on ownership or not-found errors.
    """
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
    """Delete a list and all of its items (cascade handled by the DB).

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        list_id (int): The primary key of the list to delete.

    Returns:
        flask.Response: 204 No Content on success, or 403/404 on
                        ownership or not-found errors.
    """
    todo_list = TodoList.query.get_or_404(list_id)
    if todo_list.user_id != current_user.id:
        return error_response(403)
    db.session.delete(todo_list)
    db.session.commit()
    return '', 204


@bp.route('/lists/<int:list_id>/move', methods=['POST'])
@token_auth_required
def move_list(current_user, list_id):
    """Swap this list's rank with the neighbour immediately above or below it.

    Moving has no effect if the list is already at the boundary in the
    requested direction.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        list_id (int): The primary key of the list to move.

    Returns:
        flask.Response: 200 with {'ok': True} on success, or 400/403/404
                        on bad direction, ownership, or not-found errors.
    """
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
    """Return all top-level items for a list, each with their nested sub-items.

    Only items with no parent (parent_item_id is None) are returned at the
    top level. Their sub-items are embedded recursively via Item.to_dict().

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        list_id (int): The primary key of the list whose items to fetch.

    Returns:
        flask.Response: 200 with a JSON array of item dicts (with 'subitems'),
                        or 403/404 on ownership or not-found errors.
    """
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
