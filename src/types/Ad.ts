// src/types/Ad.ts
export interface User {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
}

export interface Currency {
  id: number;
  name: string;
  symbol: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface Ad {
  id: number;
  title?: string;
  description?: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'published' | 'paused' | 'rejected' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  adminNotes?: string;
  approvedBy?: User | null;
  user: User;
  currency?: Currency;
  acceptedPaymentMethods: PaymentMethod[];
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
}