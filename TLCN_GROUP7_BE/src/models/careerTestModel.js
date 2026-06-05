// models/CareerTest.js
module.exports = (sequelize, DataTypes) => {
  const CareerTest = sequelize.define('CareerTest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      defaultValue: 'Bài trắc nghiệm định hướng nghề nghiệp'
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: 'Bài test giúp xác định chuyên ngành phù hợp với sinh viên dựa trên sở thích và năng lực.'
    },
    questions: {
      type: DataTypes.JSON, 
      allowNull: false
    },
    level: {
      type: DataTypes.ENUM('FRESHER', 'JUNIOR', 'MIDIOR', 'SENIOR'),
      defaultValue: 'FRESHER',
      allowNull: true
    },
    skills: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // BỔ SUNG CỘT BỊ THIẾU Ở ĐÂY
    companyId: {
      type: DataTypes.UUID,
      allowNull: true, // Tạm để true để không làm crash các bài test cũ đã tạo trước đó
    }
  }, {
    tableName: 'career_tests',
    timestamps: true
  });

  // Khai báo quan hệ với bảng Company (nếu hệ thống có setup index.js gộp model)
  CareerTest.associate = function(models) {
    if (models.Company) {
      CareerTest.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    }
  };

  return CareerTest;
};