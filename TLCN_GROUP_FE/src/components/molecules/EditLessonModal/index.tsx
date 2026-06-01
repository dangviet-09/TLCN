import React, { useEffect } from 'react';
import { Button } from '../../atoms/Button/Button';
import { Textarea } from '../../atoms/Textarea/Textarea';
import { Form, Input, Select, Switch, Space, Radio, Button as AntdButton } from 'antd';
import type { SubmissionField } from '../../../types/types';

export type EditLessonFormValues = {
  title: string;
  order: number;
  type: 'THEORY' | 'TASK';
  theoryContent: string;
  taskDescription: string;
  rubric: string;
  submissionFields: SubmissionField[];
};

type EditLessonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: EditLessonFormValues) => void;
  lessonForm: EditLessonFormValues;
  setLessonForm: React.Dispatch<React.SetStateAction<EditLessonFormValues>>;
};

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'SQL', 'Shell', 'Dart',
];

const EditLessonModal: React.FC<EditLessonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lessonForm,
  setLessonForm,
}) => {
  const [form] = Form.useForm<EditLessonFormValues>();

  // Sync props -> AntD form whenever modal opens or lessonForm changes
  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        title: lessonForm.title,
        order: lessonForm.order,
        type: lessonForm.type,
        theoryContent: lessonForm.theoryContent ?? '',
        taskDescription: lessonForm.taskDescription ?? '',
        rubric: lessonForm.rubric ?? '',
        submissionFields: lessonForm.submissionFields ?? [],
      });
    }
  }, [isOpen, lessonForm, form]);

  const lessonTypeValue = Form.useWatch('type', form) ?? lessonForm.type;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Lesson
          </h3>
          <Button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>
        </div>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => onSubmit(values as EditLessonFormValues)}
        >
          {/* Title */}
          <Form.Item
            name="title"
            label="Tiêu đề bài giảng"
            rules={[{ required: true, message: 'Nhập tiêu đề bài giảng.' }]}
          >
            <Input placeholder="VD: Bài 1 - Giới thiệu ReactJS" />
          </Form.Item>

          {/* Order */}
          <Form.Item name="order" label="Thứ tự">
            <Input type="number" min={1} />
          </Form.Item>

          {/* Type — Radio.Group */}
          <Form.Item name="type" label="Loại bài giảng" initialValue="THEORY">
            <Radio.Group>
              <Radio value="THEORY">Lý thuyết</Radio>
              <Radio value="TASK">Bài tập</Radio>
            </Radio.Group>
          </Form.Item>

          {/* Theory fields — only when type === THEORY */}
          {lessonTypeValue === 'THEORY' && (
            <Form.Item name="theoryContent" label="Nội dung lý thuyết">
              <Textarea
                placeholder="Nhập nội dung lý thuyết..."
                className="min-h-[150px]"
              />
            </Form.Item>
          )}

          {/* Task fields — only when type === TASK */}
          {lessonTypeValue === 'TASK' && (
            <>
              <Form.Item name="taskDescription" label="Mô tả bài tập">
                <Textarea
                  placeholder="Mô tả chi tiết bài tập mà sinh viên cần hoàn thành..."
                  className="min-h-[120px]"
                />
              </Form.Item>

              <Form.Item name="rubric" label="Rubric (tiêu chí chấm điểm)">
                <Textarea
                  placeholder="VD: Hoàn thành đúng: 5đ, Code sạch: 5đ"
                  className="min-h-[80px]"
                />
              </Form.Item>

              {/* submissionFields — Form.List */}
              <Form.Item label="Trường cần nộp">
                <Form.List name="submissionFields">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Space key={key} align="start" className="mb-2 flex-wrap">
                          {/* type selector */}
                          <Form.Item
                            {...rest}
                            name={[name, 'type']}
                            initialValue="EXPLANATION"
                          >
                            <Select
                              style={{ width: 140 }}
                              onChange={(val) => {
                                if (val !== 'CODE') {
                                  form.setFieldValue(
                                    ['submissionFields', name, 'language'],
                                    null
                                  );
                                }
                              }}
                            >
                              <Select.Option value="EXPLANATION">Giải thích</Select.Option>
                              <Select.Option value="CODE">Code</Select.Option>
                              <Select.Option value="SQL_QUERY">SQL</Select.Option>
                            </Select>
                          </Form.Item>

                          {/* label */}
                          <Form.Item
                            {...rest}
                            name={[name, 'label']}
                            rules={[{ required: true, message: 'Nhập tên trường' }]}
                          >
                            <Input placeholder="VD: github_link" style={{ width: 160 }} />
                          </Form.Item>

                          {/* language — only if type === CODE, via shouldUpdate */}
                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, curr) => {
                              const prevList = (prev?.submissionFields as SubmissionField[] | undefined) ?? [];
                              const currList = (curr?.submissionFields as SubmissionField[] | undefined) ?? [];
                              return prevList[name]?.type !== currList[name]?.type;
                            }}
                          >
                            {({ getFieldValue }) => {
                              const currentType = getFieldValue(['submissionFields', name, 'type']);
                              if (currentType !== 'CODE') return null;
                              return (
                                <Form.Item name={[name, 'language']}>
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
                              );
                            }}
                          </Form.Item>

                          {/* required toggle */}
                          <Form.Item
                            {...rest}
                            name={[name, 'required']}
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Switch checkedChildren="Bắt buộc" unCheckedChildren="Tùy chọn" />
                          </Form.Item>

                          <AntdButton type="text" danger onClick={() => remove(name)}>
                            Xóa
                          </AntdButton>
                        </Space>
                      ))}

                      <AntdButton
                        type="dashed"
                        block
                        onClick={() =>
                          add({
                            id: crypto.randomUUID(),
                            type: 'EXPLANATION',
                            label: '',
                            required: true,
                          })
                        }
                      >
                        + Thêm trường nộp
                      </AntdButton>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Cập nhật
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default EditLessonModal;
