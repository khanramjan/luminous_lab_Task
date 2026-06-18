/**
 * Database Configuration
 *
 * Sequelize instance configured for:
 * - Development/Production: Supabase PostgreSQL (via DATABASE_URL)
 * - Test: In-memory SQLite for fast, isolated test runs
 */

const { Sequelize } = require('sequelize');

const isTest = process.env.NODE_ENV === 'test';

let sequelize;

if (isTest) {
  // Use in-memory SQLite for tests (fast, no external dependencies)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      paranoid: true,
      underscored: false,
    },
  });
} else {
  // Use Supabase PostgreSQL for development & production
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required.');
    console.error('   Set it in your .env file. Get it from your Supabase project settings.');
    console.error('   Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    process.exit(1);
  }

  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Supabase
      },
    },
    logging: process.env.NODE_ENV === 'development' ? false : false, // Set to console.log for SQL debugging
    define: {
      timestamps: true,
      paranoid: true,
      underscored: false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

module.exports = sequelize;
