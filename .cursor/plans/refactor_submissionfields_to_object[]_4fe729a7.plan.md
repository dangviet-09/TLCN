---
name: Refactor submissionFields to Object[]
overview: Refactor `submissionFields` in the Lesson creation/edit modal from `String[]` (Select mode="tags") to `Object[]` using `Form.List`, with proper type/language conditional rendering, legacy migration, and payload filtering.
todos:
  - id: update-interfaces
    content: "Update TypeScript interfaces: SubmissionField, Lesson, LessonFormValues"
    status: completed
  - id: replace-form-list
    content: Replace Select mode='tags' with Form.List + per-row fields (type, label, language, required)
    status: completed
  - id: language-reset
    content: Add language reset logic when type changes away from CODE
    status: completed
  - id: migrate-payload
    content: Update payload builder to migrate legacy String[] and filter invalid objects
    status: completed
  - id: update-preview
    content: Update lesson list preview to display SubmissionField objects
    status: completed
  - id: add-constants
    content: Add LANGUAGES constant
    status: completed
isProject: false
---

## Plan: Refactor `submissionFields` from `String[]` → `Object[]`

### Files to modify
- [`TLCN_GROUP_FE/src/pages/Company/CompanyCourseEdit.tsx`](TLCN_GROUP_FE/src/pages/Company/CompanyCourseEdit.tsx)

---

### 1. Update TypeScript Interfaces

**`Lesson` interface** — change `submissionFields` from `string[] | null` to `SubmissionField[] | null`:

```typescript
export type SubmissionFieldType = "EXPLANATION" | "CODE" | "SQL_QUERY";

export interface SubmissionField {
  id: string;
  type: SubmissionFieldType;
  label: string;
  language?: string | null;
  required: boolean;
}

export interface Lesson {
  // ...
  submissionFields: SubmissionField[] | null;
  // ...
}
```

**`LessonFormValues` interface** — change `submissionFields` accordingly:

```typescript
interface LessonFormValues {
  // ...
  submissionFields?: SubmissionField[];
  // ...
}
```

---

### 2. Add `useWatch` for `language` field per Form.List item

Replace the existing `Select mode="tags"` block with a `Form.List` wrapping each field row:

```tsx
<Form.List name="submissionFields">
  {(fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...rest }) => {
        const fieldType = Form.useWatch({
          name: [name, "type"],
          form,
        });

        return (
          <Space key={key} align="start" className="mb-2">
            {/* type selector */}
            <Form.Item
              {...rest}
              name={[name, "type"]}
              initialValue="EXPLANATION"
            >
              <Select style={{ width: 140 }}>
                <Select.Option value="EXPLANATION">Giải thích</Select.Option>
                <Select.Option value="CODE">Code</Select.Option>
                <Select.Option value="SQL_QUERY">SQL</Select.Option>
              </Select>
            </Form.Item>

            {/* label */}
            <Form.Item
              {...rest}
              name={[name, "label"]}
              rules={[{ required: true, message: "Nhập tên trường" }]}
            >
              <Input placeholder="VD: github_link" style={{ width: 160 }} />
            </Form.Item>

            {/* language — only if type === CODE */}
            {fieldType === "CODE" && (
              <Form.Item {...rest} name={[name, "language"]}>
                <Select
                  placeholder="Ngôn ngữ"
                  style={{ width: 120 }}
                  allowClear
                >
                  {LANGUAGES.map((l) => (
                    <Select.Option key={l} value={l}>{l}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* required toggle */}
            <Form.Item {...rest} name={[name, "required"]} valuePropName="checked" initialValue>
              <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
            </Form.Item>

            <Button
              type="text"
              danger
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => remove(name)}
            />
          </Space>
        );
      })}

      <Button
        type="dashed"
        onClick={() =>
          add({ id: crypto.randomUUID(), type: "EXPLANATION", label: "", required: true })
        }
        block
        icon={<Plus className="w-4 h-4" />}
        className="mt-2"
      >
        Thêm trường nộp
      </Button>
    </>
  )}
</Form.List>
```

---

### 3. Handle `language` Reset on Type Change

In the `type` Select's `onChange`, reset `language` to `null`:

```tsx
onChange={(val) => {
  form.setFieldValue(["submissionFields", name, "type"], val);
  if (val !== "CODE") {
    form.setFieldValue(["submissionFields", name, "language"], null);
  }
}}
```

---

### 4. Migrate Legacy `String[]` Data in `handleCreateLesson`

When building the payload, migrate any string entries (legacy data) AND filter invalid objects:

```typescript
if (values.type === "TASK") {
  // ...
  const raw = values.submissionFields ?? [];
  const migrated = raw.map((f) => {
    if (typeof f === "string") {
      return {
        id: crypto.randomUUID(),
        type: "EXPLANATION" as const,
        label: f,
        required: true,
      };
    }
    return f;
  });
  payload.submissionFields = migrated.filter((f) => f.label?.trim() !== "");
}
```

---

### 5. Legacy Migration in `useEffect` (for Edit Flow)

Since there is **no separate edit modal yet** (only "Add Lesson" modal), this step is a forward-preparation safeguard. If the component later gets an edit flow, add a `useEffect` on `lesson` that checks:

```typescript
useEffect(() => {
  if (!lesson) return;
  if (lesson.submissionFields === null) return;
  const isLegacy = typeof lesson.submissionFields[0] === "string";
  if (isLegacy) {
    const migrated = lesson.submissionFields.map((f: string) => ({
      id: crypto.randomUUID(),
      type: "EXPLANATION" as const,
      label: f,
      required: true,
    }));
    form.setFieldsValue({ submissionFields: migrated });
  } else {
    form.setFieldsValue({ submissionFields: lesson.submissionFields });
  }
}, [lesson, form]);
```

---

### 6. Update Lesson List Preview

In the lesson list rendering, update the display to show field labels:

```tsx
{lesson.submissionFields && lesson.submissionFields.length > 0 && (
  <p className="text-xs">
    <span className="text-gray-400">Trường nộp: </span>
    {lesson.submissionFields.map((f) => {
      const label = typeof f === "string" ? f : f.label;
      const type = typeof f === "string" ? null : f.type;
      return `${label}${type === "CODE" ? ` (${f.language ?? "code"})` : ""}`;
    }).join(", ")}
  </p>
)}
```

---

### Summary of Changes

| Change | Location |
|---|---|
| Update interfaces (`SubmissionField`, `Lesson`, `LessonFormValues`) | Lines 21-61 |
| Replace `<Select mode="tags">` with `<Form.List>` + per-row fields | Lines 424-436 |
| Add `LANGUAGES` constant | Constants section |
| Update payload builder in `handleCreateLesson` | Lines 168-170 |
| Update lesson list preview rendering | Lines 330-335 |
