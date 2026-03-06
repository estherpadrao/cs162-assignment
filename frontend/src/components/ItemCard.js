import { useState } from 'react';
import { Card, Badge, Button, ButtonGroup } from 'react-bootstrap';
import EditItemModal from './EditItemModal';

/**
 * Renders a single item (or subitem) card.
 *
 * Props:
 *   item          – the item object (with .subitems[])
 *   depth         – nesting depth (0 = top-level)
 *   allLists      – all lists (for move-to-list in edit modal)
 *   onUpdate      – async (itemId, data, listId) => result
 *   onDelete      – async (itemId, listId) => void
 *   onMoveItem    – async (itemId, direction, listId) => void  (rank swap)
 *   isFirst       – boolean (no up arrow)
 *   isLast        – boolean (no down arrow)
 */
export default function ItemCard({
  item,
  depth = 0,
  allLists,
  onUpdate,
  onDelete,
  onMoveItem,
  isFirst,
  isLast,
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [collapsed, setCollapsed] = useState(item.is_collapsed || false);

  const hasSubitems = item.subitems && item.subitems.length > 0;

  const columnLabel = { todo: 'To Do', doing: 'Doing', done: 'Done' };
  const columnVariant = { todo: 'secondary', doing: 'warning', done: 'success' };

  const handleToggleCollapse = async () => {
    const next = !collapsed;
    setCollapsed(next);
    await onUpdate(item.id, { is_collapsed: next }, item.list_id);
  };

  const handleMoveColumn = async (newCol) => {
    await onUpdate(item.id, { column: newCol }, item.list_id);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await onDelete(item.id, item.list_id);
  };

  // Card background lightens with depth so nested items are visually distinct
  const bgStyle = depth > 0 ? { backgroundColor: '#f8f9fa' } : {};
  const borderStyle = depth > 0 ? { borderLeft: `3px solid #dee2e6` } : {};

  return (
    <>
      <Card
        className="mb-2 shadow-sm"
        style={{ ...bgStyle, ...borderStyle, fontSize: '0.9rem' }}
      >
        <Card.Body className="py-2 px-3">
          {/* ── Title row ── */}
          <div className="d-flex align-items-start gap-1 flex-wrap">
            {/* Collapse toggle */}
            {hasSubitems && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted"
                title={collapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                onClick={handleToggleCollapse}
                style={{ lineHeight: 1 }}
              >
                {collapsed ? '▶' : '▼'}
              </Button>
            )}

            <div className="flex-grow-1">
              <strong>{item.title}</strong>
              {item.due_date && (
                <span className="ms-2 text-muted" style={{ fontSize: '0.8rem' }}>
                  📅 {item.due_date}
                </span>
              )}
              {item.description && (
                <div className="text-muted mt-1" style={{ fontSize: '0.82rem' }}>
                  {item.description}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="d-flex gap-1 flex-shrink-0">
              {/* Up / Down rank within column */}
              <ButtonGroup size="sm">
                <Button
                  variant="outline-secondary"
                  disabled={isFirst}
                  onClick={() => onMoveItem(item.id, 'up', item.list_id)}
                  title="Move up"
                >
                  ▲
                </Button>
                <Button
                  variant="outline-secondary"
                  disabled={isLast}
                  onClick={() => onMoveItem(item.id, 'down', item.list_id)}
                  title="Move down"
                >
                  ▼
                </Button>
              </ButtonGroup>

              {/* Column movement (top-level items only) */}
              {depth === 0 && (
                <ButtonGroup size="sm">
                  {item.column !== 'todo' && (
                    <Button
                      variant="outline-secondary"
                      onClick={() =>
                        handleMoveColumn(item.column === 'done' ? 'doing' : 'todo')
                      }
                      title="Move left"
                    >
                      ←
                    </Button>
                  )}
                  {item.column !== 'done' && (
                    <Button
                      variant={item.column === 'doing' ? 'outline-success' : 'outline-warning'}
                      onClick={() =>
                        handleMoveColumn(item.column === 'todo' ? 'doing' : 'done')
                      }
                      title={item.column === 'todo' ? 'Move to Doing' : 'Mark Done'}
                    >
                      →
                    </Button>
                  )}
                </ButtonGroup>
              )}

              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowEdit(true)}
                title="Edit"
              >
                ✎
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleDelete}
                title="Delete"
              >
                🗑
              </Button>
            </div>
          </div>

          {/* ── Subitems ── */}
          {hasSubitems && !collapsed && (
            <div className="mt-2 ps-3">
              {item.subitems.map((sub, idx) => (
                <ItemCard
                  key={sub.id}
                  item={sub}
                  depth={depth + 1}
                  allLists={allLists}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onMoveItem={onMoveItem}
                  isFirst={idx === 0}
                  isLast={idx === item.subitems.length - 1}
                />
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {showEdit && (
        <EditItemModal
          item={item}
          lists={allLists}
          onSave={onUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
