
const qdrantConfig = require('../configs/qdrant');

module.exports = (sequelize, DataTypes) => {
  const Test = sequelize.define('Test', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.ENUM('MINI', 'FINAL_PATH'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT('long'), // Đề bài dạng text tự do (có thể dùng Markdown sau)
      allowNull: true
    },
    maxScore: {
      type: DataTypes.FLOAT,
      defaultValue: 100
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'lessons',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    careerPathId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'career_paths',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'tests',
    timestamps: true
  });

  Test.associate = (models) => {
    // Một Test thuộc về Lesson (có thể null nếu là FINAL_PATH)
    Test.belongsTo(models.Lesson, {
      foreignKey: 'lessonId',
      as: 'lesson',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Một Test thuộc về CareerPath (có thể null nếu là MINI)
    Test.belongsTo(models.CareerPath, {
      foreignKey: 'careerPathId',
      as: 'careerPath',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Một Test có thể có nhiều kết quả của học viên
    Test.hasMany(models.StudentTestResult, {
      foreignKey: 'testId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  // Hooks for vector database synchronization
  Test.addHook('afterCreate', async (test, options) => {
    try {
      const vectorService = require('../services/vectorService'); // CHÍNH XÁC LÀ DÒNG NÀY
      
      // Load with lesson and career path data for vector indexing
      const { Lesson, CareerPath } = require('./index');
      const testWithRelations = await Test.findByPk(test.id, {
        include: [
          {
            model: Lesson,
            as: 'lesson',
            attributes: ['title'],
            include: [{
              model: CareerPath,
              as: 'careerPath',
              attributes: ['title']
            }]
          }
        ]
      });
      
      await vectorService.addTest(testWithRelations);
    } catch (error) {
      console.error('Error adding test to vector database:', error);
    }
  });

  Test.addHook('afterUpdate', async (test, options) => {
    try {
      const vectorService = require('../services/vectorService'); // CHÍNH XÁC LÀ DÒNG NÀY
      
      // Re-index updated test
      const { Lesson, CareerPath } = require('./index');
      const testWithRelations = await Test.findByPk(test.id, {
        include: [
          {
            model: Lesson,
            as: 'lesson',
            attributes: ['title'],
            include: [{
              model: CareerPath,
              as: 'careerPath',
              attributes: ['title']
            }]
          }
        ]
      });
      
      await vectorService.addTest(testWithRelations); // Upsert
    } catch (error) {
      console.error('Error updating test in vector database:', error);
    }
  });

  Test.addHook('afterDestroy', async (test, options) => {
    try {
      const vectorService = require('../services/vectorService'); // CHÍNH XÁC LÀ DÒNG NÀY
      await vectorService.deleteFromVector(qdrantConfig.collections.TESTS, test.id);
    } catch (error) {
      console.error('Error deleting test from vector database:', error);
    }
  });

  return Test;
};
