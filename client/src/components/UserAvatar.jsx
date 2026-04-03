import React from 'react';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const { name, avatar } = user || {};
  
  // Get initials (e.g., "Himanshu Aashish" -> "HA")
  const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Generate a consistent background color based on the name
  const getAvatarColor = (name) => {
    if (!name) return 'var(--accent-indigo)';
    const colors = [
      '#6366f1', // Indigo
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
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

  if (avatar) {
    return (
      <div style={avatarStyle} className={className}>
        <img 
          src={avatar} 
          alt={name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<span>${getInitials(name)}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div style={avatarStyle} className={className}>
      <span>{getInitials(name)}</span>
    </div>
  );
};

export default UserAvatar;
