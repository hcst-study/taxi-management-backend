require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.send('Taxi Management Backend — hello 👋');
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
