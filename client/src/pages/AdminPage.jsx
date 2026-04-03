import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { formatDate, formatHours, getCompleteHistory } from '../utils/formatTime';
import { Users, User, Calendar, BarChart3, Search, Trash2, X, Edit, Eye, Phone, Activity } from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import UserAvatar from '../components/UserAvatar';

const AdminPage = () => {
  const { user: currentUser, loadUser } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [formLoading, setFormLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Employee');
  const [newAvatar, setNewAvatar] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [manualEntry, setManualEntry] = useState({ userId: '', date: '', status: 'Present' });
  const [leaves, setLeaves] = useState([]);
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);
  const [payslips, setPayslips] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    userId: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    earnings: [
      { label: 'Basic Salary', rate: 0, monthly: 0, arrear: 0, total: 0 }
    ],
    deductions: [
      { label: 'Provident Fund', total: 0 }
    ],
    salaryCreditedDate: new Date().toISOString().split('T')[0]
  });
  
  // Modal states for user-specific calendar
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedUserForCalendar, setSelectedUserForCalendar] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState(null);
  const [selectedDateLog, setSelectedDateLog] = useState(null);
  
  // Profile editing states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    employeeCode: '', designation: '', location: '', pan: '', sex: '', 
    accountNumber: '', bankName: '', pfAccountNumber: '', pfUAN: '', 
    esiNumber: '', joiningDate: '', leavingDate: '', taxRegime: '',
    avatar: ''
  });

  // Edit payslip state
  const [editingPayslipId, setEditingPayslipId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attendanceRes, usersRes, deletedUsersRes, holidayRes, leavesRes, payslipsRes] = await Promise.all([
        API.get('/admin/all-attendance'),
        API.get('/admin/users'),
        API.get('/admin/deleted-users'),
        API.get('/admin/holidays'),
        API.get('/admin/all-leaves'),
        API.get('/admin/all-payslips'),
      ]);
      setAttendance(attendanceRes.data);
      setUsers(usersRes.data);
      setDeletedUsers(deletedUsersRes.data);
      setHolidays(holidayRes.data);
      setLeaves(leavesRes.data);
      setPayslips(payslipsRes.data);
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
      await API.post('/admin/add-employee', { 
        name: newName, 
        email: newEmail, 
        role: newRole,
        avatar: newAvatar 
      });
      setMessage({ type: 'success', text: 'Employee added successfully!' });
      setNewName('');
      setNewEmail('');
      setNewRole('Employee');
      setNewAvatar('');
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

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await API.post('/admin/holiday', newHoliday);
      setNewHoliday({ date: '', name: '' });
      setMessage({ type: 'success', text: 'Holiday added successfully!' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add holiday' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await API.put(`/admin/update-profile/${selectedUserForProfile._id}`, profileForm);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsProfileModalOpen(false);
      fetchData();
      
      // If updating own profile, refresh session
      if (selectedUserForProfile._id === currentUser?._id) {
        loadUser();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setFormLoading(false);
    }
  };

  const openProfileModal = (user) => {
    setSelectedUserForProfile(user);
    setProfileForm({
      employeeCode: user.employeeCode || '',
      designation: user.designation || '',
      location: user.location || '',
      pan: user.pan || '',
      sex: user.sex || '',
      accountNumber: user.accountNumber || '',
      bankName: user.bankName || '',
      pfAccountNumber: user.pfAccountNumber || '',
      pfUAN: user.pfUAN || '',
      esiNumber: user.esiNumber || '',
      joiningDate: user.joiningDate || '',
      leavingDate: user.leavingDate || '',
      taxRegime: user.taxRegime || '',
      casualLeaveBalance: user.casualLeaveBalance || 2,
      sickLeaveBalance: user.sickLeaveBalance || 2,
      avatar: user.avatar || '',
      emergencyContact: user.emergencyContact || '',
      bloodGroup: user.bloodGroup || '',
    });
    setIsProfileModalOpen(true);
  };

  const openViewModal = (user) => {
    setSelectedUserForView(user);
    setIsViewModalOpen(true);
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await API.delete(`/admin/holiday/${holidayId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    }
  };

  const handleManualAttendance = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await API.post('/admin/manual-attendance', manualEntry);
      setMessage({ type: 'success', text: 'Attendance updated successfully!' });
      setManualEntry({ userId: '', date: '', status: 'Present' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update attendance' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId, status) => {
    setLeaveActionLoading(true);
    try {
      await API.put(`/admin/update-leave/${leaveId}`, { status });
      setMessage({ type: 'success', text: `Leave request ${status.toLowerCase()}!` });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update leave' });
    } finally {
      setLeaveActionLoading(false);
    }
  };

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    if (!payrollForm.userId) {
      setMessage({ type: 'error', text: 'Please select an employee' });
      return;
    }
    setPayrollLoading(true);
    try {
      await API.post('/admin/generate-payslip', payrollForm);
      setMessage({ type: 'success', text: editingPayslipId ? 'Payslip updated successfully!' : 'Payslip generated successfully!' });
      setEditingPayslipId(null); // Reset edit mode
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to generate payslip' });
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleEditPayslip = (p) => {
    setEditingPayslipId(p._id);
    setPayrollForm({
      userId: p.userId?._id || p.userId,
      month: p.month,
      year: p.year,
      earnings: p.earnings.map(e => ({ label: e.label, total: e.total, amount: e.total })),
      deductions: p.deductions.map(d => ({ label: d.label, total: d.total, amount: d.total })),
      salaryCreditedDate: p.employeeDetails?.salaryCreditedDate || ''
    });
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePayslip = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payslip record?')) return;
    try {
      await API.delete(`/admin/payslip/${id}`);
      setMessage({ type: 'success', text: 'Payslip deleted successfully!' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete payslip' });
    }
  };

  const addPayrollRow = (type) => {
    const newItems = [...payrollForm[type], { label: '', amount: 0 }];
    setPayrollForm({ ...payrollForm, [type]: newItems });
  };

  const removePayrollRow = (type, index) => {
    const newItems = payrollForm[type].filter((_, i) => i !== index);
    setPayrollForm({ ...payrollForm, [type]: newItems });
  };

  const updatePayrollRow = (type, index, field, value) => {
    const newItems = [...payrollForm[type]];
    const numValue = Number(value) || 0;
    
    newItems[index][field] = numValue;
    
    // For earnings, if we update amount/total, we set it as the total for the model
    if (type === 'earnings') {
      // In this simple UI, we treat the amount as the 'total' for that component
      if (field === 'amount' || field === 'total') {
        newItems[index].total = numValue;
        newItems[index].monthly = numValue; // Default monthly to total if no split is provided
      }
    } else if (type === 'deductions') {
      if (field === 'amount' || field === 'total') {
        newItems[index].total = numValue;
      }
    }
    
    // Also handle label updates
    if (field === 'label') {
      newItems[index].label = value;
    }
    
    setPayrollForm({ ...payrollForm, [type]: newItems });
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
        (log.status?.toUpperCase() === 'PRESENT')
    ).length;
  };

  const getStatusDisplay = (log) => {
    if (!log) return '--';
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = log.date === todayStr;
    const isFuture = log.date > todayStr;

    if (isFuture) {
      // Only show status if it's a Holiday
      if (log.status?.toLowerCase() === 'holiday') return 'HOLIDAY';
      return '--';
    }

    // 1. ACTIVE status: If today, checked in AND not checked out (on the clock)
    if (isToday && log.checkIn && !log.checkOut) return 'ACTIVE';

    // 2. ABSENT status: No hours recorded for a past day or today (if not active)
    if (log.totalHours === 0) {
      return isToday ? '--' : 'ABSENT';
    }

    // 3. Status Display: Show the definitive status (Present/Absent/Leave) or pending (--)
    return log.status || '--';
  };

  const getStatusClass = (log) => {
    const status = getStatusDisplay(log);
    if (status === '--') return 'none';
    if (status === 'ABSENT') return 'absent';
    if (status === 'HOLIDAY') return 'holiday';
    if (status === 'ACTIVE') return 'present'; // Use present color for active
    return log.status?.toLowerCase() || 'none';
  };

  if (loading && attendance.length === 0) {
    return (
      <>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 72px)',
          paddingTop: '2.5rem',
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
        padding: '2.5rem 1rem 4rem',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
          <form onSubmit={handleAddEmployee} className="responsive-admin-form" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Profile Photo URL (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="https://example.com/photo.jpg"
                value={newAvatar}
                onChange={(e) => setNewAvatar(e.target.value)}
              />
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
          flexDirection: 'column',
          gap: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div className="tabs-scrollable">
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
            <button
              onClick={() => setActiveTab('holidays')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'holidays'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'holidays' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Holidays
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'manual'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'manual' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'leaves'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'leaves' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Leaves
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'payroll'
                  ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))'
                  : 'rgba(255,255,255,0.05)',
                color: activeTab === 'payroll' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Payroll
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
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
            <div className="table-responsive">
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <UserAvatar user={log.userId} size="md" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{log.userId?.name || 'Unknown'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {log.userId?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(log.date)}</td>
                      <td style={{ verticalAlign: 'top', padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {log.workSessions && log.workSessions.length > 0 ? (
                            log.workSessions.map((s, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderRadius: '0.2rem', fontWeight: 700 }}>S{idx + 1}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'white' }}>
                                  {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {log.workSessions && log.workSessions.length > 0 ? (
                            log.workSessions.map((s, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.25rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', borderRadius: '0.2rem', fontWeight: 700 }}>S{idx + 1}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'white' }}>
                                  {s.endTime ? new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {log.checkIn && !log.checkOut ? 'Active' : (log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-indigo)', verticalAlign: 'top' }}>
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
            <div className="table-responsive">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>EMP NO</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>CL Bal</th>
                    <th>SL Bal</th>
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
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={u} size="md" />
                            {u.name}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>
                          {u.employeeCode || '--'}
                        </td>
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
                        <td style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>
                          {u.casualLeaveBalance || 0}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                          {u.sickLeaveBalance || 0}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          {getUserAttendanceCount(u._id)}
                        </td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setSelectedUserForCalendar(u);
                                setIsCalendarModalOpen(true);
                                setSelectedDateLog(null);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-indigo)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                              title="View User Calendar"
                            >
                              <Calendar size={18} />
                            </button>
                            <button
                              onClick={() => openViewModal(u)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#22d3ee',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                              title="Detailed View"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => openProfileModal(u)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-emerald)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                              title="Edit Profile"
                            >
                              <User size={18} />
                            </button>
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
                          </div>
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
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={u} size="sm" />
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                          </div>
                        </td>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={log.userId} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{log.userId?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {log.userId?.email || ''}
                              </div>
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
        {activeTab === 'holidays' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Holiday Management</h2>
            <form onSubmit={handleAddHoliday} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', marginBottom: '2rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Holiday Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. New Year"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-gradient" style={{ height: '42px', padding: '0 1.5rem' }} disabled={formLoading}>
                Add Holiday
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Holiday</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h._id}>
                      <td>{formatDate(h.date)}</td>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => handleDeleteHoliday(h._id)} className="btn-icon" style={{ color: '#fb7185' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Entry Tab */}
        {activeTab === 'manual' && (
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Manual Attendance Entry</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Use this to mark a user present for a date they missed or forgot to check in.
            </p>
            <form onSubmit={handleManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Select Employee</label>
                <select
                  className="input-field"
                  value={manualEntry.userId}
                  onChange={(e) => setManualEntry({ ...manualEntry, userId: e.target.value })}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Status</label>
                  <select
                    className="input-field"
                    value={manualEntry.status}
                    onChange={(e) => setManualEntry({ ...manualEntry, status: e.target.value })}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">On Leave</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-gradient" style={{ padding: '0.8rem' }} disabled={formLoading}>
                {formLoading ? 'Updating...' : 'Update Attendance'}
              </button>
            </form>
            {message.text && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: message.type === 'success' ? 'var(--accent-emerald)' : '#fb7185' }}>
                {message.text}
              </div>
            )}
          </div>
        )}

        {/* User Calendar Modal */}
        {isCalendarModalOpen && selectedUserForCalendar && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }} onClick={() => setIsCalendarModalOpen(false)}>
            <div style={{
              width: '100%',
              maxWidth: '600px',
              position: 'relative',
              animation: 'modalFadeIn 0.3s ease-out',
            }} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  background: '#f43f5e',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 2,
                }}
              >
                <X size={20} />
              </button>
              
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
                  {selectedUserForCalendar.name}'s Calender
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  {selectedUserForCalendar.email}
                </p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)' }}>
                <AttendanceCalendar 
                  logs={getCompleteHistory(
                    selectedUserForCalendar.createdAt, 
                    attendance.filter(log => log.userId?._id === selectedUserForCalendar._id)
                  )} 
                  holidays={holidays} 
                  onDateClick={(log) => setSelectedDateLog(log)}
                />
              </div>

              {/* Performance detail card */}
              {selectedDateLog && (
                <div 
                  className="glass-card" 
                  style={{ 
                    marginTop: '1rem', 
                    padding: '1.25rem', 
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    animation: 'modalFadeIn 0.3s ease-out'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                      Performance: {formatDate(selectedDateLog.date)}
                    </h4>
                    <span className={`status-badge ${getStatusClass(selectedDateLog)}`} style={{ fontSize: '0.7rem' }}>
                      {getStatusDisplay(selectedDateLog)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Hours</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                        {formatHours(selectedDateLog.totalHours)}
                      </p>
                    </div>
                    {(selectedDateLog.checkIn || selectedDateLog.checkOut) && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Timing</p>
                        <p style={{ fontSize: '0.8rem', color: 'white', fontFamily: 'monospace' }}>
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
          </div>
        )}

        {/* User Profile Modal */}
        {isProfileModalOpen && selectedUserForProfile && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }} onClick={() => setIsProfileModalOpen(false)}>
            <div style={{
              width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
              position: 'relative', background: 'rgba(15, 23, 42, 0.95)',
              borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)',
              padding: '2rem', animation: 'modalFadeIn 0.3s ease-out',
            }} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  position: 'absolute', top: '1.5rem', right: '1.5rem',
                  width: '35px', height: '35px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', color: 'white',
                  border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', zIndex: 2,
                }}
              >
                <X size={20} />
              </button>
              
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                  Edit Employee Profile
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedUserForProfile.name} ({selectedUserForProfile.email})
                </p>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <label className="label-style">Employee Code</label>
                    <input type="text" className="input-field" value={profileForm.employeeCode} onChange={(e) => setProfileForm({...profileForm, employeeCode: e.target.value})} placeholder="e.g. EMP001" />
                  </div>
                  <div>
                    <label className="label-style">Designation</label>
                    <input type="text" className="input-field" value={profileForm.designation} onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})} placeholder="e.g. Software Engineer" />
                  </div>
                  <div>
                    <label className="label-style">Location</label>
                    <input type="text" className="input-field" value={profileForm.location} onChange={(e) => setProfileForm({...profileForm, location: e.target.value})} placeholder="e.g. New Delhi" />
                  </div>
                  <div>
                    <label className="label-style">PAN Number</label>
                    <input type="text" className="input-field" value={profileForm.pan} onChange={(e) => setProfileForm({...profileForm, pan: e.target.value})} placeholder="ABCDE1234F" />
                  </div>
                  <div>
                    <label className="label-style">Sex</label>
                    <select className="input-field" value={profileForm.sex} onChange={(e) => setProfileForm({...profileForm, sex: e.target.value})}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-style">Account Number</label>
                    <input type="text" className="input-field" value={profileForm.accountNumber} onChange={(e) => setProfileForm({...profileForm, accountNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">PF Account Number</label>
                    <input type="text" className="input-field" value={profileForm.pfAccountNumber} onChange={(e) => setProfileForm({...profileForm, pfAccountNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">PF UAN</label>
                    <input type="text" className="input-field" value={profileForm.pfUAN} onChange={(e) => setProfileForm({...profileForm, pfUAN: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">ESI Number</label>
                    <input type="text" className="input-field" value={profileForm.esiNumber} onChange={(e) => setProfileForm({...profileForm, esiNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">Joining Date</label>
                    <input type="date" className="input-field" value={profileForm.joiningDate} onChange={(e) => setProfileForm({...profileForm, joiningDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">Leaving Date</label>
                    <input type="date" className="input-field" value={profileForm.leavingDate} onChange={(e) => setProfileForm({...profileForm, leavingDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="label-style">Tax Regime</label>
                    <select className="input-field" value={profileForm.taxRegime} onChange={(e) => setProfileForm({...profileForm, taxRegime: e.target.value})}>
                      <option value="">Select</option>
                      <option value="Old">Old</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-style">Profile Photo URL</label>
                    <input type="text" className="input-field" value={profileForm.avatar} onChange={(e) => setProfileForm({...profileForm, avatar: e.target.value})} placeholder="https://example.com/photo.jpg" />
                  </div>
                  <div>
                    <label className="label-style">Emergency Contact</label>
                    <input type="text" className="input-field" value={profileForm.emergencyContact} onChange={(e) => setProfileForm({...profileForm, emergencyContact: e.target.value})} placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <label className="label-style">Blood Group</label>
                    <select className="input-field" value={profileForm.bloodGroup} onChange={(e) => setProfileForm({...profileForm, bloodGroup: e.target.value})}>
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="label-style">Casual Leave Balance</label>
                    <input
                      type="number"
                      className="input-field"
                      value={profileForm.casualLeaveBalance}
                      onChange={(e) => setProfileForm({ ...profileForm, casualLeaveBalance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label-style">Sick Leave Balance</label>
                    <input
                      type="number"
                      className="input-field"
                      value={profileForm.sickLeaveBalance}
                      onChange={(e) => setProfileForm({ ...profileForm, sickLeaveBalance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="button" onClick={() => setIsProfileModalOpen(false)} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" className="btn-gradient" style={{ padding: '0.75rem 2rem' }} disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Profile'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Detailed View Modal */}
        {isViewModalOpen && selectedUserForView && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }} onClick={() => setIsViewModalOpen(false)}>
            <div style={{
              width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
              position: 'relative', background: 'rgba(15, 23, 42, 0.95)',
              borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)',
              padding: '2.5rem', animation: 'modalFadeIn 0.3s ease-out',
            }} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                style={{
                  position: 'absolute', top: '1.5rem', right: '1.5rem',
                  width: '35px', height: '35px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', color: 'white',
                  border: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', zIndex: 2,
                }}
              >
                <X size={20} />
              </button>
              
              <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <UserAvatar user={selectedUserForView} size="xl" />
                <div>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                    {selectedUserForView.name}
                  </h3>
                  <p style={{ color: 'var(--accent-indigo)', fontWeight: 500 }}>
                    {selectedUserForView.designation || 'Specialist'} | {selectedUserForView.role}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {/* Personal & Info */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-indigo)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} /> Personal Identity
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Email Address</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.email}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>PAN Number</label>
                      <span style={{ color: 'white', fontSize: '0.9rem', textTransform: 'uppercase' }}>{selectedUserForView.pan || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Gender</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.sex || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Emergency Contact</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.emergencyContact || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Blood Group</label>
                      <span style={{ color: 'var(--accent-rose)', fontSize: '0.9rem', fontWeight: 'bold' }}>{selectedUserForView.bloodGroup || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} /> Service Profile
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Employee Code</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.employeeCode || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Office Location</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.location || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Joining Date</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.joiningDate ? formatDate(selectedUserForView.joiningDate) : '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Banking & Finance */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={16} /> Banking & Financials
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Bank Name</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.bankName || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Account Number</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.accountNumber || '--'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Tax Regime</label>
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.taxRegime || '--'}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>ESI Number</label>
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.esiNumber || '--'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={16} /> Statutory Accounts
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>PF UAN</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.pfUAN || '--'}</span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>PF Account Number</label>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{selectedUserForView.pfAccountNumber || '--'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>CL Balance</label>
                        <span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>{selectedUserForView.casualLeaveBalance || 0}</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>SL Balance</label>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{selectedUserForView.sickLeaveBalance || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setIsViewModalOpen(false)} 
                  className="btn-secondary" 
                  style={{ padding: '0.75rem 2rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaves Tab */}
        {activeTab === 'leaves' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Pending Requests Section */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(251, 191, 36, 0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fbbf24' }}>Pending Requests</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => l.status === 'Pending').map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={leave.userId} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{leave.userId?.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{leave.userId?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{leave.type}</td>
                        <td style={{ fontSize: '0.8rem' }}>{leave.startDate} to {leave.endDate}</td>
                        <td style={{ maxWidth: '300px', fontSize: '0.8rem' }} title={leave.reason}>
                          {leave.reason}
                          {(() => {
                            const start = new Date(leave.startDate);
                            const end = new Date(leave.endDate);
                            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                            const balance = leave.type === 'Casual' ? leave.userId?.casualLeaveBalance : (leave.type === 'Sick' ? leave.userId?.sickLeaveBalance : 999);
                            if (balance !== undefined && days > balance && (leave.type === 'Casual' || leave.type === 'Sick')) {
                              return (
                                <div style={{ color: 'var(--accent-rose)', fontSize: '0.7rem', marginTop: '0.25rem', fontWeight: 600 }}>
                                  ⚠️ Low Balance: {days} days requested, {balance} available
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleUpdateLeaveStatus(leave._id, 'Approved')}
                              className="btn-gradient"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto' }}
                              disabled={leaveActionLoading}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(leave._id, 'Rejected')}
                              style={{ 
                                padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '0.5rem',
                                border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', cursor: 'pointer'
                              }}
                              disabled={leaveActionLoading}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {leaves.filter(l => l.status === 'Pending').length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No pending requests.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave History Section */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Leave History</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>Processed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => (l.status === 'Approved' || l.status === 'Rejected')).map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={leave.userId} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{leave.userId?.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{leave.userId?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{leave.type}</td>
                        <td style={{ fontSize: '0.8rem' }}>{leave.startDate} to {leave.endDate}</td>
                        <td>
                          <span className={`status-badge ${leave.status.toLowerCase()}`}>
                            {leave.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {leave.processedAt ? formatDate(leave.processedAt) : '--'}
                        </td>
                      </tr>
                    ))}
                    {leaves.filter(l => (l.status === 'Approved' || l.status === 'Rejected')).length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No leave history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cancelled Requests Section */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(244, 63, 94, 0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-rose)' }}>Cancelled Requests</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Cancelled At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.filter(l => l.status === 'Cancelled').map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={leave.userId} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{leave.userId?.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{leave.userId?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{leave.type}</td>
                        <td style={{ fontSize: '0.8rem' }}>{leave.startDate} to {leave.endDate}</td>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(leave.processedAt || leave.appliedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                    {leaves.filter(l => l.status === 'Cancelled').length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No cancelled requests found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Generate Payslip Form */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingPayslipId ? 'Update Payslip' : 'Generate Payslip'}</h2>
                {editingPayslipId && (
                  <button 
                    onClick={() => {
                      setEditingPayslipId(null);
                      setPayrollForm({
                        userId: '', month: 'January', year: new Date().getFullYear(),
                        earnings: [{ label: 'Basic Salary', total: 0 }],
                        deductions: [{ label: 'Provident Fund', total: 0 }]
                      });
                    }}
                    style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleGeneratePayslip}>
                {/* Employee Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Employee</label>
                    <select 
                      className="input-field" 
                      value={payrollForm.userId}
                      onChange={(e) => setPayrollForm({...payrollForm, userId: e.target.value})}
                      required
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="">Select User</option>
                      {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Month</label>
                    <select 
                      className="input-field" 
                      value={payrollForm.month}
                      onChange={(e) => setPayrollForm({...payrollForm, month: e.target.value})}
                      required
                      style={{ padding: '0.5rem' }}
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Year</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={payrollForm.year}
                      onChange={(e) => setPayrollForm({...payrollForm, year: e.target.value})}
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Credit Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={payrollForm.salaryCreditedDate}
                      onChange={(e) => setPayrollForm({...payrollForm, salaryCreditedDate: e.target.value})}
                      style={{ padding: '0.5rem' }}
                    />
                  </div>
                </div>

                {/* Earnings */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Earnings</h3>
                    <button type="button" onClick={() => addPayrollRow('earnings')} style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Earning</button>
                  </div>
                  {payrollForm.earnings.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <input 
                        className="input-field" 
                        placeholder="Label" 
                        value={item.label}
                        onChange={(e) => updatePayrollRow('earnings', idx, 'label', e.target.value)}
                        required
                      />
                      <input 
                        type="number"
                        className="input-field" 
                        style={{ width: '120px' }}
                        placeholder="Amount" 
                        value={item.total}
                        onChange={(e) => updatePayrollRow('earnings', idx, 'total', e.target.value)}
                        required
                      />
                      {idx > 0 && (
                        <button type="button" onClick={() => removePayrollRow('earnings', idx)} style={{ color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Deductions */}
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Deductions</h3>
                    <button type="button" onClick={() => addPayrollRow('deductions')} style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Deduction</button>
                  </div>
                  {payrollForm.deductions.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <input 
                        className="input-field" 
                        placeholder="Label" 
                        value={item.label}
                        onChange={(e) => updatePayrollRow('deductions', idx, 'label', e.target.value)}
                        required
                      />
                      <input 
                        type="number"
                        className="input-field" 
                        style={{ width: '120px' }}
                        placeholder="Amount" 
                        value={item.total}
                        onChange={(e) => updatePayrollRow('deductions', idx, 'total', e.target.value)}
                        required
                      />
                      {idx > 0 && (
                        <button type="button" onClick={() => removePayrollRow('deductions', idx)} style={{ color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '1rem', 
                  borderRadius: '0.75rem', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimated Net Pay:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                    ₹{(payrollForm.earnings.reduce((a, b) => a + (Number(b.total) || 0), 0) - payrollForm.deductions.reduce((a, b) => a + (Number(b.total) || 0), 0)).toLocaleString()}
                  </span>
                </div>

                <button type="submit" className="btn-gradient" disabled={payrollLoading}>
                  {payrollLoading ? (editingPayslipId ? 'Updating...' : 'Generating...') : (editingPayslipId ? 'Update Payslip' : 'Generate Payslip')}
                </button>
              </form>
            </div>

            {/* Payslip History Section */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Generation History</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Period</th>
                      <th>Net Pay</th>
                      <th>Generated At</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <UserAvatar user={p.userId} size="sm" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.userId?.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.userId?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{p.month} {p.year}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>₹{p.netPay.toLocaleString()}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(p.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleEditPayslip(p)}
                              style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', cursor: 'pointer' }}
                              title="Edit Payslip"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeletePayslip(p._id)}
                              style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', cursor: 'pointer' }}
                              title="Delete Payslip"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payslips.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No payslips generated yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <style>{`
          @media (max-width: 768px) {
            .responsive-admin-form {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default AdminPage;
