# Database Schema

> Nguồn: quét toàn bộ file trong `TLCN_GROUP7_BE/src/models/` và phần associations trong `models/index.js`.
> Công nghệ: Sequelize ORM.

---

## User

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| email | STRING | UNIQUE, NOT NULL | |
| username | STRING | UNIQUE, NULL | |
| fullName | STRING | NULL | |
| avatar | STRING(500) | NULL | |
| address | STRING(255) | NULL | |
| role | ENUM('STUDENT', 'COMPANY', 'ADMIN') | NULL | |
| isActive | BOOLEAN | DEFAULT true | |
| verifyStatus | ENUM('INVALID', 'UNVERIFIED', 'VERIFIED') | DEFAULT 'UNVERIFIED', NOT NULL | |
| createdDate | DATE | DEFAULT NOW | |

**Bảng:** `users` | **Timestamps:** true | **Paranoid:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| AuthProvider | hasMany | userId | |
| RefreshToken | hasMany | userId | |
| Student | hasOne | userId | alias: student |
| Company | hasOne | userId | alias: company |

---

## Student

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| major | STRING | NULL | |
| school | STRING | NULL | |

**Bảng:** `students` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | alias: user |
| StudentTestResult | hasMany | studentId | alias: testResults |

---

## Company

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| companyName | STRING | NOT NULL | |
| taxCode | STRING(20) | UNIQUE, NULL | |
| industry | STRING | NULL | |
| website | STRING | NULL | |
| description | TEXT | NULL | |
| logo | STRING | NULL | |

**Bảng:** `companies` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | alias: user |
| CareerPath | hasMany | companyId | alias: careerPaths |
| ChallengeTest | hasMany | companyId | |

---

## AuthProvider

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| provider | ENUM('LOCAL', 'GOOGLE') | NOT NULL | |
| providerId | STRING | NULL | |
| password | STRING | NULL | Chỉ dùng khi provider = LOCAL |

**Bảng:** `auth_providers` | **Indexes:** UNIQUE(provider, providerId)

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | |

---

## RefreshToken

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| token | STRING | NOT NULL | |
| expiresAt | DATE | NOT NULL | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE, ON UPDATE CASCADE | |

**Bảng:** `refresh_tokens`

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | |

---

## Blog

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| content | TEXT | NULL | Cho phép bài chỉ có ảnh/video |
| category | STRING | NULL | |
| status | ENUM('draft', 'published', 'hidden') | DEFAULT 'published' | |
| authorId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | |

**Bảng:** `blogs` | **Timestamps:** true | **Paranoid:** true (soft delete)

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | authorId | alias: author |
| BlogMedia | hasMany | blogId | alias: media, ON DELETE CASCADE |
| Comment | hasMany | postId | alias: comments |
| Like | hasMany | postId | alias: likes |

---

## Comment

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| content | TEXT | NOT NULL | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | |
| postId | UUID | NOT NULL, FK(blogs.id), ON DELETE CASCADE | |
| parentId | UUID | NULL, FK(comments.id), ON DELETE CASCADE | Dùng cho bình luận trả lời |

**Bảng:** `comments` | **Timestamps:** true | **Paranoid:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | alias: author |
| Blog | belongsTo | postId | |
| Comment (self) | belongsTo | parentId | alias: parent |
| Comment (self) | hasMany | parentId | alias: replies |
| Like | hasMany | commentId | |

---

## Like

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |

**Bảng:** `likes` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | |
| Blog | belongsTo | postId | Like có thể thuộc bài viết |
| Comment | belongsTo | commentId | Hoặc thuộc bình luận |

---

## Follow

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| followerId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | Người theo dõi |
| followingId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | Người được theo dõi |

**Bảng:** `follows` | **Indexes:** UNIQUE(followerId, followingId) tên unique_follow

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | followerId | alias: follower |
| User | belongsTo | followingId | alias: following |

---

## Conversation

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| type | ENUM('PRIVATE', 'GROUP') | DEFAULT 'PRIVATE' | |

**Bảng:** `conversations` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsToMany | conversationId (qua ConversationMembers) | Qua bảng trung gian |
| Message | hasMany | conversationId | |

---

## Message

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| content | TEXT | NOT NULL | |
| type | ENUM('TEXT', 'IMAGE', 'FILE', 'DELETED') | DEFAULT 'TEXT' | |
| senderId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | |
| conversationId | UUID | NOT NULL, FK(conversations.id), ON DELETE CASCADE | |

**Bảng:** `messages` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | senderId | alias: sender |
| Conversation | belongsTo | conversationId | |

---

## Notification

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | Người nhận thông báo |
| message | STRING | NOT NULL | |
| type | ENUM('SYSTEM', 'FOLLOW', 'COMMENT', 'LIKE', 'REPLY', 'MESSAGE') | DEFAULT 'SYSTEM' | |
| isRead | BOOLEAN | DEFAULT false | |
| blogId | UUID | NULL, FK(blogs.id), ON DELETE CASCADE | |
| commentId | UUID | NULL, FK(comments.id), ON DELETE CASCADE | |
| actorId | UUID | NULL, FK(users.id), ON DELETE SET NULL | Người thực hiện hành động |
| conversationId | UUID | NULL, FK(conversations.id), ON DELETE CASCADE | |
| messageId | UUID | NULL, FK(messages.id), ON DELETE CASCADE | |

**Bảng:** `notifications` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | alias: user (người nhận) |
| User | belongsTo | actorId | alias: actor (người thực hiện) |
| Blog | belongsTo | blogId | alias: blog |
| Comment | belongsTo | commentId | alias: comment |

---

## Otp

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| userId | UUID | NOT NULL, FK(users.id), ON DELETE CASCADE | |
| otp | STRING(10) | NOT NULL | Mã OTP gửi cho người dùng |
| purpose | ENUM('FORGOT_PASSWORD', 'EMAIL_VERIFICATION', 'OTHER') | DEFAULT 'FORGOT_PASSWORD', NOT NULL | Mục đích sử dụng OTP |
| expiresAt | DATE | NOT NULL | Thời gian hết hạn |
| used | BOOLEAN | DEFAULT false | Đã sử dụng hay chưa |

**Bảng:** `otps` | **Timestamps:** true | **Paranoid:** true | **Indexes:** userId, purpose, expiresAt

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| User | belongsTo | userId | alias: user |

---

## CareerPath

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| title | STRING | NOT NULL | |
| description | TEXT | NULL | |
| image | STRING | NULL | |
| status | ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') | DEFAULT 'DRAFT', NOT NULL | |
| companyId | UUID | NOT NULL, FK(companies.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| level | ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') | NULL | |
| category | STRING | NULL | |
| publishedAt | DATE | NULL | |
| isFeatured | BOOLEAN | DEFAULT false, NOT NULL | |

**Bảng:** `career_paths` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Company | belongsTo | companyId | alias: company |
| Lesson | hasMany | careerPathId | alias: lessons |
| Test | hasMany | careerPathId | alias: tests |
| StudentProgress | hasMany | careerPathId | alias: progressRecords |
| CourseSubmission | hasMany | careerPathId | alias: submissions |

---

## Lesson

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| title | STRING | NOT NULL | |
| content | TEXT | NULL | Nội dung bài học |
| order | INTEGER | NULL | Thứ tự trong lộ trình |
| careerPathId | UUID | FK(career_paths.id), ON DELETE CASCADE | |
| type | ENUM('TASK', 'THEORY') | NULL | |
| theoryContent | TEXT | NULL | |
| taskDescription | TEXT | NULL | |
| submissionFields | JSON | NULL | |
| attachments | JSON | NULL | |
| referenceLinks | JSON | NULL | |
| rubric | TEXT | NULL | |

**Bảng:** `lessons` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| CareerPath | belongsTo | careerPathId | alias: careerPath |
| Test | hasMany | lessonId | |
| CourseSubmission | hasMany | lessonId | alias: submissions |

---

## Test

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| title | STRING | NOT NULL | |
| description | TEXT | NULL | |
| type | ENUM('MINI', 'FINAL_PATH') | NOT NULL | |
| content | TEXT('long') | NULL | Đề bài dạng text tự do |
| maxScore | FLOAT | DEFAULT 100 | |
| lessonId | UUID | NULL, FK(lessons.id), ON DELETE CASCADE, ON UPDATE CASCADE | Có thể null nếu là FINAL_PATH |
| careerPathId | UUID | NULL, FK(career_paths.id), ON DELETE CASCADE, ON UPDATE CASCADE | Có thể null nếu là MINI |

**Bảng:** `tests` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Lesson | belongsTo | lessonId | alias: lesson |
| CareerPath | belongsTo | careerPathId | alias: careerPath |
| StudentTestResult | hasMany | testId | |

---

## StudentTestResult

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| score | FLOAT | NULL | |
| testId | UUID | NOT NULL, FK(tests.id), ON DELETE CASCADE | |
| studentId | UUID | NOT NULL, FK(students.id), ON DELETE CASCADE | |
| answers | JSON | NULL | Mảng câu trả lời: [{questionId, answer}] |
| feedback | TEXT | NULL | Phản hồi từ AI grading |
| aiGrading | JSON | NULL | Kết quả chấm điểm đầy đủ |
| passed | BOOLEAN | NULL | Sinh viên có đạt không |
| completedAt | DATE | NULL | Thời gian hoàn thành bài test |
| lessonId | UUID | NULL, FK(lessons.id), ON DELETE CASCADE, ON UPDATE CASCADE | |

**Bảng:** `student_test_results` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Student | belongsTo | studentId | alias: student |
| Test | belongsTo | testId | alias: test |

---

## StudentProgress

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| status | ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') | DEFAULT 'NOT_STARTED' | |
| currentLessonId | UUID | NULL, FK(lessons.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| lastCompletedLessonId | UUID | NULL, FK(lessons.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| careerPathId | UUID | FK(career_paths.id) | Khai báo qua association |
| studentId | UUID | FK(students.id) | Khai báo qua association |

**Bảng:** `student_progress` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Student | belongsTo | studentId | alias: student |
| CareerPath | belongsTo | careerPathId | alias: careerPath |

---

## ChatSession

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | |
| studentId | UUID | NOT NULL, FK(students.id), ON DELETE CASCADE, UNIQUE | Mỗi sinh viên có một session |
| title | STRING(255) | NOT NULL, DEFAULT 'Trò chuyện với AI' | |
| messages | JSON | NOT NULL, DEFAULT [] | Format: [{role, content, timestamp}] |
| studentContext | JSON | NULL | Snapshot tiến độ học tập khi tạo session |
| isActive | BOOLEAN | NOT NULL, DEFAULT true | |

**Bảng:** `chat_sessions` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Student | belongsTo | studentId | alias: student |

---

## ChallengeTest

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| title | STRING | NOT NULL | |
| image | STRING | NULL | |
| fileUrl | STRING | NULL | |
| description | TEXT | NULL | |
| deadline | DATE | NULL | |
| maxScore | FLOAT | DEFAULT 100 | |
| companyId | UUID | FK(companies.id) | Khai báo qua association |

**Bảng:** `challenge_tests` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Company | belongsTo | companyId | |
| ChallengeSubmission | hasMany | challengeTestId | |

---

## ChallengeSubmission

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| submittedFile | STRING | NULL | Link file zip upload |
| submittedCode | TEXT | NULL | Nếu là coding trực tiếp |
| score | FLOAT | NULL | |
| feedback | TEXT | NULL | |
| challengeTestId | UUID | FK(challenge_tests.id) | Khai báo qua association |
| studentId | UUID | FK(students.id) | Khai báo qua association |

**Bảng:** `challenge_submissions` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| ChallengeTest | belongsTo | challengeTestId | |
| Student | belongsTo | studentId | |

---

## CareerTest

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| title | STRING | DEFAULT 'Bài trắc nghiệm định hướng nghề nghiệp' | |
| description | TEXT | DEFAULT 'Bài test giúp xác định chuyên ngành phù hợp với sinh viên dựa trên sở thích và năng lực.' | |
| questions | JSON | NOT NULL | Lưu toàn bộ danh sách câu hỏi |

**Bảng:** `career_tests` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

> Không có khai báo associate trong model.

---

## CourseSubmission

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| studentId | UUID | NOT NULL, FK(students.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| lessonId | UUID | NOT NULL, FK(lessons.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| careerPathId | UUID | NOT NULL, FK(career_paths.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| submissionData | JSON | NULL | |
| score | DECIMAL(5,2) | NULL | |
| aiGrading | JSON | NULL | |
| status | ENUM('SUBMITTED', 'GRADED') | DEFAULT 'SUBMITTED', NOT NULL | |
| submittedAt | DATE | NULL | |
| gradedAt | DATE | NULL | |

**Bảng:** `course_submissions` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Student | belongsTo | studentId | alias: student |
| Lesson | belongsTo | lessonId | alias: lesson |
| CareerPath | belongsTo | careerPathId | alias: careerPath |

---

## BlogMedia

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| blogId | UUID | NOT NULL, FK(blogs.id), ON DELETE CASCADE | |
| url | STRING | NULL | |
| type | ENUM('image', 'file') | NOT NULL | |
| originalName | STRING | NULL | |
| mimeType | STRING | NULL | |
| size | INTEGER | NULL | |
| status | ENUM('pending', 'uploaded', 'error') | DEFAULT 'pending' | |
| publicId | STRING | NULL | |

**Bảng:** `blog_medias` | **Timestamps:** true | **Paranoid:** false

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Blog | belongsTo | blogId | alias: blog |

---

## JobPosting

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| companyId | UUID | NOT NULL, FK(companies.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| title | STRING | NOT NULL | |
| description | TEXT | NULL | |
| skillRequirements | JSON | NULL | |
| location | STRING | NULL | |
| salaryMin | DECIMAL(15,2) | NULL | |
| salaryMax | DECIMAL(15,2) | NULL | |
| employmentType | ENUM('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT') | NULL | |
| experienceLevel | ENUM('FRESHER', 'JUNIOR', 'MIDIOR', 'SENIOR') | NULL | |
| deadline | DATE | NULL | |
| requiredDocuments | JSON | NULL | |
| status | ENUM('OPEN', 'CLOSED', 'DRAFT') | DEFAULT 'DRAFT', NOT NULL | |
| viewCount | INTEGER | DEFAULT 0, NOT NULL | |

**Bảng:** `job_postings` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| Company | belongsTo | companyId | alias: company |
| JobApplication | hasMany | jobPostingId | alias: applications |

---

## JobApplication

| Tên Cột | Kiểu Dữ Liệu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT UUIDV4 | |
| jobPostingId | UUID | NOT NULL, FK(job_postings.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| studentId | UUID | NOT NULL, FK(students.id), ON DELETE CASCADE, ON UPDATE CASCADE | |
| coverLetter | TEXT | NULL | |
| status | ENUM('PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED') | DEFAULT 'PENDING', NOT NULL | |
| appliedAt | DATE | NULL | |

**Bảng:** `job_applications` | **Timestamps:** true

### Quan hệ khóa ngoại (Associations)

| Bảng liên kết | Loại quan hệ | Foreign Key | Ghi chú |
|---|---|---|---|
| JobPosting | belongsTo | jobPostingId | alias: jobPosting |
| Student | belongsTo | studentId | alias: student |

---

## Tổng hợp quan hệ (Relationship Summary)

### Sơ đồ quan hệ chính

```
User
 ├── Student (1:1)
 ├── Company (1:1)
 ├── AuthProvider (1:N)
 ├── RefreshToken (1:N)
 ├── Blog (1:N, qua authorId)
 ├── Comment (1:N, qua userId)
 ├── Like (1:N, qua userId)
 ├── Follow (1:N, qua followerId / followingId)
 ├── Message (1:N, qua senderId)
 └── Notification (1:N, qua userId / actorId)

Student
 ├── StudentTestResult (1:N)
 ├── StudentProgress (1:N)
 ├── ChatSession (1:1)
 ├── ChallengeSubmission (1:N)
 ├── CourseSubmission (1:N)
 └── JobApplication (1:N)

Company
 ├── CareerPath (1:N)
 └── ChallengeTest (1:N)

Blog
 ├── BlogMedia (1:N)
 ├── Comment (1:N, qua postId)
 └── Like (1:N, qua postId)

Comment
 ├── Comment (self, 1:N, qua parentId)
 └── Like (1:N, qua commentId)

Conversation
 └── Message (1:N)

CareerPath
 ├── Lesson (1:N)
 ├── Test (1:N)
 ├── StudentProgress (1:N)
 └── CourseSubmission (1:N)

Lesson
 ├── Test (1:N)
 └── CourseSubmission (1:N)

Test
 └── StudentTestResult (1:N)

ChallengeTest
 └── ChallengeSubmission (1:N)

JobPosting
 └── JobApplication (1:N)
```

### Bảng trung gian (Implicit)

| Bảng | Kiểu | Từ | Qua |
|---|---|---|---|
| ConversationMembers | belongsToMany | Conversation ↔ User | belongsToMany |

### Các ràng buộc ENUM tổng hợp

| Tên cột / Trường | Các giá trị ENUM |
|---|---|
| users.role | 'STUDENT', 'COMPANY', 'ADMIN' |
| users.verifyStatus | 'INVALID', 'UNVERIFIED', 'VERIFIED' |
| auth_providers.provider | 'LOCAL', 'GOOGLE' |
| blogs.status | 'draft', 'published', 'hidden' |
| messages.type | 'TEXT', 'IMAGE', 'FILE', 'DELETED' |
| conversations.type | 'PRIVATE', 'GROUP' |
| notifications.type | 'SYSTEM', 'FOLLOW', 'COMMENT', 'LIKE', 'REPLY', 'MESSAGE' |
| otps.purpose | 'FORGOT_PASSWORD', 'EMAIL_VERIFICATION', 'OTHER' |
| career_paths.status | 'DRAFT', 'PUBLISHED', 'ARCHIVED' |
| career_paths.level | 'BEGINNER', 'INTERMEDIATE', 'ADVANCED' |
| lessons.type | 'TASK', 'THEORY' |
| tests.type | 'MINI', 'FINAL_PATH' |
| student_progress.status | 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED' |
| blog_medias.type | 'image', 'file' |
| blog_medias.status | 'pending', 'uploaded', 'error' |
| job_postings.employmentType | 'FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT' |
| job_postings.experienceLevel | 'FRESHER', 'JUNIOR', 'MIDIOR', 'SENIOR' |
| job_postings.status | 'OPEN', 'CLOSED', 'DRAFT' |
| job_applications.status | 'PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED' |
| course_submissions.status | 'SUBMITTED', 'GRADED' |
