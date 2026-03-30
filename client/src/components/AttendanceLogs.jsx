import { formatDate, formatHours } from '../utils/formatTime';

const AttendanceLogs = ({ logs, isCheckedIn }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          No attendance records yet. Check in to start tracking!
        </p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Attendance History</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isToday = log.date === todayStr;
              const isActive = isToday && isCheckedIn;

              return (
                <tr key={log._id}>
                  <td>{formatDate(log.date)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>
                    {formatHours(log.totalHours)}
                  </td>
                  <td>
                    <span className={`status-badge ${
                      isActive ? 'active' : (log.status?.toLowerCase() || 'none')
                    }`}>
                      {isActive ? 'ACTIVE' : (log.status || '--')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceLogs;
