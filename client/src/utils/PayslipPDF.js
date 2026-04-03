import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/black email.jpg';

// Helper to convert number to Indian currency words
const numberToWords = (num) => {
  if (num === 0) return 'Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const format = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + format(n % 100) : '');
    return '';
  };

  let str = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crore > 0) str += format(crore) + 'Crore ';
  if (lakh > 0) str += format(lakh) + 'Lakh ';
  if (thousand > 0) str += format(thousand) + 'Thousand ';
  if (remaining > 0) str += format(remaining);

  return str.trim() + ' Only';
};

export const generatePayslipPDF = (user, payslip, liveBalances = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 0. Watermark (Center with low intensity)
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.addImage(logo, 'JPEG', pageWidth / 2 - 40, pageHeight / 2 - 40, 80, 80, undefined, 'FAST');
  doc.restoreGraphicsState();

  // 1. Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  
  // Logo next to name
  doc.addImage(logo, 'JPEG', pageWidth - 74, 10, 12, 12, undefined, 'FAST');
  doc.text('Elisium Space', pageWidth - 20, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const address = [
    '1/D Arjun Nagar, Safdarjung Enclave,',
    'New Delhi, Delhi- 110029'
  ];
  address.forEach((line, index) => {
    doc.text(line, pageWidth - 20, 26 + (index * 4), { align: 'right' });
  });

  // 2. Title
  doc.setDrawColor(0);
  doc.setFillColor(31, 41, 55); // Dark gray header
  doc.rect(15, 45, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYSLIP FOR ${payslip.month.toUpperCase()} ${payslip.year}`, pageWidth / 2, 50, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // 3. Employee Details Grid
  const details = payslip.employeeDetails || {};
  const gridData = [
    ['Name', user?.name || payslip.userId?.name, 'PAN', user?.pan || details.pan || ''],
    ['Employee Code', user?.employeeCode || details.employeeCode || '', 'Sex', user?.sex || details.sex || ''],
    ['Designation', user?.designation || details.designation || '', 'Account Number', user?.accountNumber || details.accountNumber || ''],
    ['Location', user?.location || details.location || '', 'PF Account Number', user?.pfAccountNumber || details.pfAccountNumber || ''],
    ['Joining Date', user?.joiningDate || details.joiningDate || '', 'PF UAN', user?.pfUAN || details.pfUan || ''],
    ['Leaving Date', user?.leavingDate || details.leavingDate || '', 'ESI Number', user?.esiNumber || details.esiNumber || ''],
    ['Tax Regime', user?.taxRegime || details.taxRegime || '', 'Salary Credited date', user?.salaryCreditedDate || details.salaryCreditedDate || '']
  ];

  autoTable(doc, {
    startY: 53,
    body: gridData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
      3: { cellWidth: 55 },
    },
    margin: { left: 15, right: 15 }
  });

  // 4. Attendance Summary
  const attendanceData = [
    ['PAY DAYS', 'ATTENDANCE ARREAR DAYS', 'INCREMENT ARREAR DAYS'],
    [
      (Number(payslip.attendanceSummary?.payDays) || 0).toFixed(2),
      (Number(payslip.attendanceSummary?.attendanceArrearDays) || 0).toFixed(2),
      (Number(payslip.attendanceSummary?.incrementArrearDays) || 0).toFixed(2)
    ]
  ];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    head: [attendanceData[0]],
    body: [attendanceData[1]],
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255, halign: 'center', fontSize: 8 },
    styles: { halign: 'center', fontSize: 9 },
    margin: { left: 15, right: 15 }
  });

  // 5. Earnings & Deductions side-by-side
  const earningsData = (payslip.earnings || []).map(e => [
    e.label, 
    (Number(e.rate) || 0).toFixed(2), 
    (Number(e.monthly) || 0).toFixed(2), 
    (Number(e.arrear) || 0).toFixed(2), 
    (Number(e.total) || 0).toFixed(2)
  ]);
  earningsData.push([{ content: 'TOTAL EARNINGS', styles: { fontStyle: 'bold' } }, '', '', '', { content: (Number(payslip.totalEarnings) || 0).toFixed(2), styles: { fontStyle: 'bold' } }]);

  const deductionsData = (payslip.deductions || []).map(d => [d.label, (Number(d.total) || 0).toFixed(2)]);
  deductionsData.push([{ content: 'TOTAL DEDUCTIONS', styles: { fontStyle: 'bold' } }, { content: (Number(payslip.totalDeductions) || 0).toFixed(2), styles: { fontStyle: 'bold' } }]);

  // Earnings Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    head: [['EARNINGS (INR)', '', '', '', '']],
    body: [['COMPONENTS', 'RATE', 'MONTHLY', 'ARREAR', 'TOTAL'], ...earningsData],
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255, halign: 'center' },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 40 }, 4: { halign: 'right' } },
    margin: { left: 15, right: pageWidth / 2 + 2 },
    didParseCell: (data) => {
      if (data.row.index === 0) data.cell.styles.fontStyle = 'bold';
    }
  });

  const earningsY = doc.lastAutoTable.finalY;
  const earningsStartY = doc.lastAutoTable.settings.startY;

  // Deductions Table (Synchronized Y with Earnings)
  autoTable(doc, {
    startY: earningsStartY,
    head: [['DEDUCTIONS (INR)', '']],
    body: [['COMPONENTS', 'TOTAL'], ...deductionsData],
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255, halign: 'center' },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: pageWidth / 2 + 2, right: 15 },
    didParseCell: (data) => {
      if (data.row.index === 0) data.cell.styles.fontStyle = 'bold';
    }
  });

  const finalTableY = Math.max(earningsY, doc.lastAutoTable.finalY);

  // 6. Net Pay Summary
  autoTable(doc, {
    startY: finalTableY + 5,
    body: [
      ['NET PAY (INR)', (Number(payslip.netPay) || 0).toFixed(2)],
      ['NET PAY IN WORDS', payslip.netPayInWords || numberToWords(payslip.netPay)]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 50 },
      1: { fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // 7. Leave Balance (Using live data if provided)
  doc.setFillColor(31, 41, 55);
  doc.rect(15, doc.lastAutoTable.finalY + 5, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('LEAVE BALANCE', pageWidth / 2, doc.lastAutoTable.finalY + 10, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const finalBalances = liveBalances ? [
    ['Casual Leave', '', '', liveBalances.casual],
    ['Sick Leave', '', '', liveBalances.sick]
  ] : (payslip.leaveBalances || []).map(l => [
    l.type, 
    (Number(l.opening) || 0).toFixed(2), 
    (Number(l.availed) || 0).toFixed(2), 
    (Number(l.closing) || 0).toFixed(2)
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 13,
    head: [['LEAVE TYPE', 'OPENING BALANCE', 'AVAILED LEAVE', 'CLOSING BALANCE']],
    body: finalBalances,
    theme: 'grid',
    headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 }
  });

  // Generation Timestamp at bottom
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`This is a computer generated payslip and does not require a signature. | Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`Payslip_${user.name}_${payslip.month}_${payslip.year}.pdf`);
};

