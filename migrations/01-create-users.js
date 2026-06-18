'use strict';

/**
 * Migration: Create Users Table
 *
 * Creates the users table with all required columns.
 * Supports rollback via the `down` method.
 *
 * Compatible with PostgreSQL (Supabase) and SQLite.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'manager', 'member'),
        defaultValue: 'member',
        allowNull: false,
      },
      refreshToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Index on email for faster lookups
    await queryInterface.addIndex('users', ['email'], {
      unique: true,
      name: 'idx_users_email',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
    // PostgreSQL: drop the ENUM type created for the role column
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";').catch(() => {});
  },
};
