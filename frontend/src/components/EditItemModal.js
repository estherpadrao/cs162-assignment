import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';

/**
 * Modal for editing an item's title, description, due date.
 * For top-level items it also allows moving to a different list.
 */
export default function EditItemModal({ item, lists, onSave, onClose }) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const [listId, setListId] = useState(item.list_id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || '');
    setDueDate(item.due_date || '');
    setListId(item.list_id);
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    const data = { title: title.trim(), description, due_date: dueDate || null };
    // Only send list_id if it has changed (and item is top-level)
    if (item.parent_item_id === null && listId !== item.list_id) {
      data.list_id = listId;
    }
    const result = await onSave(item.id, data, item.list_id);
    setSaving(false);
    if (result && result.ok === false) {
      setError(result.error || 'Save failed');
    } else {
      onClose();
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Due Date</Form.Label>
            <Form.Control
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Form.Group>

          {/* Move to list — only for top-level items */}
          {item.parent_item_id === null && lists.length > 1 && (
            <Form.Group className="mb-3">
              <Form.Label>Move to List</Form.Label>
              <Form.Select
                value={listId}
                onChange={(e) => setListId(Number(e.target.value))}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
