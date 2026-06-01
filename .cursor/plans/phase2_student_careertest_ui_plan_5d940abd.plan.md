---
name: Phase2 Student CareerTest UI Plan
overview: "Tạo file plan Phase2_Student_CareerTest_UI.plan.md mô tả chi tiết 5 bước xây dựng giao diện làm bài Career Test dành cho Sinh viên trên Frontend (React/TypeScript), bao gồm: khởi tạo component, logic API, UI form, UI kết quả, và cập nhật router."
todos:
  - id: analyze
    content: "Phân tích hiện trạng: thiếu route, thiếu component, thiếu API methods"
    status: completed
  - id: step1-api
    content: "Mở rộng careerTestApi.ts với 3 method: getCareerTestById, enrollCareerTest, submitCareerTest"
    status: completed
  - id: step2-skeleton
    content: Tạo file StudentCareerTestPage.tsx với skeleton component và state
    status: completed
  - id: step3-logic
    content: Viết logic useEffect lấy đề, hàm enroll, hàm submit
    status: completed
  - id: step4-ui-form
    content: "Build UI Form: Radio.Group (MULTIPLE_CHOICE), Input.TextArea (SHORT_ANSWER), loading spinner"
    status: completed
  - id: step5-ui-result
    content: "Build UI Kết quả: score, feedback, details (đúng/sai/explanation), suggestions (nếu có)"
    status: completed
  - id: step6-router
    content: Thêm import và khai báo route /career-tests/:id/take trong index.tsx
    status: completed
isProject: false
---

# Phase 2: Giao diện làm bài Career Test cho Sinh viên

## 1. Phân tích hiện trạng

### 1.1. Thiếu hụt trong `index.tsx`

File [TLCN_GROUP_FE/src/routes/Approutes/index.tsx](TLCN_GROUP_FE/src/routes/Approutes/index.tsx) hiện tại hoàn toàn **không có route** dành cho sinh viên làm bài Career Test. Cụ thể:

- **Route `/career-tests/:id/take`** — chưa được khai báo.
- **Component `StudentCareerTestPage`** — chưa được import.

Trong khi đó, backend tại [TLCN_GROUP7_BE/src/routes/careerTestRoute.js](TLCN_GROUP7_BE/src/routes/careerTestRoute.js) đã expose đầy đủ các endpoint REST:

| Method | Route | Handler | Mô tả |
|---|---|---|---|
| `GET` | `/career-tests/:id` | `getById` | Lấy chi tiết đề bài |
| `POST` | `/career-tests/:id/enroll` | `enroll` | Sinh viên đăng ký làm bài |
| `POST` | `/career-tests/:id/submit` | `submitNew` | Sinh viên nộp bài |

### 1.2. Thiếu hụt trong `careerTestApi.ts`

File [TLCN_GROUP_FE/src/api/careerTestApi.ts](TLCN_GROUP_FE/src/api/careerTestApi.ts) hiện chỉ có 3 method legacy (`getTest`, `submitTest`, `updateMajor`) dùng cho bài trắc nghiệm cũ. **Không có** các method gọi `GET /career-tests/:id`, `POST /career-tests/:id/enroll`, và `POST /career-tests/:id/submit`.

### 1.3. Thiếu Component page

Không tồn tại file `StudentCareerTestPage.tsx` hay bất kỳ component nào phục vụ việc sinh viên làm bài Career Test theo đúng format API mới (UUID-based, có `enroll` trước khi `submit`).

---

## 2. Các bước thi công

### Bước 1 — Mở rộng `careerTestApi.ts`

**File:** `TLCN_GROUP_FE/src/api/careerTestApi.ts`

Thêm 3 method API mới:

```typescript
// Lấy chi tiết đề bài theo UUID
getCareerTestById: async (id: string): Promise<any> => {
  const response = await apiClient.get(`/career-tests/${id}`);
  return response;
},

// Sinh viên đăng ký làm bài
enrollCareerTest: async (testId: string): Promise<any> => {
  const response = await apiClient.post(`/career-tests/${testId}/enroll`);
  return response;
},

// Sinh viên nộp bài (gửi mảng answers)
submitCareerTest: async (testId: string, answers: any[]): Promise<any> => {
  const response = await apiClient.post(`/career-tests/${testId}/submit`, { answers });
  return response;
}
```

---

### Bước 2 — Khởi tạo Component `StudentCareerTestPage.tsx`

**File mới:** `TLCN_GROUP_FE/src/pages/CareerTest/StudentCareerTestPage.tsx`

Tạo file với cấu trúc thư mục `pages/CareerTest/` (tương tự `pages/Course/`, `pages/Admin/`, `pages/Company/`).

**Skeleton thành phần:**

```typescript
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Result, Card, Radio, Input, Button, Progress, message } from "antd";
import { careerTestApi } from "../../api/careerTestApi";

type Question = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  question: string;
  options?: string[];   // MULTIPLE_CHOICE
  points?: number;
};

type GradingDetail = {
  questionIndex: number;
  type: string;
  maxPoints: number;
  earnedPoints: number;
  isCorrect: boolean;
  explanation: string;
};

type SubmitResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  feedback: string;
  details: GradingDetail[];
  suggestions: any[];   // có thể rỗng
};

const StudentCareerTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái làm bài
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái kết quả
  const [result, setResult] = useState<SubmitResult | null>(null);

  // ...
};

export default StudentCareerTestPage;
```

---

### Bước 3 — Thiết lập Logic API trong `StudentCareerTestPage.tsx`

#### 3a. `useEffect` lấy đề bài

```typescript
useEffect(() => {
  if (!id) return;
  const fetchTest = async () => {
    try {
      setLoading(true);
      const data = await careerTestApi.getCareerTestById(id);
      setTestData(data);
      setQuestions(data.questions || []);
    } catch {
      message.error("Không tải được đề bài.");
    } finally {
      setLoading(false);
    }
  };
  fetchTest();
}, [id]);
```

#### 3b. Hàm gọi `POST /career-tests/:id/enroll`

```typescript
const handleStart = async () => {
  if (!id) return;
  try {
    await careerTestApi.enrollCareerTest(id);
    message.success("Đăng ký thành công! Bắt đầu làm bài.");
  } catch {
    message.error("Đăng ký thất bại. Vui lòng thử lại.");
  }
};
```

#### 3c. Hàm gọi `POST /career-tests/:id/submit`

```typescript
const handleSubmit = async () => {
  if (!id) return;
  if (Object.keys(answers).length < questions.length) {
    message.warning("Vui lòng trả lời tất cả câu hỏi.");
    return;
  }
  try {
    setSubmitting(true);
    const payload = Object.entries(answers).map(([idx, ans]) => ({
      questionIndex: Number(idx),
      answer: ans,
    }));
    const res = await careerTestApi.submitCareerTest(id, payload);
    setResult(res);
  } catch {
    message.error("Nộp bài thất bại.");
  } finally {
    setSubmitting(false);
  }
};
```

---

### Bước 4 — Build UI Form (Ant Design)

**File:** `TLCN_GROUP_FE/src/pages/CareerTest/StudentCareerTestPage.tsx`

Dùng Ant Design components. Bố cục gồm: header thông tin bài test → progress bar → danh sách câu hỏi → footer với nút Nộp bài.

#### 4a. Câu hỏi MULTIPLE_CHOICE — dùng `Radio.Group`

```typescript
<Radio.Group
  value={answers[index]}
  onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
  className="w-full"
>
  <Space direction="vertical" className="w-full">
    {q.options?.map((opt, i) => (
      <Radio key={i} value={String.fromCharCode(65 + i)} className="text-lg py-2 px-4 border rounded-lg w-full">
        {opt}
      </Radio>
    ))}
  </Space>
</Radio.Group>
```

#### 4b. Câu hỏi SHORT_ANSWER — BẮT BUỘC dùng `Input.TextArea`

```typescript
<Input.TextArea
  value={answers[index] || ""}
  onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
  placeholder="Nhập câu trả lời của bạn..."
  rows={4}
  className="text-base"
/>
```

#### 4c. Loading khi AI đang chấm

```typescript
{submitting && (
  <div className="flex flex-col items-center justify-center py-12 gap-4">
    <Spin size="large" />
    <p className="text-gray-600 text-lg">AI đang chấm bài, vui lòng chờ...</p>
  </div>
)}
```

---

### Bước 5 — Build UI Kết quả

**File:** `TLCN_GROUP_FE/src/pages/CareerTest/StudentCareerTestPage.tsx`

Sau khi `result !== null`, hiển thị màn hình kết quả thay cho form:

#### 5a. Tổng quan kết quả

```typescript
<Card className="mb-6">
  <h2 className="text-2xl font-bold mb-4">Kết quả bài test</h2>
  <p><strong>Điểm:</strong> {result.score} / 100</p>
  <p><strong>Đúng:</strong> {result.correctCount} / {result.totalQuestions}</p>
  <p><strong>Nhận xét:</strong> {result.feedback}</p>
</Card>
```

#### 5b. Chi tiết từng câu (lặp qua mảng `details`)

```typescript
{result.details.map((detail, idx) => (
  <Card
    key={idx}
    className={`mb-4 border-l-4 ${
      detail.isCorrect ? "border-green-500" : "border-red-500"
    }`}
  >
    <h4 className="font-semibold mb-2">
      Câu {idx + 1} — {detail.type === "MULTIPLE_CHOICE" ? "Trắc nghiệm" : "Tự luận"}
    </h4>
    <p className="mb-2">{questions[detail.questionIndex]?.question}</p>
    <p className={`font-medium ${detail.isCorrect ? "text-green-600" : "text-red-600"}`}>
      {detail.isCorrect ? "✓ Đúng" : "✗ Sai"} — {detail.earnedPoints}/{detail.maxPoints} điểm
    </p>
    <p className="text-gray-600 mt-2 italic">{detail.explanation}</p>
  </Card>
))}
```

#### 5c. Danh sách gợi ý (chỉ hiển thị nếu mảng `suggestions` có dữ liệu)

```typescript
{result.suggestions && result.suggestions.length > 0 && (
  <Card title="Gợi ý khóa học cải thiện" className="mt-6">
    <List
      dataSource={result.suggestions}
      renderItem={(item: any) => (
        <List.Item>
          <a href={`/courses/${item.id}`}>{item.title || item.name}</a>
        </List.Item>
      )}
    />
  </Card>
)}
```

---

### Bước 6 — Cập nhật Router `index.tsx`

**File:** `TLCN_GROUP_FE/src/routes/Approutes/index.tsx`

Thêm import và khai báo route mới:

```typescript
// Thêm import
import StudentCareerTestPage from "../../pages/CareerTest/StudentCareerTestPage";

// Trong <Routes>, thêm route mới (khuyến nghị đặt gần các route /career-paths):
<Route path="/career-tests/:id/take" element={<StudentCareerTestPage />} />
```

---

## 3. Tiêu chí nghiệm thu (Checklist)

- [ ] **Todo 1:** File `src/pages/CareerTest/StudentCareerTestPage.tsx` được tạo đúng cấu trúc thư mục, export default hợp lệ.
- [ ] **Todo 2:** `careerTestApi.ts` có đủ 3 method `getCareerTestById`, `enrollCareerTest`, `submitCareerTest`.
- [ ] **Todo 3:** `useEffect` gọi `GET /career-tests/:id` khi component mount — không có loading vô tận khi API lỗi.
- [ ] **Todo 4:** Form hiển thị đúng: `Radio.Group` cho `MULTIPLE_CHOICE`, `Input.TextArea` cho `SHORT_ANSWER`.
- [ ] **Todo 5:** Nút "Bắt đầu" gọi `POST /career-tests/:id/enroll` trước khi hiển thị form câu hỏi.
- [ ] **Todo 6:** Nút "Nộp bài" gọi `POST /career-tests/:id/submit` với đúng payload `{ answers: [...] }`.
- [ ] **Todo 7:** Loading spinner hiển thị khi `submitting === true` (AI đang chấm).
- [ ] **Todo 8:** Màn hình kết quả hiển thị: `score`, `passed`, `feedback` (nếu có).
- [ ] **Todo 9:** Mảng `details` được lặp qua, hiển thị đúng/sai và `explanation` từng câu.
- [ ] **Todo 10:** Mảng `suggestions` được kiểm tra `length > 0` trước khi render danh sách gợi ý.
- [ ] **Todo 11:** Route `/career-tests/:id/take` được khai báo trong `index.tsx` và `StudentCareerTestPage` được import.
- [ ] **Todo 12:** UI không bị vỡ layout khi `questions` rỗng hoặc API trả về unexpected shape.
