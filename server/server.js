const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { startSnapshotScheduler } = require('./utils/snapshotScheduler');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const loginRoutes = require('./routes/login');
const inventoryRoutes = require('./routes/inventory');
const logsRoutes = require('./routes/logs');
const requestsRoutes = require('./routes/requests');
const alertRoutes = require('./routes/alert');
const auditRoutes = require('./routes/audit');
const settingsRoutes = require('./routes/settings');

// Routes
app.use('/login', loginRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/logs', logsRoutes);
app.use('/requests', requestsRoutes);
app.use('/alert', alertRoutes);
app.use('/audit', auditRoutes);
app.use('/settings', settingsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

startSnapshotScheduler().catch((error) => {
  console.error('Failed to start snapshot scheduler:', error);
});
