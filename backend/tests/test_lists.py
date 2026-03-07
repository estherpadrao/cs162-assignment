"""
Unit tests for todo-list CRUD endpoints:
  GET    /api/lists           – list all lists for the current user
  POST   /api/lists           – create a new list
  PUT    /api/lists/<id>      – rename a list
  DELETE /api/lists/<id>      – delete a list (cascades items)
  POST   /api/lists/<id>/move – reorder lists by swapping ranks
"""


class TestGetLists:
    """Tests for GET /api/lists.

    Verifies that the endpoint returns only the current user's lists and
    requires authentication.

    Args:
        N/A — test methods receive pytest fixtures via dependency injection.

    Returns:
        N/A — assertions raise on failure.
    """

    def test_get_lists_returns_only_current_users_lists(self, client, auth_headers):
        # Create two lists for the authenticated user
        client.post('/api/lists', json={'name': 'Work'}, headers=auth_headers)
        client.post('/api/lists', json={'name': 'Personal'}, headers=auth_headers)

        # Register a second user and create a list for them
        client.post('/api/register', json={
            'email': 'other@example.com', 'username': 'other', 'password': 'pw'
        })
        other_login = client.post('/api/tokens', json={
            'email': 'other@example.com', 'password': 'pw'
        })
        other_token = other_login.get_json()['token']
        client.post('/api/lists', json={'name': "Other's List"},
                    headers={'Authorization': f'Bearer {other_token}'})

        # Authenticated user should only see their own two lists
        res = client.get('/api/lists', headers=auth_headers)
        assert res.status_code == 200
        names = [l['name'] for l in res.get_json()]
        assert 'Work' in names
        assert 'Personal' in names
        assert "Other's List" not in names

    def test_get_lists_requires_auth(self, client):
        res = client.get('/api/lists')
        assert res.status_code == 401


class TestCreateList:
    """Tests for POST /api/lists.

    Covers successful creation, incremental rank assignment, and the
    default-name fallback for blank names.

    Args:
        N/A — test methods receive pytest fixtures via dependency injection.

    Returns:
        N/A — assertions raise on failure.
    """

    def test_create_list_returns_201_with_data(self, client, auth_headers):
        res = client.post('/api/lists', json={'name': 'Shopping'}, headers=auth_headers)
        assert res.status_code == 201
        body = res.get_json()
        assert body['name'] == 'Shopping'
        assert 'id' in body
        assert 'rank' in body

    def test_create_list_rank_increments(self, client, auth_headers):
        r1 = client.post('/api/lists', json={'name': 'A'}, headers=auth_headers).get_json()
        r2 = client.post('/api/lists', json={'name': 'B'}, headers=auth_headers).get_json()
        assert r2['rank'] > r1['rank']

    def test_create_list_defaults_name_when_empty(self, client, auth_headers):
        res = client.post('/api/lists', json={'name': '   '}, headers=auth_headers)
        assert res.status_code == 201
        assert res.get_json()['name'] == 'New List'


class TestUpdateList:
    """Tests for PUT /api/lists/<id>.

    Verifies that renaming succeeds for the owner and is rejected for other
    users.

    Args:
        N/A — test methods receive pytest fixtures via dependency injection.

    Returns:
        N/A — assertions raise on failure.
    """

    def test_rename_list_returns_200(self, client, auth_headers, user_list):
        res = client.put(
            f'/api/lists/{user_list["id"]}',
            json={'name': 'Renamed'},
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.get_json()['name'] == 'Renamed'

    def test_other_user_cannot_rename_list(self, client, auth_headers, user_list):
        # Register and log in as a second user
        client.post('/api/register', json={
            'email': 'eve@example.com', 'username': 'eve', 'password': 'pw'
        })
        eve_token = client.post('/api/tokens', json={
            'email': 'eve@example.com', 'password': 'pw'
        }).get_json()['token']

        res = client.put(
            f'/api/lists/{user_list["id"]}',
            json={'name': 'Hacked'},
            headers={'Authorization': f'Bearer {eve_token}'},
        )
        assert res.status_code == 403


class TestDeleteList:
    """Tests for DELETE /api/lists/<id>.

    Verifies 204 response, removal from the lists endpoint, and cascade
    deletion of items.

    Args:
        N/A — test methods receive pytest fixtures via dependency injection.

    Returns:
        N/A — assertions raise on failure.
    """

    def test_delete_list_returns_204(self, client, auth_headers, user_list):
        res = client.delete(f'/api/lists/{user_list["id"]}', headers=auth_headers)
        assert res.status_code == 204

    def test_deleted_list_no_longer_appears(self, client, auth_headers, user_list):
        client.delete(f'/api/lists/{user_list["id"]}', headers=auth_headers)
        lists = client.get('/api/lists', headers=auth_headers).get_json()
        ids = [l['id'] for l in lists]
        assert user_list['id'] not in ids

    def test_deleting_list_cascades_to_items(self, client, auth_headers, user_list):
        # Add an item to the list
        item_res = client.post('/api/items', json={
            'title': 'Task', 'list_id': user_list['id']
        }, headers=auth_headers)
        assert item_res.status_code == 201

        # Delete the list
        client.delete(f'/api/lists/{user_list["id"]}', headers=auth_headers)

        # The list's items endpoint should now 404
        res = client.get(f'/api/lists/{user_list["id"]}/items', headers=auth_headers)
        assert res.status_code == 404


class TestMoveList:
    """Tests for POST /api/lists/<id>/move.

    Verifies that moving a list swaps ranks correctly and that invalid
    direction values are rejected.

    Args:
        N/A — test methods receive pytest fixtures via dependency injection.

    Returns:
        N/A — assertions raise on failure.
    """

    def test_move_list_down_swaps_ranks(self, client, auth_headers):
        l1 = client.post('/api/lists', json={'name': 'First'}, headers=auth_headers).get_json()
        l2 = client.post('/api/lists', json={'name': 'Second'}, headers=auth_headers).get_json()

        assert l1['rank'] < l2['rank']

        # Move the first list down (should become second)
        res = client.post(
            f'/api/lists/{l1["id"]}/move',
            json={'direction': 'down'},
            headers=auth_headers,
        )
        assert res.status_code == 200

        # Verify ordering reversed
        lists = client.get('/api/lists', headers=auth_headers).get_json()
        ordered_ids = [l['id'] for l in lists]
        assert ordered_ids.index(l2['id']) < ordered_ids.index(l1['id'])

    def test_move_list_invalid_direction_returns_400(self, client, auth_headers, user_list):
        res = client.post(
            f'/api/lists/{user_list["id"]}/move',
            json={'direction': 'sideways'},
            headers=auth_headers,
        )
        assert res.status_code == 400
