module.exports = (sequelize, DataTypes) => {
  const StudentSkill = sequelize.define("StudentSkill", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },

    skillName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: "student_skills",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["studentId", "skillName"]
      }
    ]
  });

  return StudentSkill;
};
