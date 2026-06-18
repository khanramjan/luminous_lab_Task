/**
 * Project Model
 *
 * Fields: id, name, description, ownerId
 * Soft delete enabled (paranoid).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Project name cannot be empty' },
        len: { args: [2, 200], msg: 'Project name must be between 2 and 200 characters' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'projects',
  });

  return Project;
};
