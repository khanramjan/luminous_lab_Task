/**
 * Comment Model
 *
 * Fields: id, body, taskId, authorId
 * Soft delete enabled (paranoid).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Comment body cannot be empty' },
      },
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'comments',
  });

  return Comment;
};
