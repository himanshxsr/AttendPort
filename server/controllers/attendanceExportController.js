const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');

const MAX_RANGE_DAYS = 400;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatIstTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function parseRows(logs) {
  const out = [];
  for (const l of logs) {
    const u = l.userId;
    if (!u || u.isDeleted) continue;
    out.push({
      employeeCode: u.employeeCode || '—',
      name: u.name || '',
      email: u.email || '',
      date: l.date,
      checkIn: formatIstTime(l.checkIn),
      checkOut: formatIstTime(l.checkOut),
      totalHours: l.totalHours != null && l.totalHours !== '' ? Number(l.totalHours).toFixed(2) : '',
      status: l.status != null && String(l.status).trim() !== '' ? l.status : '—',
      leaveNote:
        l.leaveDeducted > 0
          ? `${l.leaveDeducted} (${(l.leaveDeductedType && l.leaveDeductedType !== 'none' ? l.leaveDeductedType : 'leave')})`
          : '—',
    });
  }
  return out;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function safeFileToken(v) {
  return String(v || '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'employee';
}

function daysInclusive(from, to) {
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function quarterDateRange(year, quarter) {
  const q = Number(quarter);
  const y = Number(year);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const from = `${y}-${pad2(startMonth)}-01`;
  const lastDate = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
  const to = `${y}-${pad2(endMonth)}-${pad2(lastDate)}`;
  return { from, to };
}

function annualDateRange(year) {
  const y = Number(year);
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function buildEmployeeHistoryRows(logs, holidaySet) {
  return logs.map((l) => {
    const dateObj = new Date(l.date + 'T00:00:00Z');
    const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
    const isWeekend = weekday === 'Sun';
    const isHoliday = holidaySet.has(l.date);
    const totalHours = l.totalHours != null && l.totalHours !== '' ? Number(l.totalHours) : 0;
    const status = l.status != null && String(l.status).trim() !== '' ? l.status : '—';
    return {
      date: l.date,
      weekday,
      checkIn: formatIstTime(l.checkIn),
      checkOut: formatIstTime(l.checkOut),
      totalHours,
      totalHoursText: totalHours.toFixed(2),
      status,
      leaveDeducted: l.leaveDeducted || 0,
      leaveNote:
        l.leaveDeducted > 0
          ? `${l.leaveDeducted} (${(l.leaveDeductedType && l.leaveDeductedType !== 'none' ? l.leaveDeductedType : 'leave')})`
          : '—',
      dayType: isHoliday ? 'Holiday' : isWeekend ? 'Weekend' : 'Working day',
    };
  });
}

function buildEmployeeSummary(rows, from, to, holidaySet) {
  const totalDays = daysInclusive(from, to);
  const presentDays = rows.filter((r) => r.status === 'Present').length;
  const absentDays = rows.filter((r) => r.status === 'Absent').length;
  const leaveDays = rows.filter((r) => r.status === 'Leave').length;
  const halfDays = rows.filter((r) => r.status === 'Half Day').length;
  const avgHours = rows.length ? rows.reduce((s, r) => s + r.totalHours, 0) / rows.length : 0;

  let expectedWorkingDays = 0;
  let d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d <= end) {
    const dateStr = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    const weekday = d.getUTCDay(); // Sun=0
    if (weekday !== 0 && !holidaySet.has(dateStr)) expectedWorkingDays += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const attendancePercent = expectedWorkingDays > 0 ? ((presentDays + halfDays * 0.5) / expectedWorkingDays) * 100 : 0;

  return {
    totalDays,
    expectedWorkingDays,
    holidayCount: holidaySet.size,
    presentDays,
    absentDays,
    leaveDays,
    halfDays,
    avgHours: Number(avgHours.toFixed(2)),
    attendancePercent: Number(attendancePercent.toFixed(2)),
  };
}

/**
 * @route GET /api/admin/export/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&format=xlsx|pdf
 */
exports.exportAttendance = async (req, res, next) => {
  try {
    const { from, to, format = 'xlsx' } = req.query;
    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({ message: 'from and to are required (YYYY-MM-DD)' });
    }
    if (from > to) {
      return res.status(400).json({ message: 'from must be on or before to' });
    }
    const start = new Date(from + 'T00:00:00Z');
    const end = new Date(to + 'T00:00:00Z');
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days > MAX_RANGE_DAYS) {
      return res.status(400).json({ message: `Date range cannot exceed ${MAX_RANGE_DAYS} days` });
    }
    const fmt = String(format).toLowerCase();
    if (fmt !== 'xlsx' && fmt !== 'pdf') {
      return res.status(400).json({ message: 'format must be xlsx or pdf' });
    }

    const raw = await Attendance.find({
      date: { $gte: from, $lte: to },
    })
      .populate({
        path: 'userId',
        select: 'name email employeeCode isDeleted',
        model: User,
      })
      .lean();

    raw.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.userId?.employeeCode || '').localeCompare(b.userId?.employeeCode || '') ||
        (a.userId?.name || '').localeCompare(b.userId?.name || '')
    );

    const rows = parseRows(raw);

    const filename = `attendance-${from}-to-${to}`;

    if (fmt === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'AttendPortal';
      const ws = wb.addWorksheet('Attendance', { views: [{ state: 'frozen', ySplit: 1 }] });
      ws.columns = [
        { header: 'Employee code', key: 'c', width: 14 },
        { header: 'Name', key: 'n', width: 26 },
        { header: 'Email', key: 'e', width: 32 },
        { header: 'Date', key: 'd', width: 12 },
        { header: 'Check-in (IST)', key: 'i', width: 24 },
        { header: 'Check-out (IST)', key: 'o', width: 24 },
        { header: 'Total hours', key: 'h', width: 12 },
        { header: 'Status', key: 's', width: 12 },
        { header: 'Leave deduction', key: 'l', width: 16 },
      ];
      const header = ws.getRow(1);
      header.font = { bold: true };
      header.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8F5' },
      };
      for (const r of rows) {
        ws.addRow({
          c: r.employeeCode,
          n: r.name,
          e: r.email,
          d: r.date,
          i: r.checkIn,
          o: r.checkOut,
          h: r.totalHours,
          s: r.status,
          l: r.leaveNote,
        });
      }
      if (rows.length === 0) {
        ws.addRow({
          c: '—', n: 'No records in this range', e: '', d: '', i: '', o: '', h: '', s: '', l: '',
        });
      }
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    doc.pipe(res);

    doc.fontSize(14).text('Attendance report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#444').text(`Period: ${from}  →  ${to}  ·  All employees  ·  Times in IST`, {
      align: 'left',
    });
    doc.moveDown(0.8);
    doc.fillColor('#000');

    const col = {
      c: 40,
      n: 100,
      e: 210,
      d: 365,
      i: 430,
      o: 505,
      h: 570,
      s: 620,
      l: 680,
    };
    const lineH = 12;
    let y = doc.y;
    const pageBottom = 550;

    function drawHeaderRow() {
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('Emp code', col.c, y, { width: 55 });
      doc.text('Name', col.n, y, { width: 100 });
      doc.text('Email', col.e, y, { width: 150 });
      doc.text('Date', col.d, y, { width: 60 });
      doc.text('In', col.i, y, { width: 70 });
      doc.text('Out', col.o, y, { width: 60 });
      doc.text('Hrs', col.h, y, { width: 40 });
      doc.text('Status', col.s, y, { width: 50 });
      doc.text('Leave', col.l, y, { width: 100 });
      doc.font('Helvetica');
      y += lineH + 4;
    }

    function truncate(s, max) {
      const t = String(s || '');
      return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
    }

    drawHeaderRow();
    doc.fontSize(6.5);
    for (const r of rows) {
      if (y > pageBottom) {
        doc.addPage();
        y = 50;
        drawHeaderRow();
        doc.fontSize(6.5);
      }
      doc.text(truncate(r.employeeCode, 10), col.c, y, { width: 55 });
      doc.text(truncate(r.name, 22), col.n, y, { width: 100 });
      doc.text(truncate(r.email, 28), col.e, y, { width: 150 });
      doc.text(r.date, col.d, y, { width: 60 });
      doc.text(truncate(r.checkIn, 18), col.i, y, { width: 70 });
      doc.text(truncate(r.checkOut, 16), col.o, y, { width: 60 });
      doc.text(String(r.totalHours), col.h, y, { width: 40 });
      doc.text(truncate(r.status, 10), col.s, y, { width: 50 });
      doc.text(truncate(r.leaveNote, 18), col.l, y, { width: 100 });
      y += lineH;
    }
    if (rows.length === 0) {
      doc.fontSize(9).text('No attendance records in the selected range.', 40, y);
    }
    doc.end();
  } catch (err) {
    next(err);
  }
};

/**
 * @route GET /api/admin/export/employee-history?userId=<id>&periodType=quarterly|annual&year=YYYY&quarter=1..4&format=xlsx|pdf
 */
exports.exportEmployeeHistory = async (req, res, next) => {
  try {
    const { userId, periodType, year, quarter, format = 'xlsx' } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const y = Number(year);
    if (!year || !Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ message: 'year must be a valid YYYY value' });
    }

    const type = String(periodType || '').toLowerCase();
    if (type !== 'quarterly' && type !== 'annual') {
      return res.status(400).json({ message: 'periodType must be quarterly or annual' });
    }
    if (type === 'quarterly' && !['1', '2', '3', '4'].includes(String(quarter))) {
      return res.status(400).json({ message: 'quarter is required for quarterly export (1-4)' });
    }

    const fmt = String(format).toLowerCase();
    if (fmt !== 'xlsx' && fmt !== 'pdf') {
      return res.status(400).json({ message: 'format must be xlsx or pdf' });
    }

    const employee = await User.findById(userId).select('name email employeeCode isDeleted').lean();
    if (!employee || employee.isDeleted) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const range = type === 'quarterly' ? quarterDateRange(y, quarter) : annualDateRange(y);
    const { from, to } = range;

    const [raw, holidays] = await Promise.all([
      Attendance.find({ userId, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean(),
      Holiday.find({ date: { $gte: from, $lte: to } }).select('date').lean(),
    ]);
    const holidaySet = new Set(holidays.map((h) => h.date));
    const rows = buildEmployeeHistoryRows(raw, holidaySet);
    const summary = buildEmployeeSummary(rows, from, to, holidaySet);

    const periodLabel = type === 'quarterly' ? `Q${quarter} ${y}` : `Annual ${y}`;
    const employeeToken = safeFileToken(employee.employeeCode || employee._id);
    const filename = `employee-history-${employeeToken}-${type === 'quarterly' ? `Q${quarter}` : 'annual'}-${y}`;

    if (fmt === 'xlsx') {
      try {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'AttendPortal';

        const summarySheet = wb.addWorksheet('Summary');
        summarySheet.columns = [{ width: 32 }, { width: 26 }];
        summarySheet.addRow(['Metric', 'Value']);
        summarySheet.getRow(1).font = { bold: true };
        [
          ['Employee', employee.name || '—'],
          ['Employee Code', employee.employeeCode || '—'],
          ['Email', employee.email || '—'],
          ['Period', `${periodLabel} (${from} to ${to})`],
          ['Total Calendar Days', summary.totalDays],
          ['Expected Working Days', summary.expectedWorkingDays],
          ['Present Days', summary.presentDays],
          ['Absent Days', summary.absentDays],
          ['Leave Days', summary.leaveDays],
          ['Half Days', summary.halfDays],
          ['Average Hours/Day', summary.avgHours],
          ['Attendance %', `${summary.attendancePercent}%`],
        ].forEach((row) => summarySheet.addRow(row));

        const ws = wb.addWorksheet('Attendance History', { views: [{ state: 'frozen', ySplit: 1 }] });
        ws.columns = [{ width: 12 }, { width: 10 }, { width: 14 }, { width: 24 }, { width: 24 }, { width: 12 }, { width: 12 }, { width: 16 }];
        ws.addRow(['Date', 'Day', 'Day Type', 'Check-in (IST)', 'Check-out (IST)', 'Total hours', 'Status', 'Leave deduction']);
        const header = ws.getRow(1);
        header.font = { bold: true };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8F5' } };
        rows.forEach((r) => {
          ws.addRow([r.date, r.weekday, r.dayType, r.checkIn, r.checkOut, r.totalHoursText, r.status, r.leaveNote]);
        });
        if (rows.length === 0) {
          ws.addRow(['—', '', '', 'No records for selected period', '', '', '', '']);
        }

        const buffer = await wb.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        return res.send(Buffer.from(buffer));
      } catch (xlsxErr) {
        console.error('Employee history XLSX export failed:', {
          message: xlsxErr.message,
          stack: xlsxErr.stack,
          query: req.query,
        });
        throw xlsxErr;
      }
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    doc.pipe(res);

    doc.fontSize(14).text('Individual Employee Attendance History', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#444').text(
      `Employee: ${employee.name || '—'} (${employee.employeeCode || '—'})  ·  ${periodLabel}  ·  ${from} to ${to}  ·  Times in IST`,
      { align: 'left' }
    );
    doc.moveDown(0.6);
    doc.fillColor('#000').fontSize(8);
    doc.text(
      `Summary: Working days ${summary.expectedWorkingDays} | Present ${summary.presentDays} | Absent ${summary.absentDays} | Leave ${summary.leaveDays} | Half day ${summary.halfDays} | Avg hrs/day ${summary.avgHours} | Attendance ${summary.attendancePercent}%`
    );
    doc.moveDown(0.8);

    const col = { d: 40, w: 95, t: 135, i: 220, o: 315, h: 410, s: 460, l: 530 };
    const lineH = 12;
    let yPos = doc.y;
    const pageBottom = 550;

    const drawHeaderRow = () => {
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text('Date', col.d, yPos, { width: 50 });
      doc.text('Day', col.w, yPos, { width: 35 });
      doc.text('Type', col.t, yPos, { width: 70 });
      doc.text('In', col.i, yPos, { width: 90 });
      doc.text('Out', col.o, yPos, { width: 90 });
      doc.text('Hrs', col.h, yPos, { width: 45 });
      doc.text('Status', col.s, yPos, { width: 60 });
      doc.text('Leave', col.l, yPos, { width: 120 });
      doc.font('Helvetica');
      yPos += lineH + 4;
    };

    const truncate = (s, max) => {
      const t = String(s || '');
      return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
    };

    drawHeaderRow();
    doc.fontSize(6.5);
    for (const r of rows) {
      if (yPos > pageBottom) {
        doc.addPage();
        yPos = 50;
        drawHeaderRow();
        doc.fontSize(6.5);
      }
      doc.text(r.date, col.d, yPos, { width: 50 });
      doc.text(r.weekday, col.w, yPos, { width: 35 });
      doc.text(r.dayType, col.t, yPos, { width: 70 });
      doc.text(truncate(r.checkIn, 20), col.i, yPos, { width: 90 });
      doc.text(truncate(r.checkOut, 20), col.o, yPos, { width: 90 });
      doc.text(r.totalHoursText, col.h, yPos, { width: 45 });
      doc.text(truncate(r.status, 12), col.s, yPos, { width: 60 });
      doc.text(truncate(r.leaveNote, 22), col.l, yPos, { width: 120 });
      yPos += lineH;
    }
    if (rows.length === 0) {
      doc.fontSize(9).text('No attendance records in the selected period.', 40, yPos);
    }
    doc.end();
  } catch (err) {
    console.error('Employee history export failed:', {
      message: err.message,
      stack: err.stack,
      query: req.query,
    });
    next(err);
  }
};
