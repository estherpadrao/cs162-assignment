import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useUser } from '../UserContext';

export default function Header() {
  const { user, api, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/');
  };

  const activeLinkStyle = (path) => ({
    borderBottom: location.pathname === path ? '2px solid white' : '2px solid transparent',
    paddingBottom: '2px',
  });

  return (
    <Navbar expand="md" sticky="top" style={{ backgroundColor: '#6f42c1' }} variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Personal List
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" style={activeLinkStyle('/')}>Home</Nav.Link>
            {user && (
              <Nav.Link as={Link} to="/lists" style={activeLinkStyle('/lists')}>My Lists</Nav.Link>
            )}
          </Nav>
          <Nav>
            {user ? (
              <>
                <Nav.Link as={Link} to="/profile" style={activeLinkStyle('/profile')}>
                  {user.username}
                </Nav.Link>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="ms-2"
                  onClick={handleLogout}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" style={activeLinkStyle('/login')}>Sign In</Nav.Link>
                <Nav.Link as={Link} to="/register" style={activeLinkStyle('/register')}>Register</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
