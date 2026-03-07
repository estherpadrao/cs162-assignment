import { useState } from 'react';
import { Card, Row, Col, Button, Form, Badge } from 'react-bootstrap';
import ItemCard from './ItemCard';

/** Column definitions for the kanban board. */
const COLUMNS = [
  { key: 'todo', label: 'To Do', variant: 'secondary' },
  { key: 'doing', label: 'Doing', variant: 'warning' },
  { key: 'done', label: 'Done', variant: 'success' },
];

/**
 * Renders a single list as a kanban board with three columns (To Do, Doing, Done).
 *
 * The list header shows the name with an inline rename form, up/down move
 * buttons, and a delete button. Each column contains the items whose
 * 'column' field matches, sorted by rank.
 *
 * @param {object}   list         - The list object (id, name, rank).
 * @param {object[]} items        - Top-level items for this list.
 * @param {object[]} allLists     - All lists (passed through to ItemCard).
 * @param {boolean}  isFirst      - True if this is the first list in the feed.
 * @param {boolean}  isLast       - True if this is the last list in the feed.
 * @param {function} onRename     - async (listId, newName) => void
 * @param {function} onDelete     - async (listId) => void
 * @param {function} onMoveList   - async (listId, direction) => void
 * @param {function} onUpdateItem - async (itemId, data, listId) => result
 * @param {function} onDeleteItem - async (itemId, listId) => void
 * @param {function} onMoveItem   - async (itemId, direction, listId) => void
 * @returns {JSX.Element}
 */
export default function ListBlock({
  list,
  items,
  allLists,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMoveList,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);

  /**
   * Submit the inline rename form and call onRename if the name is non-blank.
   *
   * @param {React.FormEvent} e - The form submit event.
   * @returns {Promise<void>}
   */
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (nameValue.trim()) {
      await onRename(list.id, nameValue.trim());
    }
    setEditingName(false);
  };

  /**
   * Return items belonging to the given column, sorted ascending by rank.
   *
   * @param {string} colKey - One of 'todo', 'doing', or 'done'.
   * @returns {object[]} Filtered and sorted items.
   */
  const itemsForColumn = (colKey) =>
    items
      .filter((i) => i.column === colKey)
      .sort((a, b) => a.rank - b.rank);

  return (
    <Card className="mb-4 shadow-sm">
      {/* ── List header ── */}
      <Card.Header className="d-flex align-items-center gap-2 py-2">
        {editingName ? (
          <Form onSubmit={handleRenameSubmit} className="d-flex gap-2 flex-grow-1">
            <Form.Control
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              autoFocus
              size="sm"
              className="flex-grow-1"
            />
            <Button type="submit" size="sm" variant="success">
              ✔
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => { setEditingName(false); setNameValue(list.name); }}
            >
              ✕
            </Button>
          </Form>
        ) : (
          <>
            <span className="fw-bold fs-5 flex-grow-1">{list.name}</span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setEditingName(true)}
              title="Rename list"
            >
              ✎
            </Button>
          </>
        )}

        {/* Move list up/down */}
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={isFirst}
          onClick={() => onMoveList(list.id, 'up')}
          title="Move list up"
        >
          ↑
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={isLast}
          onClick={() => onMoveList(list.id, 'down')}
          title="Move list down"
        >
          ↓
        </Button>

        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => onDelete(list.id)}
          title="Delete list"
        >
          🗑
        </Button>
      </Card.Header>

      {/* ── Kanban columns ── */}
      <Card.Body>
        <Row className="g-3">
          {COLUMNS.map((col) => {
            const colItems = itemsForColumn(col.key);
            return (
              <Col key={col.key} md={4}>
                <div className="p-2 rounded" style={{ background: '#f0eaff', minHeight: 120 }}>
                  <div className="mb-2 d-flex align-items-center gap-2">
                    <Badge bg={col.variant} className="fs-6 px-3 py-2">
                      {col.label}
                    </Badge>
                    <span className="text-muted small">{colItems.length} item(s)</span>
                  </div>

                  {colItems.length === 0 ? (
                    <p className="text-muted small text-center mt-3">No items</p>
                  ) : (
                    colItems.map((item, idx) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        depth={0}
                        allLists={allLists}
                        onUpdate={onUpdateItem}
                        onDelete={onDeleteItem}
                        onMoveItem={onMoveItem}
                        isFirst={idx === 0}
                        isLast={idx === colItems.length - 1}
                      />
                    ))
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </Card.Body>
    </Card>
  );
}
