const app = require('./app');
const config = require('./config');
const db = require('./db');

async function startServer() {
  try {
    // Initialize database (SQLite or MySQL)
    await db.initDb();

    let currentPort = parseInt(config.PORT, 10);
    const maxAttempts = 10;

    function tryListen(port, attemptsLeft) {
      const server = app.listen(port, () => {
        console.log(`
============================================================
🚀 Employee Leave Management System is running!
🌐 URL:         http://localhost:${port}
📊 Metrics:     http://localhost:${port}/metrics
❤️  Health:      http://localhost:${port}/health
⚙️  Environment: ${config.NODE_ENV}
💾 Database:    ${db.getDbInfo().engine.toUpperCase()} (${db.getDbInfo().location})
============================================================
        `);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ Port ${port} is in use (e.g., by Jenkins). Attempting port ${port + 1}...`);
          if (attemptsLeft > 0) {
            tryListen(port + 1, attemptsLeft - 1);
          } else {
            console.error('❌ Could not find an open port.');
            process.exit(1);
          }
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });

      // Graceful shutdown handling
      const shutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        server.close(async () => {
          await db.closeDb();
          console.log('💤 Server and database connections closed cleanly.');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    }

    tryListen(currentPort, maxAttempts);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
