'use strict';

/**
 * Migration: Create Audit Logs Table
 *
 * Creates the audit_logs table for recording task changes.
 * This table is APPEND-ONLY — no updatedAt, no soft delete.
 * Compatible with PostgreSQL (Supabase) and SQLite.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      taskId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tasks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      field: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      oldValue: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      newValue: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      changedById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Indexes for fast audit history lookups
    await queryInterface.addIndex('audit_logs', ['taskId'], { name: 'idx_audit_task' });
    await queryInterface.addIndex('audit_logs', ['changedById'], { name: 'idx_audit_changed_by' });
    await queryInterface.addIndex('audit_logs', ['action'], { name: 'idx_audit_action' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
