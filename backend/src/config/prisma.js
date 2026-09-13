const { PrismaClient } = require('@prisma/client');

// Single shared client for the whole process. Prisma manages its own
// connection pool internally, so creating multiple clients would just
// waste connections.
const prisma = new PrismaClient();

module.exports = prisma;
