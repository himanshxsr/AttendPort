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
  const [activeView, setActiveView] = useState('summary'); // 'summary', 'calendar', or 'leaves'
  const [selectedDateLog, setSelectedDateLog] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ type: 'Sick', startDate: '', endDate: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [userPayslips, setUserPayslips] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [todayRes, logsRes, holidayRes, leavesRes, payslipsRes] = await Promise.all([
        API.get('/attendance/today'),
        API.get('/attendance/logs'),
        API.get('/attendance/holidays'),
        API.get('/attendance/my-leaves'),
        API.get('/attendance/my-payslips'),
      ]);

      setTodayData(todayRes.data);
      setHolidays(holidayRes.data);
      setLeaves(leavesRes.data);
      setUserPayslips(payslipsRes.data);
      
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

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveLoading(true);
    try {
      await API.post('/attendance/apply-leave', leaveForm);
      setLeaveForm({ type: 'Sick', startDate: '', endDate: '', reason: '' });
      setMessage({ type: 'success', text: 'Leave application submitted successfully!' });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setLeaveLoading(false);
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

  const getStatusDisplay = (log) => {
    if (!log) return '--';
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = log.date === todayStr;
    const isFuture = log.date > todayStr;

    if (isFuture) {
      if (log.status?.toLowerCase() === 'holiday') return 'HOLIDAY';
      return '--';
    }

    // Always prioritize 'ACTIVE' status for today if the session is open
    if (isToday && isCheckedIn) {
      return 'ACTIVE';
    }

    if (log.totalHours === 0) {
      if (isToday) return '--';
      return log.status?.toUpperCase() || 'ABSENT';
    }

    // If status is empty (pending), show '--' or 'PRESENT' based on context.
    // For today, if it's not active and hours are < required, the server returns ''.
    if (!log.status && isToday) return '--';

    return log.status?.toUpperCase() || 'PRESENT';
  };

  const getStatusClass = (log) => {
    const status = getStatusDisplay(log);
    if (status === '--') return 'none';
    if (status === 'ABSENT') return 'absent';
    if (status === 'HOLIDAY') return 'holiday';
    if (status === 'ACTIVE') return 'present';
    return status.toLowerCase();
  };

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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem 1rem',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
        <div className="tabs-scrollable" style={{ marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setActiveView('summary')}
            className={`btn-toggle ${activeView === 'summary' ? 'active' : ''}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'summary' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'summary' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Summary & Logs
          </button>
          <button 
            onClick={() => setActiveView('calendar')}
            className={`btn-toggle ${activeView === 'calendar' ? 'active' : ''}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'calendar' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'calendar' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Attendance Calendar
          </button>
          <button 
            onClick={() => setActiveView('leaves')}
            className={`btn-toggle ${activeView === 'leaves' ? 'active' : ''}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'leaves' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'leaves' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Leaves
          </button>
          <button 
            onClick={() => setActiveView('payslips')}
            className={`btn-toggle ${activeView === 'payslips' ? 'active' : ''}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'payslips' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'payslips' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Payslips
          </button>
          <button 
            onClick={() => setActiveView('payslips')}
            className={`btn-toggle ${activeView === 'payslips' ? 'active' : ''}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: activeView === 'payslips' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)',
              color: activeView === 'payslips' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Payslips
          </button>
        </div>

        {activeView === 'summary' && (
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
            <AttendanceLogs logs={logs} isCheckedIn={isCheckedIn} />
          </>
        )}

        {activeView === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AttendanceCalendar 
              logs={logs} 
              holidays={holidays} 
              onDateClick={(log) => setSelectedDateLog(log)}
            />
            
            {selectedDateLog && (
              <div 
                className="glass-card" 
                style={{ 
                  padding: '1.5rem', 
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  animation: 'modalFadeIn 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                      Performance Details
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(selectedDateLog.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`status-badge ${getStatusClass(selectedDateLog)}`}>
                    {getStatusDisplay(selectedDateLog)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Working Hours</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                      {formatHours(selectedDateLog.totalHours)}
                    </p>
                  </div>
                  {(selectedDateLog.checkIn || selectedDateLog.checkOut) && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Shift Timing</p>
                      <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>
                        {selectedDateLog.checkIn ? new Date(selectedDateLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                        {' - '}
                        {selectedDateLog.checkOut ? new Date(selectedDateLog.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (selectedDateLog.checkIn ? 'Active' : '--:--')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'leaves' && (
          <div className="responsive-grid-leaves" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.5rem', alignItems: 'start' }}>
            {/* Apply Leave Form */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Apply for Leave</h2>
              <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Leave Type</label>
                  <select 
                    className="input-field" 
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                    required
                  >
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Medical">Medical Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Start Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>End Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Reason</label>
                  <textarea 
                    className="input-field" 
                    rows="3" 
                    placeholder="Briefly explain your reason..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                    required
                    style={{ resize: 'none', padding: '0.75rem' }}
                  ></textarea>
                </div>
                <button type="submit" className="btn-gradient" disabled={leaveLoading} style={{ marginTop: '0.5rem' }}>
                  {leaveLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Leave History</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave._id}>
                        <td style={{ fontWeight: 600 }}>{leave.type}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {leave.startDate} to {leave.endDate}
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                            {leave.reason}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${leave.status.toLowerCase()}`}>
                            {leave.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          You haven't applied for any leaves yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'payslips' && (
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>My Payslips</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Month/Year</th>
                    <th>Net Pay</th>
                    <th>Earnings</th>
                    <th>Deductions</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userPayslips.map((payslip) => (
                    <tr key={payslip._id}>
                      <td style={{ fontWeight: 600 }}>{payslip.month} {payslip.year}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>₹{payslip.netPay.toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>₹{payslip.totalEarnings.toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>₹{payslip.totalDeductions.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => {
                            // Import utility dynamically to keep bundle small if possible,
                            // or use the imported function
                            import('../utils/PayslipPDF').then(module => {
                              module.generatePayslipPDF(user, payslip);
                            });
                          }}
                          className="btn-gradient"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto' }}
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {userPayslips.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No payslips have been generated for you yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <style>{`
          @media (max-width: 900px) {
            .responsive-grid-leaves {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default DashboardPage;
