const vectorService = require('../services/vectorService');
const qdrantConfig = require('../configs/qdrant');

module.exports = (sequelize, DataTypes) => {
  const CareerPath = sequelize.define('CareerPath', {
    id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    image: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
      defaultValue: 'DRAFT',
      allowNull: false
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' }, // FIXED
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    level: {
      type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  }, {
    tableName: 'career_paths',
    timestamps: true
  });

  CareerPath.associate = (models) => {
    CareerPath.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    CareerPath.hasMany(models.Lesson, { foreignKey: 'careerPathId', as: 'lessons' });
    CareerPath.hasMany(models.Test, { foreignKey: 'careerPathId', as: 'tests' });
  };

  // Hooks for vector database synchronization
  CareerPath.addHook('afterCreate', async (careerPath, options) => {
    try {
      // Load with company data for vector indexing
      const { Company } = require('./index');
      const careerPathWithCompany = await CareerPath.findByPk(careerPath.id, {
        include: [{ model: Company, as: 'company', attributes: ['companyName'] }]
      });
      
      await vectorService.addCareerPath(careerPathWithCompany);
    } catch (error) {
      console.error('Error adding career path to vector database:', error);
    }
  });

  CareerPath.addHook('afterUpdate', async (careerPath, options) => {
    try {
      // Re-index updated career path
      const { Company } = require('./index');
      const careerPathWithCompany = await CareerPath.findByPk(careerPath.id, {
        include: [{ model: Company, as: 'company', attributes: ['companyName'] }]
      });
      
      await vectorService.addCareerPath(careerPathWithCompany); // Upsert
    } catch (error) {
      console.error('Error updating career path in vector database:', error);
    }
  });

  CareerPath.addHook('afterDestroy', async (careerPath, options) => {
    try {
      await vectorService.deleteFromVector(qdrantConfig.collections.CAREER_PATHS, careerPath.id);
    } catch (error) {
      console.error('Error deleting career path from vector database:', error);
    }
  });

  return CareerPath;
};
