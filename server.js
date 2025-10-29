const express =  require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// Import routes
const loginRoutes = require('./routes/login');
const inventoryRoutes = require('./routes/inventory');
const logsRoutes = require('./routes/logs');

// Routes
app.use('/login', loginRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/logs', logsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
