const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

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
