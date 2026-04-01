import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AttendanceCalendar = ({ logs, holidays, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState([]);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, logs, holidays]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];

    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ type: 'empty' });
    }

    // Fill actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      
      let status = 'none';
      let title = '';
      let log = null;

      // Check for Holiday (including Sat/Sun)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = holidays?.find(h => h.date === dateStr);

      if (isWeekend || holiday) {
        status = 'holiday';
        title = holiday ? holiday.name : isWeekend ? 'Weekend' : '';
      } else {
        // Check attendance log
        log = logs?.find(l => l.date === dateStr);
        if (log) {
          status = log.status.toLowerCase(); // 'present', 'absent'
        } else {
          // If in the past and no log, it's Absent? 
          const dDate = new Date(year, month, d);
          const today = new Date();
          today.setHours(0,0,0,0);
          if (dDate < today) {
            status = 'absent';
          }
        }
      }

      const dDate = new Date(year, month, d);
      const todayLocalStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const isToday = dateStr === todayLocalStr;
      const isFuture = dDate > new Date() && !isToday;

      calendarDays.push({
        day: d,
        date: dateStr,
        status,
        title,
        log: log || { date: dateStr, status: status === 'holiday' ? 'Holiday' : status.charAt(0).toUpperCase() + status.slice(1), totalHours: 0, isVirtual: true },
        isToday,
        isFuture: isFuture && !isToday // Explicitly future
      });
    }

    setDays(calendarDays);
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{monthName} {currentDate.getFullYear()}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={20} /></button>
          <button onClick={nextMonth} className="btn-icon"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.5rem',
        textAlign: 'center',
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: '0.5rem' }}>{d}</div>
        ))}
        
        {days.map((d, index) => {
          const isClickable = d.type !== 'empty' && (!d.isFuture || d.status === 'holiday');
          return (
            <div
              key={index}
              onClick={() => isClickable && onDateClick && onDateClick(d.log)}
              className={isClickable ? 'calendar-day-cell' : ''}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                background: d.isToday ? 'rgba(59, 130, 246, 0.15)' : // Blue tint for today
                            d.type === 'empty' ? 'transparent' : 
                            d.status === 'present' ? 'rgba(16, 185, 129, 0.25)' : // Emerald Green
                            d.status === 'holiday' ? 'rgba(251, 146, 60, 0.3)' : // Light Saffron (Orange)
                            d.status === 'absent' ? 'rgba(239, 68, 68, 0.25)' : // Red
                            'rgba(255, 255, 255, 0.05)',
                color: d.isToday ? '#3b82f6' : // Blue text for today
                       d.status === 'present' ? '#10b981' :
                       d.status === 'holiday' ? '#fb923c' : // Saffron text
                       d.status === 'absent' ? '#f87171' :
                       d.isFuture ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                border: d.isToday ? '2px solid #3b82f6' : '1px solid transparent', // Blue for today
                cursor: isClickable ? 'pointer' : 'default',
                opacity: d.isFuture && d.status !== 'holiday' ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
              title={d.title || (isClickable ? 'Click to view details' : '')}
            >
              {d.day}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.25)' }}></div>
          <span>Present</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(251, 146, 60, 0.3)' }}></div>
          <span>Holiday/Weekend</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.25)' }}></div>
          <span>Absent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px solid #3b82f6' }}></div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
