/**
 * Task Assignment API — Entry Point
 *
 * Loads environment variables, runs database migrations,
 * and starts the Express server.
 */

require('dotenv').config();

const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Run migrations (safe for production — idempotent, never alters existing tables)
    const path = require('path');
    const fs = require('fs');
    const Sequelize = require('sequelize');
    const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
    const queryInterface = sequelize.getQueryInterface();

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const file of migrationFiles) {
      try {
        const migration = require(path.join(MIGRATIONS_DIR, file));
        await migration.up(queryInterface, Sequelize);
      } catch (error) {
        // Skip if table already exists (idempotent)
        if (error.message && error.message.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
    console.log('✅ Database migrations verified.');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📄 API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
