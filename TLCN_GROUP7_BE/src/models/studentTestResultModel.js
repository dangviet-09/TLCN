module.exports = (sequelize, DataTypes) => {
  const StudentTestResult = sequelize.define('StudentTestResult', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    score: { type: DataTypes.FLOAT },
    testId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tests', key: 'id' },
      onDelete: 'CASCADE'
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'students', key: 'id' }, 
      onDelete: 'CASCADE'
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Student answers array: [{questionId, answer}]'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed feedback from AI grading'
    },
    aiGrading: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Full AI grading result: {score, correctCount, totalQuestions, feedback, suggestions, details}'
    },
    passed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Whether the student passed the test'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the test was completed'
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'lessons', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'student_test_results',
    timestamps: true
  });

  StudentTestResult.associate = (models) => {
  StudentTestResult.belongsTo(models.Student, {
    foreignKey: 'studentId',
    as: 'student'
  });

  StudentTestResult.belongsTo(models.Test, {
    foreignKey: 'testId',
    as: 'test'
  });
};


  return StudentTestResult;
};
