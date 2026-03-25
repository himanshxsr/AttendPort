import useTimer from '../hooks/useTimer';

const Timer = ({ checkInTime, isCheckedIn }) => {
  const { formatted, isRunning } = useTimer(isCheckedIn ? checkInTime : null);

  return (
    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: 'var(--text-secondary)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}>
        {isCheckedIn && <div className="pulse-dot"></div>}
        {isCheckedIn ? 'Time Elapsed' : 'Ready to Start'}
      </div>

      <div className={`timer-display ${isRunning ? 'active' : ''}`}>
        {formatted}
      </div>

      {isCheckedIn && (
        <div style={{
          marginTop: '0.75rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          Checked in at{' '}
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontFamily: 'monospace' }}>
            {new Date(checkInTime).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

export default Timer;
