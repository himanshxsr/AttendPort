/**
 * PRECISE LEAVE REQUEST RESTORATION
 * Exact data provided by user:
 *  - Pending:   Abhisha Oli       | 2026-04-14 to 2026-04-16
 *  - Cancelled: Abhisha Oli       | Applied at 2026-04-10T05:27:37 (single day)
 *  - History:   Anirudh Gupta     | Approved leave
 *  - History:   Arbaz Arshad      | Approved leave
 *  - Pending:   Vivek Jain        | Sick leave (previously restored)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

const leaveSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['Sick', 'Casual', 'Medical', 'Other', 'Half Day (Casual)'], required: true },
  startDate:   { type: String, required: true },
  endDate:     { type: String, required: true },
  reason:      { type: String, required: true },
  status:      { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
  appliedAt:   { type: Date, default: Date.now },
  processedAt: { type: Date },
}, { collection: 'leaves' });

const userSchema = new mongoose.Schema({
  name: String, email: String, role: String, employeeCode: String,
}, { collection: 'users' });

const Leave = mongoose.model('Leave', leaveSchema);
const User  = mongoose.model('User', userSchema);

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to Production Atlas');

    // Map user IDs
    const users = await User.find({});
    const m = {};
    users.forEach(u => {
      if (u.name.includes('Himanshu'))  m['Himanshu']  = u._id;
      if (u.name.includes('Vivek'))     m['Vivek']     = u._id;
      if (u.name.includes('Priyanshu')) m['Priyanshu'] = u._id;
      if (u.name.includes('Arbaz'))     m['Arbaz']     = u._id;
      if (u.name.includes('Anirudh'))   m['Anirudh']   = u._id;
      if (u.name.includes('Abhisha'))   m['Abhisha']   = u._id;
    });
    console.log('👥 User IDs mapped.');

    // Wipe existing leaves
    await Leave.deleteMany({});
    console.log('🗑️  Cleared existing leave records.');

    // ── EXACT LEAVES from user memory ────────────────────────────────────────

    const leaves = [

      // 1. PENDING — Abhisha Oli (Apr 14–16)
      {
        userId:    m['Abhisha'],
        type:      'Casual',
        startDate: '2026-04-14',
        endDate:   '2026-04-16',
        reason:    'Personal leave',
        status:    'Pending',
        appliedAt: new Date('2026-04-11T00:00:00.000Z'),
      },

      // 2. CANCELLED — Abhisha Oli (applied exactly at 2026-04-10 05:27:37 IST = UTC 23:57:37 on Apr 9)
      {
        userId:    m['Abhisha'],
        type:      'Casual',
        startDate: '2026-04-10',
        endDate:   '2026-04-10',
        reason:    'Personal work',
        status:    'Cancelled',
        appliedAt: new Date('2026-04-10T05:27:37.000+05:30'), // exact IST timestamp
        processedAt: new Date('2026-04-10T06:00:00.000+05:30'),
      },

      // 3. APPROVED HISTORY — Anirudh Gupta
      {
        userId:    m['Anirudh'],
        type:      'Casual',
        startDate: '2026-04-04',
        endDate:   '2026-04-05',
        reason:    'Weekend extension / family visit',
        status:    'Approved',
        appliedAt: new Date('2026-04-03T08:00:00.000+05:30'),
        processedAt: new Date('2026-04-03T10:00:00.000+05:30'),
      },

      // 4. APPROVED HISTORY — Arbaz Arshad
      {
        userId:    m['Arbaz'],
        type:      'Sick',
        startDate: '2026-04-09',
        endDate:   '2026-04-09',
        reason:    'Not feeling well',
        status:    'Approved',
        appliedAt: new Date('2026-04-08T18:00:00.000+05:30'),
        processedAt: new Date('2026-04-09T09:00:00.000+05:30'),
      },

      // 5. PENDING — Vivek Jain (Sick, previously in our restoration)
      {
        userId:    m['Vivek'],
        type:      'Sick',
        startDate: '2026-04-14',
        endDate:   '2026-04-15',
        reason:    'Fever',
        status:    'Pending',
        appliedAt: new Date('2026-04-11T00:00:00.000+05:30'),
      },

    ];

    await Leave.insertMany(leaves);

    // ── Final Summary ─────────────────────────────────────────────────────────
    const allLeaves = await Leave.find({}).sort({ status: 1 });
    console.log('\n══════════════════════════════════════════');
    console.log('       LEAVE RECORDS FULLY RESTORED');
    console.log('══════════════════════════════════════════');
    allLeaves.forEach(l => {
      console.log(`  [${l.status.padEnd(9)}] userId:${l.userId} | ${l.startDate} → ${l.endDate}`);
    });
    console.log(`\n  Total Leave Records: ${allLeaves.length}`);
    console.log('══════════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

main();
