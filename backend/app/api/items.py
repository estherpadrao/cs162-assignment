from flask import jsonify, request
from app import db
from app.models import Item, TodoList
from app.api import bp
from app.api.auth import token_auth_required
from app.api.errors import bad_request, error_response


def _owned_list(list_id, user_id):
    """Return the list if it belongs to user_id, else None."""
    todo_list = TodoList.query.get(list_id)
    if todo_list is None or todo_list.user_id != user_id:
        return None
    return todo_list


@bp.route('/items', methods=['POST'])
@token_auth_required
def create_item(current_user):
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
    """Recursively move an item and all its subitems to new_list_id."""
    item.list_id = new_list_id
    for sub in item.subitems.all():
        _move_subtree(sub, new_list_id)


@bp.route('/items/<int:item_id>', methods=['DELETE'])
@token_auth_required
def delete_item(current_user, item_id):
    item = Item.query.get_or_404(item_id)
    if _owned_list(item.list_id, current_user.id) is None:
        return error_response(403)
    db.session.delete(item)
    db.session.commit()
    return '', 204


@bp.route('/items/<int:item_id>/move', methods=['POST'])
@token_auth_required
def move_item(current_user, item_id):
    """Move an item up or down within its current column (rank swap)."""
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
