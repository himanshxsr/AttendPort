import React, { useEffect, useState, useMemo } from 'react';
import API from '../api/axios';

/**
 * Google Drive share / open / uc → thumbnail. Other URLs (e.g. lh3.googleusercontent) pass through.
 */
function toDirectImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const fromPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fromPath) {
    return `https://drive.google.com/thumbnail?sz=w512&id=${fromPath[1]}`;
  }
  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes('drive.google.com') && idParam) {
    return `https://drive.google.com/thumbnail?sz=w512&id=${idParam[1]}`;
  }
  if (trimmed.includes('drive.usercontent.google.com') && idParam) {
    return `https://drive.google.com/thumbnail?sz=w512&id=${idParam[1]}`;
  }
  return trimmed;
}

function getApiOrigin() {
  const b = API.defaults?.baseURL || '';
  return b.replace(/\/api\/?$/, '') || (typeof window !== 'undefined' && window.location?.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://attendport-azwy.onrender.com');
}

function getRelayUrl(userId) {
  if (!userId) return null;
  const isViteLocal =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isViteLocal) {
    return `/api/avatar/relay/${userId}`;
  }
  return `${getApiOrigin()}/api/avatar/relay/${userId}`;
}

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const { name, avatar, _id: userId } = user || {};
  const directUrl = useMemo(
    () => (typeof avatar === 'string' && avatar.trim() ? toDirectImageUrl(avatar) : null),
    [avatar]
  );
  const relayUrl = useMemo(
    () => (userId && typeof avatar === 'string' && avatar.trim() ? getRelayUrl(userId) : null),
    [userId, avatar]
  );
  /**
   * Load order: try direct Google/Drive URL in the browser first (no-referrer avoids many 403s).
   * Google often blocks *server* fetches, so the relay 502s — only use it after direct fails.
   */
  const [directFailed, setDirectFailed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDirectFailed(false);
    setFailed(false);
  }, [userId, avatar]);

  const getInitials = (n) => {
    if (!n) return '?';
    const names = n.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return n[0].toUpperCase();
  };

  const getAvatarColor = (n) => {
    if (!n) return 'var(--accent-indigo)';
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4', '#10b981', '#f59e0b',
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i += 1) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sizes = {
    sm: { width: '24px', height: '24px', fontSize: '0.65rem' },
    md: { width: '32px', height: '32px', fontSize: '0.85rem' },
    lg: { width: '48px', height: '48px', fontSize: '1.1rem' },
    xl: { width: '80px', height: '80px', fontSize: '1.8rem' },
  };
  const currentSize = sizes[size] || sizes.md;
  const avatarStyle = {
    ...currentSize,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontWeight: 700,
    color: 'white',
    background: getAvatarColor(name),
    flexShrink: 0,
  };

  const effectiveSrc = useMemo(() => {
    if (failed) return null;
    if (directUrl && !directFailed) return directUrl;
    if (relayUrl) return relayUrl;
    return directUrl;
  }, [failed, directUrl, directFailed, relayUrl]);

  const isRelay = Boolean(
    effectiveSrc &&
    (effectiveSrc.startsWith('/api/avatar/') || effectiveSrc.includes('/api/avatar/relay/'))
  );

  const onImgError = () => {
    if (directUrl && !directFailed && relayUrl) {
      setDirectFailed(true);
    } else {
      setFailed(true);
    }
  };

  if (!effectiveSrc || failed) {
    return (
      <div style={avatarStyle} className={className}>
        <span>{getInitials(name)}</span>
      </div>
    );
  }

  return (
    <div style={avatarStyle} className={className}>
      <img
        key={`${userId || ''}-av-${directFailed ? 'r' : 'd'}`}
        src={effectiveSrc}
        alt={name || ''}
        referrerPolicy={isRelay ? undefined : 'no-referrer'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={onImgError}
      />
    </div>
  );
};

export default UserAvatar;
