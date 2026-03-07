"""
Unit tests for item endpoints:
  POST   /api/items           – create a top-level item or sub-item
  PUT    /api/items/<id>      – update title, description, due_date, column, is_collapsed
  DELETE /api/items/<id>      – delete an item (cascades subitems)
  POST   /api/items/<id>/move – reorder items within a column
  GET    /api/lists/<id>/items – retrieve items with nested subitems
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_item(client, headers, list_id, title='Task', **kwargs):
    return client.post('/api/items', json={
        'list_id': list_id, 'title': title, **kwargs
    }, headers=headers)


# ---------------------------------------------------------------------------
# Creating items
# ---------------------------------------------------------------------------

class TestCreateItem:
    def test_create_top_level_item_returns_201(self, client, auth_headers, user_list):
        res = create_item(client, auth_headers, user_list['id'], title='Buy milk')
        assert res.status_code == 201
        body = res.get_json()
        assert body['title'] == 'Buy milk'
        assert body['list_id'] == user_list['id']
        assert body['parent_item_id'] is None
        assert body['column'] == 'todo'

    def test_create_subitem_links_to_parent(self, client, auth_headers, user_list):
        parent = create_item(client, auth_headers, user_list['id'], title='Parent').get_json()
        child_res = create_item(
            client, auth_headers, user_list['id'],
            title='Child', parent_item_id=parent['id']
        )
        assert child_res.status_code == 201
        child = child_res.get_json()
        assert child['parent_item_id'] == parent['id']

    def test_create_item_missing_title_returns_400(self, client, auth_headers, user_list):
        res = client.post('/api/items', json={'list_id': user_list['id']}, headers=auth_headers)
        assert res.status_code == 400

    def test_create_item_missing_list_id_returns_400(self, client, auth_headers):
        res = client.post('/api/items', json={'title': 'No list'}, headers=auth_headers)
        assert res.status_code == 400

    def test_create_item_on_foreign_list_returns_403(self, client, auth_headers):
        # Register a second user with their own list
        client.post('/api/register', json={
            'email': 'z@z.com', 'username': 'z', 'password': 'pw'
        })
        other_token = client.post('/api/tokens', json={
            'email': 'z@z.com', 'password': 'pw'
        }).get_json()['token']
        other_list = client.post('/api/lists', json={'name': 'Z list'},
                                 headers={'Authorization': f'Bearer {other_token}'}).get_json()

        # Authenticated user tries to add an item to the other user's list
        res = create_item(client, auth_headers, other_list['id'], title='Sneaky')
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# Updating items
# ---------------------------------------------------------------------------

class TestUpdateItem:
    def test_update_title_and_description(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.put(f'/api/items/{item["id"]}', json={
            'title': 'Updated title',
            'description': 'Some notes',
        }, headers=auth_headers)
        assert res.status_code == 200
        body = res.get_json()
        assert body['title'] == 'Updated title'
        assert body['description'] == 'Some notes'

    def test_update_column_to_done(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.put(f'/api/items/{item["id"]}', json={'column': 'done'}, headers=auth_headers)
        assert res.status_code == 200
        assert res.get_json()['column'] == 'done'

    def test_update_column_invalid_value_returns_400(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.put(f'/api/items/{item["id"]}', json={'column': 'invalid'}, headers=auth_headers)
        assert res.status_code == 400

    def test_update_is_collapsed(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.put(f'/api/items/{item["id"]}', json={'is_collapsed': True}, headers=auth_headers)
        assert res.status_code == 200
        assert res.get_json()['is_collapsed'] is True


# ---------------------------------------------------------------------------
# Deleting items
# ---------------------------------------------------------------------------

class TestDeleteItem:
    def test_delete_item_returns_204(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.delete(f'/api/items/{item["id"]}', headers=auth_headers)
        assert res.status_code == 204

    def test_delete_parent_cascades_subitems(self, client, auth_headers, user_list):
        parent = create_item(client, auth_headers, user_list['id'], title='Parent').get_json()
        child = create_item(
            client, auth_headers, user_list['id'],
            title='Child', parent_item_id=parent['id']
        ).get_json()

        # Delete parent
        client.delete(f'/api/items/{parent["id"]}', headers=auth_headers)

        # Child should also be gone (returns 404)
        res = client.put(f'/api/items/{child["id"]}', json={'title': 'x'}, headers=auth_headers)
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Retrieving items with nested subitems
# ---------------------------------------------------------------------------

class TestGetListItems:
    def test_items_include_nested_subitems(self, client, auth_headers, user_list):
        parent = create_item(client, auth_headers, user_list['id'], title='Parent').get_json()
        create_item(client, auth_headers, user_list['id'], title='Child 1', parent_item_id=parent['id'])
        create_item(client, auth_headers, user_list['id'], title='Child 2', parent_item_id=parent['id'])

        res = client.get(f'/api/lists/{user_list["id"]}/items', headers=auth_headers)
        assert res.status_code == 200
        items = res.get_json()
        # Only the top-level parent should appear at the root
        assert len(items) == 1
        assert items[0]['title'] == 'Parent'
        assert len(items[0]['subitems']) == 2
        subitem_titles = {s['title'] for s in items[0]['subitems']}
        assert subitem_titles == {'Child 1', 'Child 2'}


# ---------------------------------------------------------------------------
# Moving items within a column
# ---------------------------------------------------------------------------

class TestMoveItem:
    def test_move_item_down_swaps_ranks(self, client, auth_headers, user_list):
        i1 = create_item(client, auth_headers, user_list['id'], title='First').get_json()
        i2 = create_item(client, auth_headers, user_list['id'], title='Second').get_json()

        assert i1['rank'] < i2['rank']

        res = client.post(f'/api/items/{i1["id"]}/move',
                          json={'direction': 'down'}, headers=auth_headers)
        assert res.status_code == 200

        items = client.get(f'/api/lists/{user_list["id"]}/items', headers=auth_headers).get_json()
        ordered_ids = [it['id'] for it in items]
        assert ordered_ids.index(i2['id']) < ordered_ids.index(i1['id'])

    def test_move_item_invalid_direction_returns_400(self, client, auth_headers, user_list):
        item = create_item(client, auth_headers, user_list['id']).get_json()
        res = client.post(f'/api/items/{item["id"]}/move',
                          json={'direction': 'left'}, headers=auth_headers)
        assert res.status_code == 400
