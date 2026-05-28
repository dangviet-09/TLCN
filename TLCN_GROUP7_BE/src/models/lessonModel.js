const vectorService = require('../services/vectorService');
const qdrantConfig = require('../configs/qdrant');

module.exports = (sequelize, DataTypes) => {
  const Lesson = sequelize.define('Lesson', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT }, // nội dung bài học
    order: { type: DataTypes.INTEGER }, // thứ tự trong lộ trình
    careerPathId: {
      type: DataTypes.UUID,
      references: { model: 'career_paths', key: 'id' },
      onDelete: 'CASCADE'},
    type: {
      type: DataTypes.ENUM('TASK', 'THEORY'),
      allowNull: true
    },
    theoryContent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    taskDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    submissionFields: {
      type: DataTypes.JSON,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true
    },
    referenceLinks: {
      type: DataTypes.JSON,
      allowNull: true
    },
    rubric: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'lessons',
    timestamps: true
  });

  Lesson.associate = (models) => {
    Lesson.belongsTo(models.CareerPath, { foreignKey: 'careerPathId', as: 'careerPath' });
    Lesson.hasMany(models.Test, { foreignKey: 'lessonId' }); // test gắn với lesson
  };

  // Hooks for vector database synchronization
  Lesson.addHook('afterCreate', async (lesson, options) => {
    try {
      // Load with career path data for vector indexing
      const { CareerPath } = require('./index');
      const lessonWithCareerPath = await Lesson.findByPk(lesson.id, {
        include: [{ model: CareerPath, as: 'careerPath', attributes: ['title', 'description'] }]
      });
      
      await vectorService.addLesson(lessonWithCareerPath);
    } catch (error) {
      console.error('Error adding lesson to vector database:', error);
    }
  });

  Lesson.addHook('afterUpdate', async (lesson, options) => {
    try {
      // Re-index updated lesson
      const { CareerPath } = require('./index');
      const lessonWithCareerPath = await Lesson.findByPk(lesson.id, {
        include: [{ model: CareerPath, as: 'careerPath', attributes: ['title', 'description'] }]
      });
      
      await vectorService.addLesson(lessonWithCareerPath); // Upsert
    } catch (error) {
      console.error('Error updating lesson in vector database:', error);
    }
  });

  Lesson.addHook('afterDestroy', async (lesson, options) => {
    try {
      await vectorService.deleteFromVector(qdrantConfig.collections.LESSONS, lesson.id);
    } catch (error) {
      console.error('Error deleting lesson from vector database:', error);
    }
  });

  return Lesson;
};