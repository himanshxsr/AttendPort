import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generatePayslipPDF = (user, payslip) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(63, 81, 181); // Indigo
  doc.text('ELISIUM PROJECTS', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Official Monthly Payslip', 14, 28);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString()}`, pageWidth - 14, 22, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(14, 35, pageWidth - 14, 35);

  // --- Employee Info Section ---
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details', 14, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${user.name}`, 14, 52);
  doc.text(`Email: ${user.email}`, 14, 58);
  doc.text(`Designation: ${user.role || 'Employee'}`, 14, 64);

  doc.text(`Period: ${payslip.month} ${payslip.year}`, pageWidth - 14, 52, { align: 'right' });
  doc.text(`Present Days: ${payslip.attendanceInfo?.presentDays || 0} / ${payslip.attendanceInfo?.totalDays || '--'}`, pageWidth - 14, 58, { align: 'right' });

  // --- Earnings & Deductions Tables ---
  const earningsData = payslip.earnings.map(item => [item.label, `INR ${item.amount.toLocaleString()}`]);
  const deductionsData = payslip.deductions.map(item => [item.label, `INR ${item.amount.toLocaleString()}`]);

  // Earnings Table
  doc.autoTable({
    startY: 75,
    head: [['Earnings', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: { fillColor: [63, 81, 181] },
    margin: { left: 14, right: pageWidth / 2 + 5 },
  });

  // Deductions Table
  doc.autoTable({
    startY: 75,
    head: [['Deductions', 'Amount']],
    body: deductionsData,
    theme: 'striped',
    headStyles: { fillColor: [244, 63, 94] },
    margin: { left: pageWidth / 2 + 5, right: 14 },
  });

  // --- Summary ---
  const finalY = Math.max(doc.lastAutoTable.finalY, 75);
  
  doc.setDrawColor(200);
  doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);

  doc.setFontSize(11);
  doc.text(`Total Earnings:`, pageWidth - 80, finalY + 20);
  doc.text(`INR ${payslip.totalEarnings.toLocaleString()}`, pageWidth - 14, finalY + 20, { align: 'right' });

  doc.text(`Total Deductions:`, pageWidth - 80, finalY + 28);
  doc.text(`INR ${payslip.totalDeductions.toLocaleString()}`, pageWidth - 14, finalY + 28, { align: 'right' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(63, 81, 181);
  doc.text(`NET PAYABLE:`, pageWidth - 80, finalY + 40);
  doc.text(`INR ${payslip.netPay.toLocaleString()}`, pageWidth - 14, finalY + 40, { align: 'right' });

  // --- Footer ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150);
  doc.text('This is a computer-generated document and does not require a physical signature.', pageWidth / 2, 280, { align: 'center' });
  doc.text('© Elisium Projects Inc.', pageWidth / 2, 285, { align: 'center' });

  doc.save(`Payslip_${user.name.replace(/\s/g, '_')}_${payslip.month}_${payslip.year}.pdf`);
};
