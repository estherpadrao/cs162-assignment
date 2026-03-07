import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useUser } from '../UserContext';

/**
 * Sticky top navigation bar shown on every page.
 *
 * Displays the site brand, a Home link, and — when authenticated — a My Lists
 * link, the username (links to profile), and a Sign Out button. When not
 * authenticated, Sign In and Register links are shown instead. The active
 * route is underlined.
 *
 * @param {void}
 * @returns {JSX.Element}
 */
export default function Header() {
  const { user, api, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Log out the current user and redirect to the home page.
   *
   * @param {void}
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/');
  };

  /**
   * Return an inline style that underlines the link when it matches the
   * current route.
   *
   * @param {string} path - The route path to compare against.
   * @returns {object} A React inline style object.
   */
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
