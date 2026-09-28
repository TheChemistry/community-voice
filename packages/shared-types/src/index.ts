export interface UserDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'CITIZEN' | 'MODERATOR' | 'MUNICIPAL_ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: Date;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: 'CITIZEN' | 'MODERATOR' | 'MUNICIPAL_ADMIN' | 'SUPER_ADMIN';
    image?: string | null;
  };
  expires: string;
}

export interface CivicReportDto {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'FLAGGED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportInput {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  mediaKeys?: string[];
}
