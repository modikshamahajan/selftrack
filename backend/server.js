const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const userRoutes = require('./src/routes/userRoutes');
const habitRoutes = require('./src/routes/habitRoutes');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Base/Health Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the SelfTrack API' });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/habits', habitRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
