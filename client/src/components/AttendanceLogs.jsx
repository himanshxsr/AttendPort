import { formatDate, formatHours, getISTDateString, formatISTTime } from '../utils/formatTime';
import { useAuth } from '../context/AuthContext';
import useServerNow from '../hooks/useServerNow';
import UserAvatar from './UserAvatar';

const AttendanceLogs = ({ logs, isCheckedIn }) => {
  const { user } = useAuth();
  const serverNowMs = useServerNow();
  if (!logs || logs.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          No attendance records yet. Check in to start tracking!
        </p>
      </div>
    );
  }

  const todayStr = getISTDateString(new Date(serverNowMs));

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <UserAvatar user={user} size="sm" />
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Attendance History</h3>
      </div>
      <div className="table-responsive">
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
              const sessions = log.workSessions || [];

              return (
                <tr key={log._id}>
                  <td>{formatDate(log.date)}</td>
                  <td style={{ verticalAlign: 'top', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {sessions.length > 0 ? (
                        sessions.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderRadius: '0.25rem', fontWeight: 700 }}>S{idx + 1}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'white' }}>
                              {formatISTTime(s.startTime)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {log.checkIn ? formatISTTime(log.checkIn) : '—'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {sessions.length > 0 ? (
                        sessions.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', borderRadius: '0.25rem', fontWeight: 700 }}>S{idx + 1}</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'white' }}>
                              {s.endTime ? formatISTTime(s.endTime) : (isToday && isActive ? 'Active' : '—')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {log.checkOut ? formatISTTime(log.checkOut) : '—'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-indigo)', verticalAlign: 'top' }}>
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
