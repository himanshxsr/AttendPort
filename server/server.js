const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const helmet = require('helmet');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const initMidnightCron = require('./services/midnightCron');

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config();

// Diagnostic: Check for required env vars in production
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnv.join(', '));
  if (process.env.NODE_ENV === 'production') {
    console.error('Deployment will fail because these keys are not set in the Render Dashboard.');
  }
} else {
  console.log('✅ All required environment variables are present.');
}

// Connect to database
connectDB();

// One-Time Sync: Fix April 2026 data on startup
const Attendance = require('./models/Attendance');
const { calculateStatus, syncLeaveBalance } = require('./controllers/attendanceController');
setTimeout(async () => {
  try {
    const startDate = '2026-04-01';
    const endDate = '2026-04-06';
    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });
    console.log(`🧹 Startup Sync: Analyzing ${attendances.length} records...`);
    for (const record of attendances) {
      if (record.status !== 'Leave') {
        const newStatus = calculateStatus(record.date, record.totalHours);
        if (newStatus !== record.status) {
            record.status = newStatus;
            await record.save();
        }
      }
      await syncLeaveBalance(record.userId, record._id);
    }
    console.log('✅ Startup Sync: April 2026 data corrected.');
  } catch (err) {
    console.error('Startup sync error:', err.message);
  }
}, 10000);

const app = express();

// Body parser
app.use(express.json());

// Set security HTTP headers
app.use(helmet());

// Enable CORS with restriction
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check route for Uptime Robot
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Start midnight automation
  initMidnightCron();
});

// Self-pinger to keep the server awake on Render (Free Tier)
const https = require('https');
const SERVER_URL = process.env.SERVER_URL;

if (SERVER_URL) {
  console.log(`🚀 Self-pinger initialized for: ${SERVER_URL}`);
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Self-pinger is running in non-production mode.');
  }
  setInterval(() => {
    https.get(`${SERVER_URL}/ping`, (res) => {
      if (res.statusCode === 200) {
        console.log(`Pinged server at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}: Success (200)`);
      } else {
        console.error(`Pinged server but got unexpected status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error('Ping failed:', err.message);
    });
  }, 600000); // 10 minutes interval
}
