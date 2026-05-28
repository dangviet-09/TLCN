module.exports = (sequelize, DataTypes) => {
  const JobApplication = sequelize.define('JobApplication', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    jobPostingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'job_postings', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'students', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    coverLetter: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED'),
      defaultValue: 'PENDING',
      allowNull: false
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'job_applications',
    timestamps: true
  });

  return JobApplication;
};
