import { useNavigate } from 'react-router-dom';
import { Container, Card, Button, Row, Col } from 'react-bootstrap';
import { useUser } from '../UserContext';

export default function ProfilePage() {
  const { user, api, setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <Container className="mt-5" style={{ maxWidth: 500 }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <Card.Title className="mb-4 fs-3" style={{ color: '#6f42c1' }}>My Profile</Card.Title>

          <Row className="mb-3">
            <Col sm={4} className="fw-semibold text-muted">Username</Col>
            <Col sm={8}>{user.username}</Col>
          </Row>

          <Row className="mb-3">
            <Col sm={4} className="fw-semibold text-muted">Email</Col>
            <Col sm={8}>{user.email}</Col>
          </Row>

          <Row className="mb-3">
            <Col sm={4} className="fw-semibold text-muted">User ID</Col>
            <Col sm={8}>{user.id}</Col>
          </Row>

          <hr />

          <Button variant="outline-danger" onClick={handleLogout}>
            Sign Out
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
