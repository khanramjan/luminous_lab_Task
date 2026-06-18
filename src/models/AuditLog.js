/**
 * AuditLog Model
 *
 * Records every significant change to tasks (status, priority, assignee)
 * and comment activity (created, updated, deleted).
 *
 * Fields: id, taskId, action, field, oldValue, newValue, changedById
 * NOT soft-deleted — audit logs are permanent records.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [[
            'STATUS_CHANGE',
            'PRIORITY_CHANGE',
            'ASSIGNEE_CHANGE',
            'TASK_CREATED',
            'TASK_DELETED',
            'COMMENT_ADDED',
            'COMMENT_UPDATED',
            'COMMENT_DELETED',
          ]],
          msg: 'Invalid audit action',
        },
      },
    },
    field: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    oldValue: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    changedById: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'audit_logs',
    paranoid: false, // Audit logs are NEVER soft-deleted
    updatedAt: false, // Audit logs are immutable — no updates
  });

  return AuditLog;
};
