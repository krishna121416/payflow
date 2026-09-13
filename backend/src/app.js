const express = require('express');
const healthRoutes = require('./routes/health.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
