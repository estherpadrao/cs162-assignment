import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useUser } from '../UserContext';

/**
 * Public landing page shown at the root route ('/').
 *
 * Displays a hero message and call-to-action buttons. Authenticated users see
 * a single "Go to My Lists" button; unauthenticated users see Log In and
 * Register buttons.
 *
 * @param {void}
 * @returns {JSX.Element}
 */
export default function HomePage() {
  const { user } = useUser();

  return (
    <Container className="mt-5">
      <Row className="justify-content-center text-center">
        <Col md={8}>
          <h1 className="display-4 mb-3 fw-bold" style={{ color: '#4a1d96' }}>Hierarchical Todo Lists</h1>
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
              <Button
                as={Link}
                to="/login"
                size="lg"
                style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1', color: 'white' }}
              >
                Log In
              </Button>
              <Button
                as={Link}
                to="/register"
                size="lg"
                style={{ backgroundColor: 'transparent', borderColor: '#8b5cf6', color: '#6f42c1' }}
              >
                Register
              </Button>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}
