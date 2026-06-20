/**
 * Audit Service
 *
 * Provides helper functions to create audit log entries.
 * Called by controllers whenever a tracked field changes on a task.
 */

const { AuditLog } = require('../models');
const redisService = require('../config/redis');

/**
 * Log a single field change on a task.
 *
 * @param {object} params
 * @param {string} params.taskId - The task that changed
 * @param {string} params.action - Action type (e.g. STATUS_CHANGE)
 * @param {string} [params.field] - Which field changed (e.g. 'status')
 * @param {string} [params.oldValue] - Previous value
 * @param {string} [params.newValue] - New value
 * @param {string} params.changedById - User who made the change
 * @returns {Promise<object>} The created AuditLog entry
 */
async function logChange({ taskId, action, field = null, oldValue = null, newValue = null, changedById }) {
  const log = await AuditLog.create({
    taskId,
    action,
    field,
    oldValue: oldValue != null ? String(oldValue) : null,
    newValue: newValue != null ? String(newValue) : null,
    changedById,
  });

  if (redisService.isAvailable) {
    redisService.client.del(`audit:${taskId}`).catch((err) => {
      console.warn(`⚠️ [Redis] Cache invalidation failed for audit:${taskId}:`, err.message);
    });
  }

  return log;
}

/**
 * Log multiple field changes on a task in one call.
 *
 * @param {string} taskId
 * @param {Array<{ action: string, field?: string, oldValue?: string, newValue?: string }>} changes
 * @param {string} changedById
 * @returns {Promise<object[]>} Created AuditLog entries
 */
async function logMultipleChanges(taskId, changes, changedById) {
  const entries = changes.map((change) => ({
    taskId,
    action: change.action,
    field: change.field || null,
    oldValue: change.oldValue != null ? String(change.oldValue) : null,
    newValue: change.newValue != null ? String(change.newValue) : null,
    changedById,
  }));

  const logs = await AuditLog.bulkCreate(entries);

  if (redisService.isAvailable) {
    redisService.client.del(`audit:${taskId}`).catch((err) => {
      console.warn(`⚠️ [Redis] Cache invalidation failed for audit:${taskId}:`, err.message);
    });
  }

  return logs;
}

/**
 * Get the full audit history for a task.
 *
 * @param {string} taskId
 * @returns {Promise<object[]>} Audit log entries, newest first
 */
async function getTaskAuditHistory(taskId) {
  const { User } = require('../models');

  if (redisService.isAvailable) {
    try {
      const cached = await redisService.client.get(`audit:${taskId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`⚠️ [Redis] Cache read failed for audit:${taskId}:`, err.message);
    }
  }

  const results = await AuditLog.findAll({
    where: { taskId },
    include: [
      {
        model: User,
        as: 'changedBy',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  if (redisService.isAvailable) {
    try {
      await redisService.client.setEx(`audit:${taskId}`, 86400, JSON.stringify(results));
    } catch (err) {
      console.warn(`⚠️ [Redis] Cache write failed for audit:${taskId}:`, err.message);
    }
  }

  return results;
}

module.exports = {
  logChange,
  logMultipleChanges,
  getTaskAuditHistory,
};
