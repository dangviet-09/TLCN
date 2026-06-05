module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define("Student", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },

    major: DataTypes.STRING,
    school: DataTypes.STRING
  }, {
    tableName: "students",
    timestamps: true
  });

  Student.associate = (models) => {
    Student.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });

    Student.hasMany(models.StudentTestResult, {
      foreignKey: "studentId",
      as: "testResults"
    });

    Student.hasMany(models.StudentSkill, {
      foreignKey: "studentId",
      as: "skills"
    });
  };

  return Student;
};
