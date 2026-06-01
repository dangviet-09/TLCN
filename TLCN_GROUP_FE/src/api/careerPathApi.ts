import { apiClient } from "../services/apiClient";
import { CareerTest, CreateCareerTestPayload } from "../types/types";

export const getAllCareerTests = async (): Promise<CareerTest[]> => {
    // SỬA CHÍNH: Trỏ đúng vào /career-tests để lấy danh sách bài test
    const response = await apiClient.get<CareerTest[]>('/career-tests');
    return Array.isArray(response) ? response : (response as any).data || [];
};

export const getMyCareerTests = async (): Promise<CareerTest[]> => {
    const response = await apiClient.get<CareerTest[]>('/career-tests/owned');
    return Array.isArray(response) ? response : (response as any).data || [];
};

export const getCareerTestById = async (testId: string): Promise<CareerTest> => {
    // SỬA: Trỏ vào /career-tests/:id
    return apiClient.get<CareerTest>(`/career-tests/${testId}`);
};

export const createCareerTest = async (payload: CreateCareerTestPayload): Promise<CareerTest> => {
    // 1. Đóng gói JSON thuần, loại bỏ hoàn toàn hình ảnh
    const requestData = {
        title: payload.title,
        description: payload.description,
        questions: [] // 2. Bắt buộc truyền mảng rỗng để qua mặt allowNull: false của Database
    };

    // 3. Sử dụng apiClient.post (gửi application/json) thay vì postFormData
    const response = await apiClient.post<CareerTest>('/career-tests', requestData);
    
    // Đảm bảo bóc tách đúng cấu trúc response trả về từ backend của bạn
    return (response as any).data || response;
};

export const updateCareerTest = async (
    testId: string,
    payload: Partial<CreateCareerTestPayload>
): Promise<CareerTest> => {
    const formData = new FormData();
    if (payload.title) {
        formData.append('title', payload.title);
    }
    if (payload.description !== undefined) {
        formData.append('description', payload.description);
    }
    if (payload.images) {
        formData.append('image', payload.images);
    }
    // SỬA: Trỏ vào /career-tests/:id
    return apiClient.putFormData<CareerTest>(`/career-tests/${testId}`, formData);
};

export const deleteCareerTest = async (testId: string): Promise<void> => {
    // SỬA: Trỏ vào /career-tests/:id
    await apiClient.delete(`/career-tests/${testId}`);
};