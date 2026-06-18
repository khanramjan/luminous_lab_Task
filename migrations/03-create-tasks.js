'use strict';

/**
 * Migration: Create Tasks Table
 *
 * Creates the tasks table with FKs to projects (required) and users (assignee, optional).
 * Includes indexes for common query patterns (filtering, sorting).
 * Compatible with PostgreSQL (Supabase) and SQLite.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('todo', 'in_progress', 'in_review', 'done'),
        defaultValue: 'todo',
        allowNull: false,
      },
      assigneeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      dueDate: {
        type: Sequelize.DATEONLY,
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

    // Indexes for common query patterns
    await queryInterface.addIndex('tasks', ['status'], { name: 'idx_tasks_status' });
    await queryInterface.addIndex('tasks', ['priority'], { name: 'idx_tasks_priority' });
    await queryInterface.addIndex('tasks', ['assigneeId'], { name: 'idx_tasks_assignee' });
    await queryInterface.addIndex('tasks', ['projectId'], { name: 'idx_tasks_project' });
    await queryInterface.addIndex('tasks', ['dueDate'], { name: 'idx_tasks_due_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
    // PostgreSQL: drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_priority";').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_status";').catch(() => {});
  },
};
