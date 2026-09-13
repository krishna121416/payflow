const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// The React dashboard runs on a different port in dev (Vite on 5173, API
// on 4000). Permissive CORS is fine here - this is a local/academic
// project with no auth, not a service with sensitive cross-origin data.
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);
app.use('/api', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
