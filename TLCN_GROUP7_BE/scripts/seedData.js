require("dotenv").config();
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
faker.locale = "vi";

const seedData = async () => {
  let db = null;

  try {
    console.log("🌱 Khởi tạo danh sách tài khoản nền tảng...");
    db = require("../src/models");
    await db.sequelize.authenticate();
    
    // Xóa sạch dữ liệu cũ
    console.log("⚙️ Reset schema (force: true)...");
    await db.sequelize.sync({ force: true });

    const hashedPassword = await bcrypt.hash("123456", 10);

    // 1. TẠO ADMIN
    const adminUser = await db.User.create({
      username: "admin1",
      fullName: "Quản Trị Viên",
      email: "admin1@test.com",
      role: "ADMIN",
      verifyStatus: "VERIFIED",
      isActive: true,
      avatar: "https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff&size=200",
    });
    await db.AuthProvider.create({ userId: adminUser.id, provider: "LOCAL", password: hashedPassword });
    console.log("✅ Tạo xong Admin: admin1@test.com / 123456");

    // 2. TẠO 3 STUDENTS
    for (let i = 1; i <= 3; i++) {
      const u = await db.User.create({
        username: `student${i}`,
        fullName: `Sinh Viên ${i}`,
        email: `student${i}@test.com`,
        role: "STUDENT",
        verifyStatus: "VERIFIED",
        isActive: true,
        avatar: `https://ui-avatars.com/api/?name=SV${i}&background=random&size=200`,
      });
      await db.AuthProvider.create({ userId: u.id, provider: "LOCAL", password: hashedPassword });
      await db.Student.create({
        userId: u.id,
        major: "Công nghệ thông tin",
        school: "Đại học Sư phạm Kỹ thuật TP.HCM",
      });
      console.log(`✅ Tạo xong Student: student${i}@test.com / 123456`);
    }

    // 3. TẠO 4 COMPANIES
    const companyNames = ["FPT Software", "VNG Corporation", "Kyna English", "NashTech"];
    for (let i = 1; i <= 4; i++) {
      const cName = companyNames[i-1];
      const u = await db.User.create({
        username: `company${i}`,
        fullName: cName,
        email: `company${i}@test.com`,
        role: "COMPANY",
        verifyStatus: "VERIFIED",
        isActive: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=0D8ABC&color=fff&size=200`,
      });
      await db.AuthProvider.create({ userId: u.id, provider: "LOCAL", password: hashedPassword });
      await db.Company.create({
        userId: u.id,
        companyName: cName,
        taxCode: `TAX${Math.floor(Math.random() * 1000000)}`,
        industry: "Công nghệ thông tin",
        website: "https://example.com",
      });
      console.log(`✅ Tạo xong Company: company${i}@test.com / 123456`);
    }

    console.log("\n🎉 Khởi tạo tài khoản thành công! Database đã sạch sẽ.");
    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Lỗi khi seed tài khoản:", error.message);
    if (db && db.sequelize) {
      await db.sequelize.close().catch(() => {});
    }
    process.exit(1);
  }
};

seedData();