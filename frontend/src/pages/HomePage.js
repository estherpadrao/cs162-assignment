import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useUser } from '../UserContext';

export default function HomePage() {
  const { user } = useUser();

  return (
    <Container className="mt-5">
      <Row className="justify-content-center text-center">
        <Col md={8}>
          <h1 className="display-4 mb-3">Hierarchical Todo Lists</h1>
          <p className="lead text-muted mb-4">
            Organise your work across multiple lists with nested tasks, kanban-style
            columns and per-user privacy.
          </p>

          {user ? (
            <Button as={Link} to="/lists" variant="primary" size="lg">
              Go to My Lists
            </Button>
          ) : (
            <div className="d-flex gap-3 justify-content-center">
              <Button as={Link} to="/login" variant="primary" size="lg">
                Log In
              </Button>
              <Button as={Link} to="/register" variant="outline-primary" size="lg">
                Register
              </Button>
            </div>
          )}
        </Col>
      </Row>

      <Row className="mt-5 g-4">
        {[
          {
            title: 'Multiple Lists',
            text: 'Create as many lists as you need and reorder them by priority.',
          },
          {
            title: 'Nested Tasks',
            text: 'Break any task into subtasks — nest as deep as you like.',
          },
          {
            title: 'Kanban Columns',
            text: 'Track progress with To Do, Doing and Done columns per list.',
          },
          {
            title: 'Private & Local',
            text: 'Each user only sees their own data. No cloud, no third-party services.',
          },
        ].map((f) => (
          <Col md={3} key={f.title}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>{f.title}</Card.Title>
                <Card.Text className="text-muted">{f.text}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
