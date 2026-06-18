/**
 * Database Migration Script
 *
 * Runs all migration files in the migrations/ directory in order.
 * Also supports Sequelize sync as a fallback.
 *
 * Usage:
 *   npm run migrate              — Run migrations (sync models)
 *   npm run migrate -- --fresh   — Drop all tables and re-create
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../models');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function runMigrations() {
  const queryInterface = sequelize.getQueryInterface();
  const Sequelize = require('sequelize');

  console.log('🔄 Starting database migration...');

  // Authenticate connection
  await sequelize.authenticate();
  console.log('✅ Database connection established.');

  // Check for --fresh flag
  const isFresh = process.argv.includes('--fresh');

  if (isFresh) {
    console.log('⚠️  Fresh migration: dropping all tables...');
    await sequelize.drop();
    console.log('✅ All tables dropped.');
  }

  // Read migration files in order
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

  console.log(`📁 Found ${migrationFiles.length} migration files.`);

  for (const file of migrationFiles) {
    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));
      console.log(`  ▸ Running: ${file}...`);
      await migration.up(queryInterface, Sequelize);
      console.log(`    ✅ ${file} completed.`);
    } catch (error) {
      // If table already exists, skip gracefully
      if (error.message && error.message.includes('already exists')) {
        console.log(`    ⏭️  ${file} skipped (table already exists).`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✅ All migrations completed successfully.');
}

(async () => {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
