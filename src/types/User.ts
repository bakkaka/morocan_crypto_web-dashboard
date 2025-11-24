// src/types/User.ts
export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string; // ✅ Ajouté
  roles: string[];
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  walletAddress?: string; // ✅ Ajouté
  reputation?: number;
  isActive?: boolean; // ✅ Ajouté
  loginAttempts?: number;
  lockedUntil?: string;
}