export interface User {
  id: number;
  email: string;
  fullName: string;
  roles: string[];
  isVerified: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  walletAddress?: string;
  reputation?: number;
}
