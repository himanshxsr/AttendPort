import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Clock, Shield, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <Link to="/dashboard" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Clock size={24} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            AttendTrack
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: isActive('/dashboard') ? 'var(--accent-indigo)' : 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              transition: 'all 0.2s ease',
              background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            }}
          >
            Dashboard
          </Link>

          {user?.role === 'Admin' && (
            <Link
              to="/admin"
              style={{
                textDecoration: 'none',
                color: isActive('/admin') ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: isActive('/admin') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              }}
            >
              <Shield size={14} />
              Admin
            </Link>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginLeft: '0.5rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={16} color="white" />
              </div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}>
                {user?.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-rose)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
