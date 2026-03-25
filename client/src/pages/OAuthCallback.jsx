import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      loadUser().then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, loadUser]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
