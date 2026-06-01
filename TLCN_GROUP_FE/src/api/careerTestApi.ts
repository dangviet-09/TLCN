import { apiClient } from "../services/apiClient";

export type CareerTestQuestion = {
  questionIndex: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export type CareerTest = {
  id: string;
  questions: CareerTestQuestion[];
}

export type TestAnswer = {
  questionIndex: number;
  option: 'A' | 'B' | 'C' | 'D';
}

export type TestResult = {
  bestCareer: string;
  scores: {
    BACKEND: number;
    FRONTEND: number;
    BA: number;
    PM: number;
  };
  message: string;
}

// --- Phase 2: Student CareerTest types ---

export type CareerTestQuestionNew = {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
  question: string;
  options?: string[];
  points?: number;
  correctAnswer?: string;
  expectedAnswer?: string;
  expectedKeywords?: string[];
}

export type CareerTestNew = {
  id: string;
  title: string;
  description: string;
  questions: CareerTestQuestionNew[];
}

export type GradingDetail = {
  questionIndex: number;
  type: string;
  maxPoints: number;
  earnedPoints: number;
  isCorrect: boolean;
  explanation: string;
}

export type CareerTestSubmitResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  feedback: string;
  details: GradingDetail[];
  suggestions: any[];
}

export type CareerTestAnswer = {
  questionIndex: number;
  answer: string;
}

// -----------------------------------------------------------

export const careerTestApi = {
  // Lấy bài test
  getTest: async (): Promise<CareerTest> => {
    try {
      const response = await apiClient.get<any>('/career-test');
      return response as CareerTest;
    } catch (error: any) {
      console.error('[careerTestApi] getTest error:', error);
      throw error;
    }
  },

  // Nộp bài test
  submitTest: async (answers: TestAnswer[]): Promise<TestResult> => {
    try {
      const response = await apiClient.post<any>('/career-test/submit', { answers });
      return response as TestResult;
    } catch (error: any) {
      console.error('[careerTestApi] submitTest error:', error);
      throw error;
    }
  },

  // Cập nhật major
  updateMajor: async (major: string): Promise<any> => {
    try {
      const response = await apiClient.put<any>('/career-test/major', { major });
      return response;
    } catch (error: any) {
      console.error('[careerTestApi] updateMajor error:', error);
      throw error;
    }
  },

  // --- Phase 2: Student CareerTest API ---

  // Lấy chi tiết đề bài theo UUID
  getCareerTestById: async (id: string): Promise<CareerTestNew> => {
    try {
      const response = await apiClient.get<any>(`/career-tests/${id}`);
      return response as CareerTestNew;
    } catch (error: any) {
      console.error('[careerTestApi] getCareerTestById error:', error);
      throw error;
    }
  },

  // Sinh viên đăng ký làm bài
  enrollCareerTest: async (testId: string): Promise<any> => {
    try {
      const response = await apiClient.post<any>(`/career-tests/${testId}/enroll`);
      return response;
    } catch (error: any) {
      console.error('[careerTestApi] enrollCareerTest error:', error);
      throw error;
    }
  },

  // Sinh viên nộp bài (gửi mảng answers)
  submitCareerTest: async (testId: string, answers: CareerTestAnswer[]): Promise<CareerTestSubmitResult> => {
    try {
      const response = await apiClient.post<any>(`/career-tests/${testId}/submit`, { answers });
      return response as CareerTestSubmitResult;
    } catch (error: any) {
      console.error('[careerTestApi] submitCareerTest error:', error);
      throw error;
    }
  },
};