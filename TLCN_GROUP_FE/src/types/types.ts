export type User = {
  id: string;
  studentId?: string;
  companyId?: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  address?: string;
  role: "STUDENT" | "COMPANY" | "ADMIN" | null;
  isActive: boolean;
  createdAt: string;
  major?: string;
  careerInterest?: string;
};

export type CompanyProfile = {
  companyId: string;
  companyName: string;
  email: string;
  taxCode?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateCompanyProfilePayload = {
  companyName?: string;
  email?: string;
  taxCode?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  password?: string;
};

export type StudentProfile = {
  id: string;
  studentId: string;
  fullName: string;
  username: string;
  email: string;
  major?: string;
  school?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TestQuestion = {
  id: string;
  question: string;
  options: string[];
}


export type UpdateStudentProfilePayload = {
  fullName?: string;
  email?: string;
  major?: string;
  school?: string;
  address?: string;
  password?: string;
};

export type StudentTestResult = {
  id: string;
  testId: string;
  score: number;
  submittedCode?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  test?: {
    id: string;
    title: string;
    type: 'MINI' | 'FINAL_PATH';
    maxScore: number;
  };
};

export type StudentProgress = {
  id: string;
  studentId: string;
  careerPathId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt?: string;
  updatedAt?: string;
  careerPath?: {
    id: string;
    title: string;
    description?: string;
    company?: {
      companyName: string;
    };
  };
  // API also returns 'course' field which is the same as careerPath
  course?: {
    id: string;
    title: string;
    description?: string;
    company?: {
      companyName: string;
    };
  };
  testResults?: StudentTestResult[];
};

export type StudentLearningResultsResponse = {
  progress: StudentProgress[];
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
};

export type CareerTest = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  companyId: string;
  createdAt: string;
  updatedAt?: string;
};

export type Course = {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id?: string;
    companyName?: string;
  } | null;
  lessons?: any[];
  finalTest?: any;
};

export type CourseListResponse = {
  total: number;
  page: number;
  limit: number;
  data: Course[];
};

export type CreateCareerTestPayload = {
  title: string;
  description?: string;
  images?: File | null;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  accessToken: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: "STUDENT" | "COMPANY";
};

export type RegisterResponse = LoginResponse;


export type CareerTestResponse = {
  questions: TestQuestion[];
}

export type CommentAuthor = {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
};

export type Comment = {
  id: string;
  blogId: string;
  content: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt?: string;
  parentId?: string | null;
  replies?: Comment[];
}

export type CreateCommentPayload = {
  blogId: string;
  content: string;
  parentId?: string | null;
}

export type UpdateCommentPayload = {
  content: string;
};

export type RawCommentAuthor = {
  id?: string;
  username?: string;
  fullName?: string;
};

export type RawComment = {
  id?: string;
  blogId?: string;
  postId?: string;
  content?: string;
  author?: RawCommentAuthor;
  User?: RawCommentAuthor;
  createdAt?: string;
  updatedAt?: string;
  parentId?: string | null;
  replies?: RawComment[];
};

export type RawCommentListResponse = {
  total?: number;
  comments?: RawComment[];
  currentPage?: number;
  totalPages?: number;
};

export type CommentListResponse = {
  total: number;
  comments: Comment[];
  currentPage: number;
  totalPages: number;
}

export type CreateTestPayload = {
  lessonId?: string;
  careerPathId?: string;
  title: string;
  order?: number;
  description?: string;
  questions?: TestQuestion[];
  content?: string;
  type?: 'MINI' | 'FINAL_PATH';
  maxScore?: number;
};

// Submission field types
export type SubmissionFieldType = "EXPLANATION" | "CODE" | "SQL_QUERY";

export type SubmissionField = {
  id: string;
  type: SubmissionFieldType;
  label: string;
  language?: string | null;
  required: boolean;
};

// Lesson type matching backend response
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

// Test type matching backend response
export type Test = {
  id: string;
  title: string;
  description?: string;
  type: 'MINI' | 'FINAL_PATH';
  content?: any;
  maxScore: number;
  lessonId?: string | null;
  careerPathId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type ChatSession = {
  sessionId: number;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
};

export type StudentAssessment = {
  assessment: string;
  studentContext: any;
  generatedAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'student' | 'company';
  avatar?: string;
  coverColor?: string;
  school?: string;
  major?: string;
  companyName?: string;
  industry?: string;
  yearEstablished?: number;
  website?: string;
  address?: string;
  courses?: number;
  followers?: number;
  points?: number;
  // Enrolled courses
  enrolledCourses?: {
    id: string;
    title: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
    progress?: number;
  }[];
};

export type Participant = {
  id: string;
  username?: string | null;
  fullName?: string | null;
  avatar?: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  sender?: Participant;
};

export type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationListItem = {
  conversation: Conversation;
  lastMessage: Message | null;
  participants: Participant[];
};

export type GetMessagesParams = {
  limit?: number;
  beforeId?: string;
};

export type SendMessagePayload = {
  content: string;
};

export type SendMessageResponse = Message;

export type GetOrCreateConversationResponse = {
  conversation: Conversation;
  participants: Participant[];
  messages: Message[];
};

export type FollowInfo = {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export type FollowerUser = {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  role?: string;
}

export type FollowersResponse = {
  followers: FollowerUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type FollowingResponse = {
  following: FollowerUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export type SearchUser = {
  id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  role?: string;
  email?: string;
}

export type SearchCompany = {
  id: string;
  companyName: string;
  industry?: string;
  avatar?: string;
  website?: string;
  userId?: string; // For linking to user profile
}

export type SearchCourse = {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  level?: string;
  price?: number;
}

export type SearchBlog = {
  id: string;
  content?: string;
  category?: string;
  createdAt?: string;
  author?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  } | null;
}

export type SearchAllResponse = {
  users: SearchUser[];
  companies: SearchCompany[];
  courses: SearchCourse[];
  blogs: SearchBlog[];
}

export type SearchParams = {
  q: string;
  type?: 'all' | 'users' | 'companies' | 'courses' | 'blogs';
  limit?: number;
}

export type CourseListParams = {
  page?: number;
  limit?: number;
};

export type LikeInfo = {
  liked: boolean;
  count: number;
};

export type NotificationType =
  | 'FOLLOW'
  | 'LIKE'
  | 'COMMENT'
  | 'MESSAGE'
  | 'SYSTEM'
  | 'COURSE_UPDATE'
  | 'ACHIEVEMENT';

export type NotificationActor = {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
};

export type NotificationBlog = {
    id: string;
    content: string;
};

export type NotificationComment = {
    id: string;
    content: string;
};

export type Notification = {
    id: string;
    userId: string;
    type: NotificationType;
    message: string;
    blogId?: string | null;
    commentId?: string | null;
    actorId?: string | null;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
    // Populated relations
    actor?: NotificationActor;
    blog?: NotificationBlog;
    comment?: NotificationComment;
};

export type NotificationListResponse = {
    notifications: Notification[];
    unreadCount: number;
};

export type UnreadCountResponse = {
    unreadCount: number;
};

export type MarkAsReadPayload = {
    ids: string[];
};
