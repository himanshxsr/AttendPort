const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Set security HTTP headers
app.use(helmet());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

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

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
