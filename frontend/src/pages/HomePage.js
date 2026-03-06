import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useUser } from '../UserContext';

export default function HomePage() {
  const { user } = useUser();

  return (
    <Container className="mt-5">
      <Row className="justify-content-center text-center">
        <Col md={8}>
          <h1 className="display-4 mb-3" style={{ color: '#6f42c1' }}>Hierarchical Todo Lists</h1>
          <p className="lead text-muted mb-4">
            Organise your work across multiple lists with nested tasks, kanban-style
            columns and per-user privacy.
          </p>

          {user ? (
            <Button
              as={Link}
              to="/lists"
              size="lg"
              style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1', color: 'white' }}
            >
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
    </Container>
  );
}
