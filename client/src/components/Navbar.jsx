import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Clock, Shield, User, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const NavLinks = () => (
    <>
      <Link
        to="/dashboard"
        onClick={() => setIsMenuOpen(false)}
        style={{
          textDecoration: 'none',
          color: isActive('/dashboard') ? 'var(--accent-indigo)' : 'var(--text-secondary)',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '0.5rem 1rem',
          borderRadius: '0.75rem',
          transition: 'all 0.2s ease',
          background: isActive('/dashboard') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        Dashboard
      </Link>

      {user?.role === 'Admin' && (
        <Link
          to="/admin"
          onClick={() => setIsMenuOpen(false)}
          style={{
            textDecoration: 'none',
            color: isActive('/admin') ? 'var(--accent-indigo)' : 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: isActive('/admin') ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          }}
        >
          <Shield size={14} />
          Admin Panel
        </Link>
      )}
    </>
  );

  return (
    <>
      <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      {/* Desktop Navbar */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
      }}>
        <Link to="/dashboard" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}>
            <Clock size={20} color="white" />
          </div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            AttendPortal
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NavLinks />
          <div style={{
            width: '1px',
            height: '24px',
            background: 'var(--border-subtle)',
            margin: '0 0.5rem'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)'
              }}>
                <User size={16} color="var(--text-secondary)" />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-icon"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: 'none',
                color: 'var(--accent-rose)',
                cursor: 'pointer',
                padding: '0.625rem',
                borderRadius: '0.5rem',
                display: 'flex',
                transition: 'all 0.2s ease',
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={toggleMenu}
          className="mobile-only"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'none', // Managed by CSS media query in index.css
          }}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          zIndex: 999,
          animation: 'modalFadeIn 0.3s ease-out',
        }}>
          <NavLinks />
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={20} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: 'none',
              color: 'var(--accent-rose)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginTop: 'auto'
            }}
          >
            <LogOut size={20} />
            Logout Account
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
