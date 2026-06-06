require("dotenv").config();
const Sequelize = require("sequelize");
const bcrypt = require("bcryptjs");

const seedData = async () => {
  let db = null;

  try {
    console.log("🌱 Bắt đầu seed dữ liệu vào Supabase...");

    console.log("\n🔗 Kết nối đến database...");
    db = require("../src/models");
    await db.sequelize.authenticate();
    console.log("✅ Kết nối database thành công");

    console.log("\n⚙️ Reset schema và sync database...");
    await db.sequelize.sync({ force: true });
    console.log("✅ Database schema đã được reset và sync thành công");

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    console.log("\n📝 Tạo Users + AuthProvider...");
    const studentUser = await db.User.create({
      username: "student1",
      fullName: "Nguyen Van A",
      email: "student1@test.com",
      role: "STUDENT",
      verifyStatus: "VERIFIED",
      isActive: true,
    });

    const companyUser = await db.User.create({
      username: "company1",
      fullName: "Tech Company Inc",
      email: "company1@test.com",
      role: "COMPANY",
      verifyStatus: "VERIFIED",
      isActive: true,
    });

    await db.AuthProvider.create({
      userId: studentUser.id,
      provider: "LOCAL",
      password: hashedPassword,
    });

    await db.AuthProvider.create({
      userId: companyUser.id,
      provider: "LOCAL",
      password: hashedPassword,
    });
    console.log("✅ Users và AuthProvider created");

    console.log("\n👨‍🎓 Tạo Student Profile...");
    const studentProfile = await db.Student.create({
      userId: studentUser.id,
      major: "Computer Science",
      school: "University of Technology",
    });
    console.log("✅ Student Profile created");

    console.log("\n🏢 Tạo Company Profile...");
    const company = await db.Company.create({
      userId: companyUser.id,
      companyName: "Tech Company Inc",
      industry: "Information Technology",
      website: "https://techcompany.com",
      description: "Leading tech company in Vietnam",
    });
    console.log("✅ Company Profile created");

    console.log("\n🛤️ Tạo Career Path + Lessons + Test...");
    const careerPath = await db.CareerPath.create({
      title: "Web Development",
      description: "Master web development from basics to advanced",
      image: "https://example.com/web-dev.jpg",
      status: "PUBLISHED",
      companyId: company.id,
    });

    const lesson1 = await db.Lesson.create({
      careerPathId: careerPath.id,
      title: "HTML Basics - Lesson 1",
      content: "<h2>Lesson 1</h2><p>HTML content here...</p>",
      order: 1,
    });

    await db.Lesson.create({
      careerPathId: careerPath.id,
      title: "HTML Basics - Lesson 2",
      content: "<h2>Lesson 2</h2><p>HTML content here...</p>",
      order: 2,
    });

    await db.Lesson.create({
      careerPathId: careerPath.id,
      title: "HTML Basics - Lesson 3",
      content: "<h2>Lesson 3</h2><p>HTML content here...</p>",
      order: 3,
    });

    await db.Test.create({
      title: "HTML Basics Quiz",
      description: "Test your HTML knowledge",
      type: "MINI",
      content: "What does HTML stand for?",
      maxScore: 100,
      lessonId: lesson1.id,
      careerPathId: careerPath.id,
    });
    console.log("✅ CareerPath, Lessons, Test created");

    console.log("\n💼 Tạo Job Posting & Skills...");
    await db.JobPosting.create({
      companyId: company.id,
      title: "Backend Developer (Node.js)",
      status: "OPEN",
      skillRequirements: [
        { skillName: "Node.js", level: "REQUIRED", minProficiency: 3 },
        { skillName: "React", level: "NICE_TO_HAVE", minProficiency: 2 }
      ],
      salaryMin: 15000000,
      salaryMax: 30000000,
      location: "Hồ Chí Minh, Việt Nam",
      employmentType: "FULL_TIME",
      experienceLevel: "JUNIOR",
      description: "Chúng tôi đang tìm kiếm một Backend Developer tham gia phát triển hệ thống lõi..."
    });

    await db.StudentSkill.create({
      studentId: studentProfile.id,
      skillName: "Node.js",
      score: 3
    });
    console.log("✅ Job Posting và Skills created");

    console.log("\n📝 Tạo Blogs + Comment + Like...");
    const blog1 = await db.Blog.create({
      content: "Welcome to Web Development. This is a sample blog post.",
      category: "career",
      status: "published",
      authorId: companyUser.id,
    });

    await db.Blog.create({
      content: "JavaScript tips and tricks for beginners.",
      category: "javascript",
      status: "published",
      authorId: companyUser.id,
    });

    await db.Comment.create({
      content: "Great article! Very helpful for beginners.",
      userId: studentUser.id,
      postId: blog1.id,
    });

    await db.Like.create({
      userId: studentUser.id,
      postId: blog1.id,
    });
    console.log("✅ Blogs, Comment, Like created");

    console.log("\n🎉 Seed dữ liệu hoàn tất thành công!");
    console.log("\n🔐 Thông tin đăng nhập:");
    console.log("  student1 / Password123!");
    console.log("  company1 / Password123!");

    await db.sequelize.close();
    process.exit(0);
 } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error.message);
    if (db && db.sequelize) await db.sequelize.close().catch(() => {});
    process.exit(1);
  }
};

seedData();
