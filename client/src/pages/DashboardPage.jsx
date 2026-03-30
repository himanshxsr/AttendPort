import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import AttendanceLogs from '../components/AttendanceLogs';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { formatHours, getCompleteHistory } from '../utils/formatTime';
import { Clock, CalendarDays, TrendingUp, CheckCircle } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState({ attendance: null, workSessions: [] });
  const [logs, setLogs] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [activeView, setActiveView] = useState('summary'); // 'summary' or 'calendar'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [todayRes, logsRes, holidayRes] = await Promise.all([
        API.get('/attendance/today'),
        API.get('/attendance/logs'),
        API.get('/attendance/holidays'),
      ]);

      setTodayData(todayRes.data);
      setHolidays(holidayRes.data);
      
      // Fill gaps with Absent records from the day user joined
      const fullHistory = getCompleteHistory(user.createdAt, logsRes.data);
      setLogs(fullHistory);

      // Determine if user is currently checked in
      const sessions = todayRes.data.workSessions || [];
      const hasOpenSession = sessions.some((s) => s.startTime && !s.endTime);
      setIsCheckedIn(hasOpenSession);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await API.post('/attendance/check-in');
      setError('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed');
      setTimeout(() => setError(''), 5000); // Clear after 5s
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await API.put('/attendance/check-out');
      await fetchData();
    } catch (err) {
      console.error('Check-out failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Find the active session's start time for the timer
  const activeSession = (todayData.workSessions || []).find((s) => s.startTime && !s.endTime);
  const timerStartTime = activeSession ? activeSession.startTime : todayData.attendance?.checkIn;

  // Stats calculations
  const thisWeekLogs = logs.filter((log) => {
    const logDate = new Date(log.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  });
  const totalWeekHours = thisWeekLogs.reduce((acc, log) => acc + (log.totalHours || 0), 0);
  const daysPresent = logs.filter(log => log.status !== 'Absent' && log.totalHours > 0).length;

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}>
          <div className="spinner"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {user?.name?.split(' ')[0]}
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.75rem',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Clock size={20} style={{ color: 'var(--accent-indigo)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Today</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {formatHours(todayData.attendance?.totalHours || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.75rem',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TrendingUp size={20} style={{ color: 'var(--accent-emerald)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>This Week</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {formatHours(totalWeekHours)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.75rem',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CalendarDays size={20} style={{ color: 'var(--accent-violet)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Days Present</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {daysPresent}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.75rem',
                background: isCheckedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle size={20} style={{ color: isCheckedIn ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Status</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: isCheckedIn ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {isCheckedIn ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggles */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setActiveView('summary')}
            className={`btn-toggle ${activeView === 'summary' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'summary' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'summary' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            Summary & Logs
          </button>
          <button 
            onClick={() => setActiveView('calendar')}
            className={`btn-toggle ${activeView === 'calendar' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'calendar' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'calendar' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            Attendance Calendar
          </button>
        </div>

        {activeView === 'summary' ? (
          <>
            {/* Timer & Actions Card */}
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <Timer checkInTime={timerStartTime} isCheckedIn={isCheckedIn} />

          {error && (
            <div style={{
              textAlign: 'center',
              color: 'var(--accent-rose)',
              background: 'rgba(244, 63, 94, 0.1)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              marginTop: '1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '1.5rem',
          }}>
            <button
              className="btn-checkin"
              onClick={handleCheckIn}
              disabled={isCheckedIn || actionLoading}
              id="check-in-btn"
            >
              {actionLoading && !isCheckedIn ? 'Checking In...' : '🟢 Check In'}
            </button>
            <button
              className="btn-checkout"
              onClick={handleCheckOut}
              disabled={!isCheckedIn || actionLoading}
              id="check-out-btn"
            >
              {actionLoading && isCheckedIn ? 'Checking Out...' : '🔴 Check Out'}
            </button>
          </div>
        </div>

            {/* Attendance Logs */}
            <AttendanceLogs logs={logs} />
          </>
        ) : (
          <AttendanceCalendar logs={logs} holidays={holidays} />
        )}
      </div>
    </>
  );
};

export default DashboardPage;
