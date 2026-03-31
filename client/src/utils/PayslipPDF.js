import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePayslipPDF = (user, payslip) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Cryenx Labs', pageWidth - 20, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const address = [
    '(Appease IT Solutions Pvt. Ltd), Wework Prestige Cube,',
    'Site No. 26, Hosur Road, Adugodi, Koramangala,',
    'Bangalore, Karnataka, Bengaluru,',
    'Karnataka- 560030'
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
    ['Name', payslip.userId?.name || user?.name, 'PAN', details.pan || ''],
    ['Employee Code', user?.employeeCode || details.employeeCode || '', 'Sex', details.sex || ''],
    ['Designation', details.designation || '', 'Account Number', details.accountNumber || ''],
    ['Location', details.location || '', 'PF Account Number', details.pfAccountNumber || ''],
    ['Joining Date', details.joiningDate || '', 'PF UAN', details.pfUan || ''],
    ['Leaving Date', details.leavingDate || '', 'ESI Number', details.esiNumber || ''],
    ['Tax Regime', details.taxRegime || '', '', '']
  ];

  doc.autoTable({
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
      payslip.attendanceSummary?.payDays?.toFixed(2) || '0.00',
      payslip.attendanceSummary?.attendanceArrearDays?.toFixed(2) || '0.00',
      payslip.attendanceSummary?.incrementArrearDays?.toFixed(2) || '0.00'
    ]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 5,
    head: [attendanceData[0]],
    body: [attendanceData[1]],
    theme: 'grid',
    headStyles: { fillColor: [31, 41, 55], textColor: 255, halign: 'center', fontSize: 8 },
    styles: { halign: 'center', fontSize: 9 },
    margin: { left: 15, right: 15 }
  });

  // 5. Earnings & Deductions side-by-side
  const earningsData = (payslip.earnings || []).map(e => [e.label, e.rate.toFixed(2), e.monthly.toFixed(2), e.arrear.toFixed(2), e.total.toFixed(2)]);
  earningsData.push([{ content: 'TOTAL EARNINGS', styles: { fontStyle: 'bold' } }, '', '', '', { content: payslip.totalEarnings.toFixed(2), styles: { fontStyle: 'bold' } }]);

  const deductionsData = (payslip.deductions || []).map(d => [d.label, d.total.toFixed(2)]);
  deductionsData.push([{ content: 'TOTAL DEDUCTIONS', styles: { fontStyle: 'bold' } }, { content: payslip.totalDeductions.toFixed(2), styles: { fontStyle: 'bold' } }]);

  // Earnings Table
  doc.autoTable({
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

  // Deductions Table
  doc.autoTable({
    startY: doc.autoTable.previous.startY,
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
  doc.autoTable({
    startY: finalTableY + 5,
    body: [
      ['NET PAY (INR)', payslip.netPay.toFixed(2)],
      ['NET PAY IN WORDS', payslip.netPayInWords || '']
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [220, 220, 220], cellWidth: 50 },
      1: { fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // 7. Leave Balance
  doc.setFillColor(31, 41, 55);
  doc.rect(15, doc.lastAutoTable.finalY + 5, pageWidth - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('LEAVE BALANCE', pageWidth / 2, doc.lastAutoTable.finalY + 10, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const leaveData = (payslip.leaveBalances || []).map(l => [l.type, l.opening.toFixed(2), l.availed.toFixed(2), l.closing.toFixed(2)]);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 13,
    head: [['LEAVE TYPE', 'OPENING BALANCE', 'AVAILED LEAVE', 'CLOSING BALANCE']],
    body: leaveData,
    theme: 'grid',
    headStyles: { fillColor: [200, 200, 200], textColor: 0, fontSize: 8 },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 }
  });

  // Save the PDF
  doc.save(`Payslip_${user.name}_${payslip.month}_${payslip.year}.pdf`);
};
