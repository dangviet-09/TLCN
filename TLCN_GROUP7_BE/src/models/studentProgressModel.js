module.exports = (sequelize, DataTypes) => {
  const StudentProgress = sequelize.define('StudentProgress', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: { type: DataTypes.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'), defaultValue: 'NOT_STARTED' },
    currentLessonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'lessons', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    lastCompletedLessonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'lessons', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'student_progress',
    timestamps: true
  });

  StudentProgress.associate = (models) => {
    StudentProgress.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
    StudentProgress.belongsTo(models.CareerPath, { foreignKey: 'careerPathId', as: 'careerPath' });
  };

  return StudentProgress;
};
