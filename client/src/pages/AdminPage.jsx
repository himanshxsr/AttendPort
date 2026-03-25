import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { formatDate, formatHours, getCompleteHistory } from '../utils/formatTime';
import { Users, Calendar, BarChart3, Search, Trash2 } from 'lucide-react';

const AdminPage = () => {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [formLoading, setFormLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Employee');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attendanceRes, usersRes, deletedUsersRes] = await Promise.all([
        API.get('/admin/all-attendance'),
        API.get('/admin/users'),
        API.get('/admin/deleted-users'),
      ]);
      setAttendance(attendanceRes.data);
      setUsers(usersRes.data);
      setDeletedUsers(deletedUsersRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await API.post('/admin/add-employee', { name: newName, email: newEmail, role: newRole });
      setMessage({ type: 'success', text: 'Employee added successfully!' });
      setNewName('');
      setNewEmail('');
      setNewRole('Employee');
      fetchData(); // Refresh list
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to add employee',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setLoading(true);
    try {
      await API.put(`/admin/update-role/${userId}`, { role: newRole });
      await fetchData(); // Refresh list to show updated roles
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    setLoading(true);
    try {
      await API.delete(`/admin/user/${userId}`);
      setMessage({ type: 'success', text: `User ${userName} deleted successfully!` });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete user',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAttendance = () => {
    // If a date is filtered, show ALL users (Daily Report)
    if (filterDate) {
      return users.map(user => {
        const log = attendance.find(l => l.userId?._id === user._id && l.date === filterDate);
        if (log) return log;
        
        // Return a virtual Absent record for this user on this date
        return {
          _id: `absent-${user._id}-${filterDate}`,
          userId: user,
          date: filterDate,
          status: 'Absent',
          totalHours: 0,
          isVirtual: true
        };
      });
    }

    const filtered = attendance.filter((log) => {
      const matchesSearch =
        log.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    // If search term is present and we're looking at a specific user,
    // we want to show their "Absent" days too
    if (searchTerm && searchTerm.length > 2) {
      // Find matches in user list
      const matchingUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // If we find exactly one user, show their complete history
      if (matchingUsers.length === 1) {
        const user = matchingUsers[0];
        const userLogs = attendance.filter(log => log.userId?._id === user._id);
        
        // Fill gaps with Absent records
        const fullHistory = getCompleteHistory(user.createdAt, userLogs);
        
        // Ensure userId is present in virtual records for the UI
        return fullHistory.map(log => ({
          ...log,
          userId: log.userId || user
        }));
      }
    }

    return filtered;
  };

  const getUserAttendanceCount = (userId) => {
    return attendance.filter(
      (log) => 
        log.userId?._id === userId && 
        log.totalHours > 0 && 
        (log.status?.toUpperCase() === 'PRESENT' || log.status?.toUpperCase() === 'LATE')
    ).length;
  };

  const getStatusDisplay = (log) => {
    const isToday = log.date === new Date().toISOString().split('T')[0];
    if (log.totalHours === 0) {
      // If it's today and they haven't worked yet, show --
      // If they are checked in right now, show ACTIVE? 
      // Actually, if checkIn exists but checkOut doesn't, they are active.
      if (isToday) {
        if (log.checkIn && !log.checkOut) return 'ACTIVE';
        return '--';
      }
      return 'ABSENT';
    }
    return log.status || 'PRESENT';
  };

  const getStatusClass = (log) => {
    const status = getStatusDisplay(log);
    if (status === '--') return 'none';
    if (status === 'ABSENT') return 'absent';
    if (status === 'ACTIVE') return 'present'; // Use present color for active
    return log.status?.toLowerCase() || 'present';
  };

  if (loading && attendance.length === 0) {
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
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Admin Panel
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage employees and view all attendance records
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '0.75rem',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={20} style={{ color: 'var(--accent-indigo)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Users</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{users.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '0.75rem',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={20} style={{ color: 'var(--accent-emerald)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Records</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{attendance.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '0.75rem',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BarChart3 size={20} style={{ color: 'var(--accent-violet)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg Hours/Day</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {attendance.length > 0
                    ? (attendance.reduce((a, b) => a + (b.totalHours || 0), 0) / attendance.length).toFixed(1)
                    : '0'}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Employee Form */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Add New Employee
          </h2>
          <form onSubmit={handleAddEmployee} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="john@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Role
              </label>
              <select
                className="input-field"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ padding: '0.625rem' }}
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn-gradient"
              style={{ padding: '0.625rem', height: '42px' }}
              disabled={formLoading}
            >
              {formLoading ? 'Adding...' : 'Add Employee'}
            </button>
          </form>
          {message.text && (
            <div style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: message.type === 'success' ? 'var(--accent-emerald)' : '#fb7185',
              fontWeight: 500,
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Tab Buttons and Filters */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('attendance')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'attendance'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'attendance' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Attendance Logs
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'users'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'users' ? 'white' : 'var(--text-secondary)',
              }}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'deleted'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'deleted' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Deleted Users
            </button>
            <button
              onClick={() => setActiveTab('worktime')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'worktime'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'worktime' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Work Time
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexGrow: 1, maxWidth: '600px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '250px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                placeholder="Search name/email..."
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem', height: '40px' }}
              />
            </div>
            {(activeTab === 'attendance' || activeTab === 'worktime') && (
              <input
                type="date"
                className="input-field"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ maxWidth: '160px', height: '40px' }}
              />
            )}
          </div>
        </div>

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAttendance().map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{log.userId?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {log.userId?.email || ''}
                          </div>
                        </div>
                      </td>
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
                        <span className={`status-badge ${getStatusClass(log)}`}>
                          {getStatusDisplay(log)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {getFilteredAttendance().length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No attendance records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Days Present</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.5rem',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(0,0,0,0.2)',
                              color: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="Employee">Employee</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          {getUserAttendanceCount(u._id)}
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#fb7185',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(251, 113, 133, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {users.filter(u =>
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Deleted Users Tab */}
        {activeTab === 'deleted' && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Deleted By</th>
                    <th>Date Deleted</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedUsers
                    .filter(u =>
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>
                          {u.deletedBy?.name ? `deleted by- ${u.deletedBy.name}` : 'Unknown'}
                        </td>
                        <td>{formatDate(u.deletedAt)}</td>
                      </tr>
                    ))}
                  {deletedUsers.filter(u =>
                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No deleted users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Work Time Tab */}
        {activeTab === 'worktime' && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Total Working Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAttendance()
                    .map((log) => (
                      <tr key={log._id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>{log.userId?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {log.userId?.email || ''}
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(log.date)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-indigo)', fontSize: '1rem' }}>
                          {formatHours(log.totalHours)}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(log)}`}>
                            {getStatusDisplay(log)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {getFilteredAttendance().length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No work time records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPage;
