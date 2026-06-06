import React, { useRef, useMemo } from 'react';
import { Modal, Form, Input, Tabs, Button, InputNumber, Switch, Card, message, Space } from 'antd';
import { DeleteOutlined, PlusOutlined, LinkOutlined, SettingOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Style bắt buộc của Quill
import { uploadApi } from '../../../api/uploadApi';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form] = Form.useForm();
  const quillRef = useRef<ReactQuill>(null);

  // ----------------------------------------------------------------------
  // KỸ THUẬT LÕI: Ghi đè hành vi chèn ảnh mặc định của ReactQuill
  // Triệt tiêu Base64 -> Gọi API Upload -> Chèn Link URL
  // ----------------------------------------------------------------------
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (file) {
        const hide = message.loading('Đang tải ảnh lên hệ thống...', 0);
        try {
          // 1. Gọi API Backend để ném ảnh lên Cloudinary
          const url = await uploadApi.uploadImage(file);

          // 2. Lấy con trỏ hiện tại trong Editor và chèn URL vào
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', url);
            quill.setSelection(range.index + 1, 0); // Đẩy con trỏ ra sau ảnh
          }
          hide();
          message.success('Tải ảnh thành công!');
        } catch (error) {
          hide();
          message.error('Tải ảnh thất bại. Vui lòng thử lại.');
        }
      }
    };
  };

  // Khai báo Modules của Quill (Phải bọc trong useMemo để tránh re-render mất focus)
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image', 'video'], // Ảnh và Video Link
        ['clean']
      ],
      handlers: {
        image: imageHandler // Cắm handler xịn vào đây
      }
    }
  }), []);

  // Xử lý Submit Form chung
  const handleFinish = (values: any) => {
    console.log("Dữ liệu đóng gói gửi Backend:", values);
    onSave(values);
    form.resetFields();
  };

  return (
    <Modal
      title={<h2 className="text-xl font-bold">Tạo Bài Học Mới (Lesson Builder)</h2>}
      open={isOpen}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>Hủy</Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>Lưu Bài Học</Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          lessonType: 'THEORY',
          maxPoints: 100,
          requireUrl: false,
          requireFile: false
        }}
        className="mt-4"
      >
        {/* Thông tin cơ bản */}
        <Form.Item
          name="title"
          rules={[{ required: true, message: 'Vui lòng nhập tên bài học!' }]}
        >
          <Input size="large" placeholder="Nhập tiêu đề bài học..." className="text-lg font-medium" />
        </Form.Item>

        {/* Bảng điều khiển Tab */}
        <Form.Item name="lessonType" noStyle>
          <Tabs
            type="card"
            onChange={(key) => form.setFieldValue('lessonType', key)}
            items={[
              {
                key: 'THEORY',
                label: <span className="flex items-center gap-2"><FileTextOutlined /> Lý Thuyết (Theory)</span>,
                children: (
                  <div className="space-y-6 pt-4">
                    {/* Editor Lý Thuyết */}
                    <Form.Item name="theoryContent" label="Nội dung bài giảng">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        modules={modules}
                        placeholder="Bắt đầu viết nội dung lý thuyết ở đây..."
                        style={{ height: '350px', marginBottom: '40px' }}
                      />
                    </Form.Item>

                    {/* Reference Links Động */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="flex items-center gap-2 font-medium mb-4"><LinkOutlined /> Tài liệu tham khảo (Tùy chọn)</h3>
                      <Form.List name="referenceLinks">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} className="flex mb-2" align="baseline">
                                <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: 'Nhập tên tài liệu' }]}>
                                  <Input placeholder="Tên tài liệu (VD: React Docs)" style={{ width: 250 }} />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'url']} rules={[{ required: true, type: 'url', message: 'URL không hợp lệ' }]}>
                                  <Input placeholder="https://..." style={{ width: 350 }} />
                                </Form.Item>
                                <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                              </Space>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              Thêm Link Tài Liệu
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </div>
                  </div>
                )
              },
              {
                key: 'TASK',
                label: <span className="flex items-center gap-2"><UploadOutlined /> Bài Tập (Task)</span>,
                children: (
                  <div className="space-y-6 pt-4">
                    {/* Editor Đề Bài */}
                    <Form.Item name="taskInstructions" label="Yêu cầu đề bài">
                      <ReactQuill
                        theme="snow"
                        placeholder="Viết hướng dẫn hoặc đề bài cho sinh viên..."
                        style={{ height: '200px', marginBottom: '40px' }}
                      />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Cấu hình Điểm */}
                      <Card size="small" title={<span className="flex items-center gap-2"><SettingOutlined /> Cấu Hình Điểm Số</span>}>
                        <Form.Item name="maxPoints" label="Điểm tối đa">
                          <InputNumber min={0} max={1000} className="w-full" />
                        </Form.Item>
                      </Card>

                      {/* Cấu hình Nộp bài */}
                      <Card size="small" title={<span className="flex items-center gap-2"><UploadOutlined /> Định Dạng Nộp Bài</span>}>
                        <Form.Item name="requireUrl" valuePropName="checked" className="mb-2">
                          <Switch checkedChildren="Bắt buộc" unCheckedChildren="Không" />
                          <span className="ml-2">Nộp Link (URL / GitHub)</span>
                        </Form.Item>
                        <Form.Item name="requireFile" valuePropName="checked" className="mb-0">
                          <Switch checkedChildren="Bắt buộc" unCheckedChildren="Không" />
                          <span className="ml-2">Nộp File (.zip, .pdf)</span>
                        </Form.Item>
                      </Card>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
