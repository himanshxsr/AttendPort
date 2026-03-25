import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserPlus } from 'lucide-react';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <UserPlus size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Join AttendTrack to start tracking your time
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '0.75rem',
            color: '#fb7185',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                id="register-name"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="register-email"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                id="register-password"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }} />
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                id="register-confirm-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-gradient"
            style={{ width: '100%' }}
            disabled={loading}
            id="register-submit"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            color: 'var(--accent-indigo)',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
