import { apiClient } from "../services/apiClient";

export const uploadApi = {
    /**
     * Tải lên một file ảnh đa dụng và trả về đường link URL tĩnh.
     */
    uploadImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file); // Tên field 'file' khớp với uploadSingle('file') ở Backend

        const response = await apiClient.postFormData<any>('/upload/image', formData);

        // apiClient đã bóc sẵn data, ta chỉ cần bóc tiếp thuộc tính url
        return response.url;
    }
};
