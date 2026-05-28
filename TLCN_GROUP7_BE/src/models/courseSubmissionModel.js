module.exports = (sequelize, DataTypes) => {
  const CourseSubmission = sequelize.define('CourseSubmission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'students', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'lessons', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    careerPathId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'career_paths', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    submissionData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    aiGrading: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('SUBMITTED', 'GRADED'),
      defaultValue: 'SUBMITTED',
      allowNull: false
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gradedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'course_submissions',
    timestamps: true
  });

  return CourseSubmission;
};
