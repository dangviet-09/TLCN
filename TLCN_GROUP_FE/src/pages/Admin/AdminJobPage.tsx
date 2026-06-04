import React, { useState, useEffect, useCallback } from "react";
import { Table, Tag, Button, Typography, Space, Popconfirm, Select, message } from "antd";
import { apiClient } from "../../services/apiClient";

const { Title } = Typography;

interface AdminJob {
  id: string;
  title: string;
  company?: { companyName: string };
  status: "OPEN" | "CLOSED" | "DRAFT";
  createdAt: string;
  viewCount: number;
}

const AdminJobPage: React.FC = () => {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchJobs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/jobs/admin/all?page=${page}&limit=${pagination.pageSize}`);
      const data = res?.data?.data || res?.data || [];
      setJobs(Array.isArray(data) ? data : []);
      setPagination(prev => ({ ...prev, current: page, total: res?.data?.total || res?.total || 0 }));
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Không thể tải danh sách việc làm.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/jobs/admin/${jobId}/status`, { status: newStatus });
      message.success("Cập nhật trạng thái thành công.");
      fetchJobs(pagination.current);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Lỗi cập nhật trạng thái.");
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await apiClient.delete(`/jobs/admin/${jobId}`);
      message.success("Đã xóa tin tuyển dụng.");
      fetchJobs(pagination.current);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Lỗi khi xóa việc làm.");
    }
  };

  const columns = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: AdminJob) => (
        <a
          href={`/jobs/${record.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Doanh nghiệp",
      key: "company",
      render: (_: any, record: AdminJob) => record.company?.companyName || "—",
    },
    {
      title: "Ngày đăng",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => date ? new Date(date).toLocaleDateString("vi-VN") : "—",
    },
    {
      title: "Lượt xem",
      dataIndex: "viewCount",
      key: "viewCount",
      align: "center" as const,
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: any, record: AdminJob) => (
        <Select
          value={record.status}
          onChange={(val) => handleStatusChange(record.id, val)}
          style={{ width: 120 }}
          options={[
            { value: "OPEN", label: <Tag color="green">OPEN</Tag> },
            { value: "CLOSED", label: <Tag color="red">CLOSED</Tag> },
            { value: "DRAFT", label: <Tag color="default">DRAFT</Tag> },
          ]}
        />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: AdminJob) => (
        <Popconfirm
          title="Bạn có chắc chắn muốn xóa tin này vĩnh viễn?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger>Xóa</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <Title level={4} className="mb-6">Quản lý Tin tuyển dụng (Hệ thống)</Title>
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page) => fetchJobs(page),
          }}
        />
      </div>
    </div>
  );
};

export default AdminJobPage;
