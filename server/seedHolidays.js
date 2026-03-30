const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Holiday = require('./models/Holiday');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const holidays = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-03-21', name: 'Id-ul-Fitr' },
  { date: '2026-03-26', name: 'Rama Navami' },
  { date: '2026-03-31', name: 'Mahavir Jayanti' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Buddha Purnima' },
  { date: '2026-05-27', name: 'Id-ul-Zuha (Bakrid)' },
  { date: '2026-06-26', name: 'Muharram' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-08-26', name: 'Id-e-Milad' },
  { date: '2026-09-04', name: 'Janmashtami' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-21', name: 'Vijaya Dashami (Dussehra)' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

const seedHolidays = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Remove existing holidays to avoid duplicates
    await Holiday.deleteMany({});
    console.log('Cleared existing holidays');

    await Holiday.insertMany(holidays);
    console.log('Seeded 2026 Indian holidays successfully');

    process.exit();
  } catch (err) {
    console.error('Error seeding holidays:', err);
    process.exit(1);
  }
};

seedHolidays();
