const Sequelize = require("sequelize");
const sequelize = require("../configs/database");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require("./userModel")(sequelize, Sequelize.DataTypes);
db.Student = require("./studentModel")(sequelize, Sequelize.DataTypes);
db.Company = require("./companyModel")(sequelize, Sequelize.DataTypes);
db.AuthProvider = require("./authProviderModel")(sequelize, Sequelize.DataTypes);
db.RefreshToken = require("./refreshTokenModel")(sequelize, Sequelize.DataTypes);
db.Blog = require("./blogModel")(sequelize, Sequelize.DataTypes);
db.Comment = require("./commentModel")(sequelize, Sequelize.DataTypes);
db.Like = require("./likeModel")(sequelize, Sequelize.DataTypes);
db.Follow = require("./followModel")(sequelize, Sequelize.DataTypes);
db.Message = require("./messageModel")(sequelize, Sequelize.DataTypes);
db.Conversation = require("./conversationModel")(sequelize, Sequelize.DataTypes);
db.Notification = require("./notificationModel")(sequelize, Sequelize.DataTypes);
db.CareerPath = require("./careerPathModel")(sequelize, Sequelize.DataTypes);
db.Lesson = require("./lessonModel")(sequelize, Sequelize.DataTypes);
db.Test = require("./testModel")(sequelize, Sequelize.DataTypes);
db.StudentTestResult = require("./studentTestResultModel")(sequelize, Sequelize.DataTypes);
db.StudentProgress = require("./studentProgressModel")(sequelize, Sequelize.DataTypes);
db.ChallengeTest = require("./challengeTestModel")(sequelize, Sequelize.DataTypes);
db.ChallengeSubmission = require("./challengeSubmission")(sequelize, Sequelize.DataTypes);
db.CareerTest = require("./careerTestModel")(sequelize, Sequelize.DataTypes);
db.Otp = require("./otpModel")(sequelize, Sequelize.DataTypes);
db.BlogMedia = require("./BlogMediaModel")(sequelize, Sequelize.DataTypes);
db.ChatSession = require("./chatSessionModel")(sequelize, Sequelize.DataTypes);
db.CourseSubmission = require("./courseSubmissionModel")(sequelize, Sequelize.DataTypes);
db.JobPosting = require("./jobPostingModel")(sequelize, Sequelize.DataTypes);
db.JobApplication = require("./jobApplicationModel")(sequelize, Sequelize.DataTypes);


// Setup associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// --- New associations for Course, Job Posting features ---
// CareerPath (Course) <-> Lesson, CourseSubmission, StudentProgress
db.CareerPath.hasMany(db.StudentProgress, { foreignKey: 'careerPathId', as: 'progressRecords' });
db.CareerPath.hasMany(db.CourseSubmission, { foreignKey: 'careerPathId', as: 'submissions' });

// Lesson <-> CareerPath, CourseSubmission
db.Lesson.hasMany(db.CourseSubmission, { foreignKey: 'lessonId', as: 'submissions' });

// CourseSubmission <-> Student, Lesson, CareerPath
db.CourseSubmission.belongsTo(db.Student, { foreignKey: 'studentId', as: 'student' });
db.CourseSubmission.belongsTo(db.Lesson, { foreignKey: 'lessonId', as: 'lesson' });
db.CourseSubmission.belongsTo(db.CareerPath, { foreignKey: 'careerPathId', as: 'careerPath' });

// Student <-> CourseSubmission, JobApplication
db.Student.hasMany(db.CourseSubmission, { foreignKey: 'studentId', as: 'courseSubmissions' });
db.Student.hasMany(db.JobApplication, { foreignKey: 'studentId', as: 'jobApplications' });

// JobPosting <-> Company, JobApplication
db.JobPosting.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.JobPosting.hasMany(db.JobApplication, { foreignKey: 'jobPostingId', as: 'applications' });

// JobApplication <-> JobPosting, Student
db.JobApplication.belongsTo(db.JobPosting, { foreignKey: 'jobPostingId', as: 'jobPosting' });
db.JobApplication.belongsTo(db.Student, { foreignKey: 'studentId', as: 'student' });

module.exports = db;
