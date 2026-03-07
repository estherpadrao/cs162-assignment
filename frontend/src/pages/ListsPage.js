import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { useUser } from '../UserContext';
import ListBlock from '../components/ListBlock';
import AddItemForm from '../components/AddItemForm';

/**
 * Main application page — shows all of the user's lists as kanban boards.
 *
 * On mount, fetches all lists and their items in parallel. Exposes handler
 * functions for every list and item action (create, rename, delete, move,
 * update column/collapse). After any mutation that changes ordering or
 * membership, the affected list(s) are re-fetched from the server to stay
 * in sync.
 *
 * @param {void}
 * @returns {JSX.Element}
 */
export default function ListsPage() {
  const { api } = useUser();

  const [lists, setLists] = useState([]);
  // itemsByList: { [listId]: Item[] }  (top-level items with nested subitems)
  const [itemsByList, setItemsByList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── data fetching ──────────────────────────────────────────────────────────

  /**
   * Fetch the current user's lists from the server and update state.
   *
   * @param {void}
   * @returns {Promise<object[]>} The fetched list array (empty on error).
   */
  const fetchLists = useCallback(async () => {
    const result = await api.getLists();
    if (result.ok) {
      setLists(result.lists);
      return result.lists;
    }
    setError('Failed to load lists');
    return [];
  }, [api]);

  /**
   * Fetch and store all top-level items (with sub-items) for a single list.
   *
   * @param {number} listId - The primary key of the list to fetch items for.
   * @returns {Promise<void>}
   */
  const fetchItemsForList = useCallback(
    async (listId) => {
      const result = await api.getListItems(listId);
      if (result.ok) {
        setItemsByList((prev) => ({ ...prev, [listId]: result.items }));
      }
    },
    [api]
  );

  /**
   * Fetch items for every list in the provided array in parallel.
   *
   * @param {object[]} loadedLists - The lists whose items should be fetched.
   * @returns {Promise<void>}
   */
  const fetchAllItems = useCallback(
    async (loadedLists) => {
      await Promise.all(loadedLists.map((l) => fetchItemsForList(l.id)));
    },
    [fetchItemsForList]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loadedLists = await fetchLists();
      await fetchAllItems(loadedLists);
      setLoading(false);
    })();
  }, [fetchLists, fetchAllItems]);

  // ── list actions ───────────────────────────────────────────────────────────

  /**
   * Create a new list with a default name and add it to state.
   *
   * @param {void}
   * @returns {Promise<void>}
   */
  const handleAddList = async () => {
    const result = await api.createList('New List');
    if (result.ok) {
      setLists((prev) => [...prev, result.list]);
      setItemsByList((prev) => ({ ...prev, [result.list.id]: [] }));
    }
  };

  /**
   * Rename a list and update its entry in state.
   *
   * @param {number} listId  - The primary key of the list to rename.
   * @param {string} newName - The replacement name.
   * @returns {Promise<void>}
   */
  const handleRenameList = async (listId, newName) => {
    const result = await api.updateList(listId, { name: newName });
    if (result.ok) {
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? result.list : l))
      );
    }
  };

  /**
   * Prompt for confirmation, delete a list, and remove it from state.
   *
   * @param {number} listId - The primary key of the list to delete.
   * @returns {Promise<void>}
   */
  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list and all its items?')) return;
    const result = await api.deleteList(listId);
    if (result.ok) {
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setItemsByList((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
    }
  };

  /**
   * Move a list up or down and re-fetch the full list order from the server.
   *
   * @param {number} listId    - The primary key of the list to move.
   * @param {string} direction - 'up' or 'down'.
   * @returns {Promise<void>}
   */
  const handleMoveList = async (listId, direction) => {
    const result = await api.moveList(listId, direction);
    if (result.ok) {
      const freshLists = await fetchLists();
      setLists(freshLists);
    }
  };

  // ── item actions ───────────────────────────────────────────────────────────

  /**
   * Re-fetch items for a single list (used after mutations).
   *
   * @param {number} listId - The primary key of the list to refresh.
   * @returns {Promise<void>}
   */
  const refreshList = async (listId) => {
    await fetchItemsForList(listId);
  };

  /**
   * Create a new item and refresh its list.
   *
   * @param {object} data - Item payload (list_id, title, etc.).
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  const handleAddItem = async (data) => {
    const result = await api.createItem(data);
    if (result.ok) {
      await fetchItemsForList(data.list_id);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  };

  /**
   * Update an item's fields, refreshing both lists if the item moved between them.
   *
   * @param {number} itemId - The item's primary key.
   * @param {object} data   - Fields to update.
   * @param {number} listId - The item's current list (before any move).
   * @returns {Promise<{ok: boolean, item?: object, error?: string}>}
   */
  const handleUpdateItem = async (itemId, data, listId) => {
    const result = await api.updateItem(itemId, data);
    if (result.ok) {
      // If the item was moved to a different list, refresh both lists
      if (data.list_id && data.list_id !== listId) {
        await fetchItemsForList(listId);
        await fetchItemsForList(data.list_id);
      } else {
        await fetchItemsForList(listId);
      }
    }
    return result;
  };

  /**
   * Delete an item and refresh its list.
   *
   * @param {number} itemId - The item's primary key.
   * @param {number} listId - The list the item belongs to.
   * @returns {Promise<void>}
   */
  const handleDeleteItem = async (itemId, listId) => {
    const result = await api.deleteItem(itemId);
    if (result.ok) {
      await fetchItemsForList(listId);
    }
  };

  /**
   * Move an item up or down within its column and refresh the list.
   *
   * @param {number} itemId    - The item's primary key.
   * @param {string} direction - 'up' or 'down'.
   * @param {number} listId    - The list the item belongs to.
   * @returns {Promise<void>}
   */
  const handleMoveItem = async (itemId, direction, listId) => {
    await api.moveItem(itemId, direction);
    await fetchItemsForList(listId);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 px-4">
      <div className="d-flex align-items-center mb-4 gap-3">
        <h2 className="mb-0">My Lists</h2>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Add-item form (always visible at the top) ───────────────────── */}
      <AddItemForm lists={lists} itemsByList={itemsByList} onAdd={handleAddItem} />

      {/* ── List feed ───────────────────────────────────────────────────── */}
      {lists.length === 0 ? (
        <p className="text-muted">No lists yet. Create one below!</p>
      ) : (
        lists.map((list, idx) => (
          <ListBlock
            key={list.id}
            list={list}
            items={itemsByList[list.id] || []}
            allLists={lists}
            isFirst={idx === 0}
            isLast={idx === lists.length - 1}
            onRename={handleRenameList}
            onDelete={handleDeleteList}
            onMoveList={handleMoveList}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onMoveItem={handleMoveItem}
            onRefresh={() => refreshList(list.id)}
          />
        ))
      )}

      {/* ── Add new list ─────────────────────────────────────────────────── */}
      <div className="mt-3 mb-5">
        <Button variant="outline-success" onClick={handleAddList}>
          + Add New List
        </Button>
      </div>
    </Container>
  );
}
