import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Collapse,
} from 'react-bootstrap';

/**
 * Collapsible form for adding new items (or subitems) to any list.
 *
 * Props:
 *   lists        – all lists []
 *   itemsByList  – { [listId]: Item[] }
 *   onAdd        – async (data) => { ok, error }
 */
export default function AddItemForm({ lists, itemsByList, onAdd }) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [listId, setListId] = useState('');
  const [isSubitem, setIsSubitem] = useState(false);
  const [parentItemId, setParentItemId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset parent selection when list changes
  useEffect(() => {
    setParentItemId('');
  }, [listId]);

  // Top-level items available as parents for the selected list
  const parentCandidates = listId
    ? (itemsByList[Number(listId)] || []).filter((i) => i.parent_item_id === null)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (!listId) { setError('Please select a list'); return; }
    if (isSubitem && !parentItemId) { setError('Please select a parent item'); return; }

    setSaving(true);
    const data = {
      title: title.trim(),
      description,
      due_date: dueDate || null,
      list_id: Number(listId),
      parent_item_id: isSubitem ? Number(parentItemId) : null,
    };
    const result = await onAdd(data);
    setSaving(false);

    if (result.ok) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setIsSubitem(false);
      setParentItemId('');
      setSuccess('Task added!');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      setError(result.error || 'Failed to add task');
    }
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Header
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="fw-semibold">➕ Add a Task</span>
        <span>{open ? '▲' : '▼'}</span>
      </Card.Header>

      <Collapse in={open}>
        <div>
          <Card.Body>
            {error && <Alert variant="danger" className="py-2">{error}</Alert>}
            {success && <Alert variant="success" className="py-2">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Title *</Form.Label>
                    <Form.Control
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Task title"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>List *</Form.Label>
                    <Form.Select
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      required
                    >
                      <option value="">— select list —</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Due Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Check
                    type="checkbox"
                    label="Add as a sub-task"
                    checked={isSubitem}
                    onChange={(e) => setIsSubitem(e.target.checked)}
                    disabled={!listId || parentCandidates.length === 0}
                  />
                </Col>

                {isSubitem && (
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Parent Task *</Form.Label>
                      <Form.Select
                        value={parentItemId}
                        onChange={(e) => setParentItemId(e.target.value)}
                        required
                      >
                        <option value="">— select parent —</option>
                        {parentCandidates.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.title}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}

                <Col md={12}>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Adding…' : 'Add Task'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
}
