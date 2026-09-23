const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

const cron = require('node-cron');
const { calculateRisk } = require('./controllers/analyticsController');

const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/assessments', assessmentRoutes);

app.use('/api/users', require('./routes/userRoutes'));


// Cron Job: Run every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running Daily Risk Calculation...');
    calculateRisk();
});

const PORT = process.env.PORT || 5001;

// app.listen(PORT, console.log(`Server running on port ${PORT}`));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
