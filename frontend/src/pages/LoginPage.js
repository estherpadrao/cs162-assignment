import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useUser } from '../UserContext';

/**
 * Login page — renders an email/password form.
 *
 * On successful login, stores the user in context and navigates to /lists.
 * Displays an inline error alert on failure.
 *
 * @param {void}
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const { api, setUser } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Submit the login form, call the API, and handle the result.
   *
   * @param {React.FormEvent} e - The form submit event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await api.login(email, password);
    setLoading(false);
    if (result.ok) {
      setUser(result.user);
      navigate('/lists');
    } else {
      setError(result.error);
    }
  };

  return (
    <Container className="mt-5" style={{ maxWidth: 420 }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <Card.Title className="mb-4 text-center fs-3">Sign In</Card.Title>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              variant="primary"
              className="w-100"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Form>

          <div className="mt-3 text-center text-muted">
            No account? <Link to="/register">Register here</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
