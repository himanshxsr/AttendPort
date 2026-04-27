import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Clock, Shield, User, Menu, X, Mail, MapPin, Briefcase, Calendar, Info, Fingerprint, Phone, Activity, Globe, CreditCard, Landmark } from 'lucide-react';
import UserAvatar from './UserAvatar';

const Navbar = () => {
  const { user, logout, loadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const formatProfileDate = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const maskAadhar = (v) => {
    if (!v) return '—';
    const s = String(v).replace(/\s/g, '');
    if (s.length < 4) return s;
    return `••••${s.slice(-4)}`;
  };

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
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.75rem', transition: 'background 0.2s' }}
                onClick={() => {
                  loadUser();
                  setIsProfileModalOpen(true);
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <UserAvatar user={user} size="md" />
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
          WebkitBackdropFilter: 'blur(10px)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          zIndex: 999,
          animation: 'modalFadeIn 0.3s ease-out',
        }}>
          <NavLinks />
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer' }}
              onClick={() => {
                loadUser();
                setIsProfileModalOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <UserAvatar user={user} size="lg" />
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

      {/* Profile Details Modal */}
      {isProfileModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem',
          animation: 'modalFadeIn 0.3s ease-out',
        }} onClick={() => setIsProfileModalOpen(false)}>
          <div 
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '2rem 2rem 1.5rem',
              textAlign: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              position: 'relative',
              background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.05), transparent)',
            }}>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <UserAvatar user={user} size="xl" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{user?.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-indigo)', fontWeight: 700, fontSize: '0.9rem' }}>
                <Fingerprint size={16} />
                {user?.employeeCode || 'N/A'}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 2rem 2rem' }}>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                
                {/* Leave Balances Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Casual Leave</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{user?.casualLeaveBalance ?? 0}</p>
                  </div>
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sick Leave</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>{user?.sickLeaveBalance ?? 0}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Email Address</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.email}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Designation & Role</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.designation || 'Staff'} • {user?.role}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Location</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.location || 'Not Specified'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Address</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.address || '—'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Date of birth</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatProfileDate(user?.dateOfBirth)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Contact no.</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.contactNo || '—'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Nationality</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.nationality || '—'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Aadhaar number</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{maskAadhar(user?.aadharNumber)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Emergency contact person</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {[user?.emergencyContactPersonName, user?.emergencyContactPersonRelation].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Emergency contact (phone)</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.emergencyContact || '—'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Blood Group</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--accent-rose)' }}>{user?.bloodGroup || '--'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Joining Date</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.joiningDate || 'N/A'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Landmark size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Name in bank & IFSC</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {user?.nameInBank || '—'}
                      {user?.ifscCode ? ` · ${user.ifscCode}` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.625rem', borderRadius: '0.75rem' }}>
                    <Info size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Account info</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.bankName || 'Bank N/A'} • {user?.accountNumber ? `****${String(user.accountNumber).slice(-4)}` : 'No account'}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
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

/* Navbar specific styles moved to index.css or added here if preferred */


export default Navbar;
