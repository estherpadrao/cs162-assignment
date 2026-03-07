from flask import jsonify, request
from app import db
from app.models import Item, TodoList
from app.api import bp
from app.api.auth import token_auth_required
from app.api.errors import bad_request, error_response


def _owned_list(list_id, user_id):
    """Return a TodoList only if it belongs to the given user.

    Args:
        list_id (int): The primary key of the list to look up.
        user_id (int): The primary key of the authenticated user.

    Returns:
        TodoList | None: The list if it exists and belongs to user_id,
                         otherwise None.
    """
    todo_list = TodoList.query.get(list_id)
    if todo_list is None or todo_list.user_id != user_id:
        return None
    return todo_list


@bp.route('/items', methods=['POST'])
@token_auth_required
def create_item(current_user):
    """Create a new item (or sub-item) inside a list the user owns.

    Expects a JSON body with at least 'list_id' and 'title'. Optionally
    accepts 'description', 'due_date', and 'parent_item_id'. The new item
    is appended at the end of the sibling list by receiving the highest rank.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.

    Returns:
        flask.Response: 201 with the new item dict on success, or 400/403
                        on validation or ownership errors.
    """
    data = request.get_json() or {}
    list_id = data.get('list_id')
    if not list_id:
        return bad_request('list_id is required')

    todo_list = _owned_list(list_id, current_user.id)
    if todo_list is None:
        return error_response(403)

    parent_item_id = data.get('parent_item_id') or None
    if parent_item_id:
        parent = Item.query.get(parent_item_id)
        if parent is None or parent.list_id != list_id:
            return bad_request('Parent item does not exist or belongs to a different list')

    title = (data.get('title') or '').strip()
    if not title:
        return bad_request('title is required')

    max_rank = (
        db.session.query(db.func.max(Item.rank))
        .filter_by(list_id=list_id, parent_item_id=parent_item_id)
        .scalar()
    ) or 0

    item = Item(
        title=title,
        description=data.get('description', ''),
        due_date=data.get('due_date') or None,
        list_id=list_id,
        parent_item_id=parent_item_id,
        column='todo',
        rank=max_rank + 1,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@bp.route('/items/<int:item_id>', methods=['PUT'])
@token_auth_required
def update_item(current_user, item_id):
    """Update one or more fields of an existing item.

    Accepted fields: 'title', 'description', 'due_date', 'column',
    'is_collapsed', and 'list_id' (moves the item to another list; only
    allowed for top-level items). Unknown fields are silently ignored.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        item_id (int): The primary key of the item to update.

    Returns:
        flask.Response: 200 with the updated item dict on success, or
                        400/403/404 on validation or ownership errors.
    """
    item = Item.query.get_or_404(item_id)
    if _owned_list(item.list_id, current_user.id) is None:
        return error_response(403)

    data = request.get_json() or {}

    # Move to a different list (top-level items only)
    if 'list_id' in data and data['list_id'] != item.list_id:
        if item.parent_item_id is not None:
            return bad_request('Only top-level items can be moved between lists')
        new_list = _owned_list(data['list_id'], current_user.id)
        if new_list is None:
            return error_response(403)
        # Move all subitems too
        _move_subtree(item, data['list_id'])

    if 'title' in data:
        item.title = (data['title'] or '').strip() or item.title
    if 'description' in data:
        item.description = data['description']
    if 'due_date' in data:
        item.due_date = data['due_date'] or None
    if 'column' in data:
        if data['column'] not in ('todo', 'doing', 'done'):
            return bad_request('column must be todo, doing or done')
        item.column = data['column']
    if 'is_collapsed' in data:
        item.is_collapsed = bool(data['is_collapsed'])

    db.session.commit()
    return jsonify(item.to_dict())


def _move_subtree(item, new_list_id):
    """Recursively move an item and all of its sub-items to a different list.

    Called when a top-level item is moved between lists so that its entire
    descendant tree moves with it.

    Args:
        item (Item): The item (and root of the subtree) to move.
        new_list_id (int): The primary key of the destination list.

    Returns:
        None
    """
    item.list_id = new_list_id
    for sub in item.subitems.all():
        _move_subtree(sub, new_list_id)


@bp.route('/items/<int:item_id>', methods=['DELETE'])
@token_auth_required
def delete_item(current_user, item_id):
    """Delete an item and all of its sub-items (cascade handled by the DB).

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        item_id (int): The primary key of the item to delete.

    Returns:
        flask.Response: 204 No Content on success, or 403/404 on
                        ownership or not-found errors.
    """
    item = Item.query.get_or_404(item_id)
    if _owned_list(item.list_id, current_user.id) is None:
        return error_response(403)
    db.session.delete(item)
    db.session.commit()
    return '', 204


@bp.route('/items/<int:item_id>/move', methods=['POST'])
@token_auth_required
def move_item(current_user, item_id):
    """Swap an item's rank with the sibling immediately above or below it.

    Siblings are items in the same list, column, and at the same nesting
    level (same parent_item_id). Moving has no effect if the item is
    already at the boundary in the requested direction.

    Args:
        current_user (User): The authenticated user, injected by
                             @token_auth_required.
        item_id (int): The primary key of the item to move.

    Returns:
        flask.Response: 200 with {'ok': True} on success, or 400/403/404
                        on bad direction, ownership, or not-found errors.
    """
    item = Item.query.get_or_404(item_id)
    if _owned_list(item.list_id, current_user.id) is None:
        return error_response(403)

    data = request.get_json() or {}
    direction = data.get('direction')
    if direction not in ('up', 'down'):
        return bad_request('direction must be "up" or "down"')

    siblings = (
        Item.query
        .filter_by(
            list_id=item.list_id,
            column=item.column,
            parent_item_id=item.parent_item_id,
        )
        .order_by(Item.rank)
        .all()
    )
    idx = next((i for i, it in enumerate(siblings) if it.id == item_id), None)
    if idx is None:
        return error_response(404)

    if direction == 'up' and idx > 0:
        siblings[idx].rank, siblings[idx - 1].rank = (
            siblings[idx - 1].rank, siblings[idx].rank
        )
    elif direction == 'down' and idx < len(siblings) - 1:
        siblings[idx].rank, siblings[idx + 1].rank = (
            siblings[idx + 1].rank, siblings[idx].rank
        )

    db.session.commit()
    return jsonify({'ok': True})
