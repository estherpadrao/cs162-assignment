import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { useUser } from '../UserContext';
import ListBlock from '../components/ListBlock';
import AddItemForm from '../components/AddItemForm';

export default function ListsPage() {
  const { api } = useUser();

  const [lists, setLists] = useState([]);
  // itemsByList: { [listId]: Item[] }  (top-level items with nested subitems)
  const [itemsByList, setItemsByList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchLists = useCallback(async () => {
    const result = await api.getLists();
    if (result.ok) {
      setLists(result.lists);
      return result.lists;
    }
    setError('Failed to load lists');
    return [];
  }, [api]);

  const fetchItemsForList = useCallback(
    async (listId) => {
      const result = await api.getListItems(listId);
      if (result.ok) {
        setItemsByList((prev) => ({ ...prev, [listId]: result.items }));
      }
    },
    [api]
  );

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

  const handleAddList = async () => {
    const result = await api.createList('New List');
    if (result.ok) {
      setLists((prev) => [...prev, result.list]);
      setItemsByList((prev) => ({ ...prev, [result.list.id]: [] }));
    }
  };

  const handleRenameList = async (listId, newName) => {
    const result = await api.updateList(listId, { name: newName });
    if (result.ok) {
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? result.list : l))
      );
    }
  };

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

  const handleMoveList = async (listId, direction) => {
    const result = await api.moveList(listId, direction);
    if (result.ok) {
      const freshLists = await fetchLists();
      setLists(freshLists);
    }
  };

  // ── item actions ───────────────────────────────────────────────────────────

  const refreshList = async (listId) => {
    await fetchItemsForList(listId);
  };

  const handleAddItem = async (data) => {
    const result = await api.createItem(data);
    if (result.ok) {
      await fetchItemsForList(data.list_id);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  };

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

  const handleDeleteItem = async (itemId, listId) => {
    const result = await api.deleteItem(itemId);
    if (result.ok) {
      await fetchItemsForList(listId);
    }
  };

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
