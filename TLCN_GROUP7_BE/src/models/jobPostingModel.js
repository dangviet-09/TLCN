module.exports = (sequelize, DataTypes) => {
  const JobPosting = sequelize.define('JobPosting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    skillRequirements: {
      type: DataTypes.JSON,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    salaryMin: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    salaryMax: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    employmentType: {
      type: DataTypes.ENUM('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'),
      allowNull: true
    },
    experienceLevel: {
      type: DataTypes.ENUM('FRESHER', 'JUNIOR', 'MIDIOR', 'SENIOR'),
      allowNull: true
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requiredDocuments: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'CLOSED', 'DRAFT'),
      defaultValue: 'DRAFT',
      allowNull: false
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    tableName: 'job_postings',
    timestamps: true
  });

  return JobPosting;
};
