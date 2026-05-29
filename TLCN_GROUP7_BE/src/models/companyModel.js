module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define("Company", {
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

    companyName: {
      type: DataTypes.STRING,
      allowNull: false
    },

    taxCode: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true
    },

    industry: DataTypes.STRING,
    website: DataTypes.STRING,
    description: DataTypes.TEXT,
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: "companies",
    timestamps: true
  });

  Company.associate = (models) => {
    Company.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });

    Company.hasMany(models.CareerPath, {
      foreignKey: "companyId",
      as: "careerPaths"
    });
  };

  return Company;
};
