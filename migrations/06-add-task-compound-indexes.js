'use strict';

/**
 * Migration: Add Compound Indexes to Tasks Table
 *
 * Performance optimization:
 * Creates composite indexes to speed up the most common dashboard queries,
 * specifically filtering by assignee + status, and project + status.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Index to optimize "My Tasks" view (e.g., assignee = me AND status = 'todo')
    await queryInterface.addIndex('tasks', ['assigneeId', 'status'], {
      name: 'idx_tasks_assignee_status',
    });

    // Index to optimize Project board view (e.g., project = X AND status = 'in_progress')
    await queryInterface.addIndex('tasks', ['projectId', 'status'], {
      name: 'idx_tasks_project_status',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the indexes to rollback safely
    await queryInterface.removeIndex('tasks', 'idx_tasks_assignee_status');
    await queryInterface.removeIndex('tasks', 'idx_tasks_project_status');
  },
};
