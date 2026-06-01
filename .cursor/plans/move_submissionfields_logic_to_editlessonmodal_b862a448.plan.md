---
name: Move submissionFields logic to EditLessonModal
overview: Move the full Lesson form (type, theoryContent, taskDescription, submissionFields with Form.List) from CompanyCourseEdit into EditLessonModal, including legacy content migration, conditional rendering, and payload filtering.
todos:
  - id: update-lesson-type
    content: Update Lesson type in types.ts (add SubmissionField, SubmissionFieldType, type/theoryContent/taskDescription/rubric fields)
    status: completed
  - id: rewrite-edit-modal
    content: Rewrite EditLessonModal with Radio.Group type selector, conditional theoryContent/taskDescription/rubric/submissionFields Form.List
    status: completed
  - id: update-career-details-state
    content: Update lessonForm state shape in CareerPathDetails.tsx and migrate legacy in handleEditLesson
    status: completed
  - id: update-handle-update
    content: Update handleUpdateLesson to build correct payload with type, content fields, and submissionFields migration
    status: completed
isProject: false
---

## Plan: Upgrade EditLessonModal with Type + submissionFields

### Files to modify
1. [`TLCN_GROUP_FE/src/types/types.ts`](TLCN_GROUP_FE/src/types/types.ts) — Update `Lesson` type
2. [`TLCN_GROUP_FE/src/components/molecules/EditLessonModal/index.tsx`](TLCN_GROUP_FE/src/components/molecules/EditLessonModal/index.tsx) — Rewrite with Ant Design Form + Form.List
3. [`TLCN_GROUP_FE/src/components/pages/CareerPathDetails/CareerPathDetails.tsx`](TLCN_GROUP_FE/src/components/pages/CareerPathDetails/CareerPathDetails.tsx) — Update handlers

---

### Step 1: Update `Lesson` type in `types.ts`

Replace the existing `Lesson` type (lines 268-278) with the enriched version:

```typescript
// Lesson type matching backend response
export type SubmissionFieldType = "EXPLANATION" | "CODE" | "SQL_QUERY";

export type SubmissionField = {
  id: string;
  type: SubmissionFieldType;
  label: string;
  language?: string | null;
  required: boolean;
};

export type Lesson = {
  id: string;
  title: string;
  type?: "THEORY" | "TASK";         // optional — legacy lessons may not have this
  content?: string;                  // legacy field — map to theoryContent / taskDescription
  theoryContent?: string | null;
  taskDescription?: string | null;
  submissionFields?: SubmissionField[] | null;
  rubric?: string | null;
  order: number;
  careerPathId: string;
  createdAt: string;
  updatedAt?: string;
  tests?: Test[];
};
```

---

### Step 2: Rewrite `EditLessonModal/index.tsx`

Replace the entire file content. Key changes:

**Imports:**

```typescript
import React from 'react';
import { Button } from '../../atoms/Button/Button';
import { Form, Input, Select, Switch, Space, Radio } from 'antd';
import { Textarea } from '../../atoms/Textarea/Textarea';
```

**Props** — change `lessonForm` from `Record<string, any>` to typed interface:

```typescript
type EditLessonModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: EditLessonFormValues) => void;
    lessonForm: {
        title: string;
        order: number;
        type: "THEORY" | "TASK";
        theoryContent: string;
        taskDescription: string;
        rubric: string;
        submissionFields: SubmissionField[];
    };
    setLessonForm: React.Dispatch<React.SetStateAction<{
        title: string;
        order: number;
        type: "THEORY" | "TASK";
        theoryContent: string;
        taskDescription: string;
        rubric: string;
        submissionFields: SubmissionField[];
    }>>;
}
```

**LANGUAGES constant** inside the component file (or at top level, outside component):

```typescript
const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#",
  "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
  "HTML", "CSS", "SQL", "Shell", "Dart",
];
```

**Form.List block** — replace the old `content` Textarea and `order` Input with the full conditional form:

```tsx
<Form form={form} layout="vertical" onFinish={(values) => onSubmit(values as EditLessonFormValues)}>

    {/* title */}
    <Form.Item name="title" label="Tiêu đề bài giảng"
        rules={[{ required: true, message: 'Nhập tiêu đề bài giảng.' }]}>
        <Input placeholder="VD: Bài 1 - Giới thiệu ReactJS" />
    </Form.Item>

    {/* order */}
    <Form.Item name="order" label="Thứ tự">
        <Input type="number" min={1} />
    </Form.Item>

    {/* type — Radio.Group */}
    <Form.Item name="type" label="Loại bài giảng" initialValue="THEORY">
        <Radio.Group>
            <Radio value="THEORY">Lý thuyết</Radio>
            <Radio value="TASK">Bài tập</Radio>
        </Radio.Group>
    </Form.Item>

    {/* theory fields — only when type === THEORY */}
    {lessonTypeValue === 'THEORY' && (
        <Form.Item name="theoryContent" label="Nội dung lý thuyết">
            <Textarea placeholder="Nhập nội dung lý thuyết..." className="min-h-[150px]" />
        </Form.Item>
    )}

    {/* task fields — only when type === TASK */}
    {lessonTypeValue === 'TASK' && (
        <>
            <Form.Item name="taskDescription" label="Mô tả bài tập">
                <Textarea placeholder="Mô tả chi tiết bài tập..." className="min-h-[120px]" />
            </Form.Item>

            <Form.Item name="rubric" label="Rubric (tiêu chí chấm điểm)">
                <Textarea placeholder="VD: Hoàn thành đúng: 5đ, Code sạch: 5đ" className="min-h-[80px]" />
            </Form.Item>

            {/* submissionFields — Form.List */}
            <Form.Item label="Trường cần nộp">
                <Form.List name="submissionFields">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...rest }) => {
                                const fieldType = Form.useWatch({ name: [name, 'type'], form });

                                return (
                                    <Space key={key} align="start" className="mb-2 flex-wrap">
                                        {/* type selector */}
                                        <Form.Item {...rest} name={[name, 'type']} initialValue="EXPLANATION">
                                            <Select style={{ width: 140 }}
                                                onChange={(val) => {
                                                    if (val !== 'CODE') {
                                                        form.setFieldValue(['submissionFields', name, 'language'], null);
                                                    }
                                                }}>
                                                <Select.Option value="EXPLANATION">Giải thích</Select.Option>
                                                <Select.Option value="CODE">Code</Select.Option>
                                                <Select.Option value="SQL_QUERY">SQL</Select.Option>
                                            </Select>
                                        </Form.Item>

                                        {/* label */}
                                        <Form.Item {...rest} name={[name, 'label']}
                                            rules={[{ required: true, message: 'Nhập tên trường' }]}>
                                            <Input placeholder="VD: github_link" style={{ width: 160 }} />
                                        </Form.Item>

                                        {/* language — only if CODE */}
                                        {fieldType === 'CODE' && (
                                            <Form.Item {...rest} name={[name, 'language']}>
                                                <Select placeholder="Ngôn ngữ" style={{ width: 120 }} allowClear>
                                                    {LANGUAGES.map((l) => (
                                                        <Select.Option key={l} value={l}>{l}</Select.Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        )}

                                        {/* required toggle */}
                                        <Form.Item {...rest} name={[name, 'required']} valuePropName="checked" initialValue={true}>
                                            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
                                        </Form.Item>

                                        <Button type="text" danger onClick={() => remove(name)}>Xóa</Button>
                                    </Space>
                                );
                            })}

                            <Button type="dashed" onClick={() => add({
                                id: crypto.randomUUID(),
                                type: 'EXPLANATION',
                                label: '',
                                required: true,
                            })} block>
                                + Thêm trường nộp
                            </Button>
                        </>
                    )}
                </Form.List>
            </Form.Item>
        </>
    )}

    {/* Footer */}
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button variant="primary" htmlType="submit">Cập nhật</Button>
    </div>
</Form>
```

**Key design decisions:**

1. `form.validateFields()` is triggered implicitly by `htmlType="submit"` + `onFinish`. The `onFinish` callback receives fully validated `values` from AntD — no raw state manipulation.
2. `form.setFieldsValue()` in `useEffect` populates the form when the modal opens.
3. `Form.useWatch('type', form)` inside the `.map()` of `Form.List` tracks the per-row type field.
4. The `onSubmit` prop receives the validated `values` directly — the parent no longer needs to derive the payload from raw state.

---

### Step 3: Update `CareerPathDetails.tsx`

**3a. Update `lessonForm` initial state** (line 39):

```typescript
const [lessonForm, setLessonForm] = useState({
    title: '',
    order: 1,
    type: 'THEORY' as 'THEORY' | 'TASK',
    theoryContent: '',
    taskDescription: '',
    rubric: '',
    submissionFields: [] as SubmissionField[],
});
```

**3b. Update `handleEditLesson`** — migrate legacy `content` and legacy `submissionFields[]` strings:

```typescript
const handleEditLesson = (lesson: Lesson) => {
    // Legacy: map content -> theoryContent or taskDescription
    const migratedType: 'THEORY' | 'TASK' = (lesson as any).type ?? 'THEORY';
    const migratedContent = (lesson as any).content ?? '';
    const theoryContent = migratedType === 'THEORY' ? migratedContent : '';
    const taskDescription = migratedType === 'TASK' ? migratedContent : '';

    // Legacy: map string[] submissionFields to SubmissionField[]
    const migratedFields: SubmissionField[] = ((lesson as any).submissionFields ?? []).map((f: any) => {
        if (typeof f === 'string') {
            return { id: crypto.randomUUID(), type: 'EXPLANATION' as const, label: f, required: true };
        }
        return f as SubmissionField;
    });

    setLessonForm({
        title: lesson.title,
        order: lesson.order,
        type: migratedType,
        theoryContent,
        taskDescription,
        rubric: (lesson as any).rubric ?? '',
        submissionFields: migratedFields,
    });
    setShowEditLessonModal(true);
    setShowLessonDetailModal(false);
    setOpenDropdownId(null);
};
```

**3c. Update `handleUpdateLesson`** — send correct payload structure:

```typescript
const handleUpdateLesson = async () => {
    if (!editingLessonId || !lessonForm.title.trim()) {
        setToast({ message: 'Please enter lesson title!', type: 'warning' });
        return;
    }

    try {
        const payload: Record<string, any> = {
            title: lessonForm.title,
            order: lessonForm.order,
            type: lessonForm.type,
        };

        if (lessonForm.type === 'THEORY') {
            if (lessonForm.theoryContent) payload.theoryContent = lessonForm.theoryContent.trim();
        } else {
            if (lessonForm.taskDescription) payload.taskDescription = lessonForm.taskDescription.trim();
            if (lessonForm.rubric) payload.rubric = lessonForm.rubric.trim();
            // Migrate + filter empty labels
            const migrated = lessonForm.submissionFields.map((f) => {
                if (typeof f === 'string') {
                    return { id: crypto.randomUUID(), type: 'EXPLANATION', label: f, required: true };
                }
                return f;
            });
            payload.submissionFields = migrated.filter((f) => f.label?.trim() !== '');
        }

        await updateLesson(editingLessonId, payload);

        setToast({ message: 'Lesson updated successfully!', type: 'success' });
        setShowEditLessonModal(false);
        setEditingLessonId(null);
        setLessonForm({ title: '', order: 1, type: 'THEORY', theoryContent: '', taskDescription: '', rubric: '', submissionFields: [] });

        if (id) await loadTestDetails(id);
    } catch (error) {
        setToast({ message: 'Failed to update lesson.', type: 'error' });
    }
};
```

---

### Summary of Changes

| File | Changes |
|---|---|
| `src/types/types.ts` | Add `SubmissionFieldType`, `SubmissionField`; extend `Lesson` with `type?`, `theoryContent?`, `taskDescription?`, `submissionFields?`, `rubric?` |
| `src/components/molecules/EditLessonModal/index.tsx` | Rewrite full form: `order`, `type` (Radio.Group), conditional `theoryContent`/`taskDescription`+`rubric`+Form.List, submit calls `onSubmit(values)` |
| `src/components/pages/CareerPathDetails/CareerPathDetails.tsx` | Update `lessonForm` state shape, migrate legacy in `handleEditLesson`, update `handleUpdateLesson` payload |
