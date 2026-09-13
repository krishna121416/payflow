const express = require('express');
const healthRoutes = require('./routes/health.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
