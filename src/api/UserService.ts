// src/api/UserService.ts
import axios from 'axios';

// --- Interfaces ---
export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  reputation?: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string; // correspond à plainPassword
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string;
  reputation?: number;
  isVerified?: boolean;
}

// --- Erreur personnalisée ---
export class UserServiceError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// --- Validation ---
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/.test(phone);
const validatePassword = (password: string) => password.length >= 6;

const validateUserData = (data: RegisterUserData) => {
  if (!data.fullName || data.fullName.trim().length < 2) {
    throw new UserServiceError('Le nom complet doit contenir au moins 2 caractères', 'VALIDATION_ERROR');
  }
  if (!data.email || !validateEmail(data.email)) {
    throw new UserServiceError('Email invalide', 'VALIDATION_ERROR');
  }
  if (!data.phone || !validatePhone(data.phone)) {
    throw new UserServiceError('Téléphone invalide', 'VALIDATION_ERROR');
  }
  if (!data.password || !validatePassword(data.password)) {
    throw new UserServiceError('Le mot de passe doit contenir au moins 6 caractères', 'VALIDATION_ERROR');
  }
};

// --- Axios instance ---
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // adapter selon ton backend
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// --- Fonctions API ---

// Inscription utilisateur
export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    validateUserData(data);

    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      plainPassword: data.password,
      roles: ['ROLE_USER'],
      isVerified: false,
      reputation: 5,
    };

    const response = await api.post<User>('/users', payload);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      throw new UserServiceError(error.response.data.message, 'API_ERROR', error.response.status, error.response.data);
    }
    if (error instanceof UserServiceError) throw error;
    throw new UserServiceError('Erreur lors de l\'inscription', 'UNKNOWN_ERROR');
  }
};

// Tester la connexion API
export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/users', { timeout: 5000 });
    return { connected: true, message: 'Serveur OK' };
  } catch {
    return { connected: false, message: 'Serveur non accessible' };
  }
};

// Récupérer tous les utilisateurs (pagination)
export const getUsers = async (page = 1, itemsPerPage = 30): Promise<{ users: User[]; total: number }> => {
  try {
    const response = await api.get<{ 'hydra:member': User[]; 'hydra:totalItems': number }>(
      `/users?page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return { users: response.data['hydra:member'], total: response.data['hydra:totalItems'] };
  } catch (error: any) {
    throw new UserServiceError('Impossible de récupérer les utilisateurs', 'FETCH_ERROR', error.response?.status);
  }
};

// Récupérer un utilisateur par ID
export const getUserById = async (id: number): Promise<User> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de récupérer l\'utilisateur', 'FETCH_ERROR', error.response?.status);
  }
};

// Mettre à jour un utilisateur
export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');

  if (data.email && !validateEmail(data.email)) throw new UserServiceError('Email invalide');
  if (data.phone && !validatePhone(data.phone)) throw new UserServiceError('Téléphone invalide');

  const payload: any = { ...data };
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  if (payload.fullName) payload.fullName = payload.fullName.trim();
  if (payload.phone) payload.phone = payload.phone.trim();

  try {
    const response = await api.put<User>(`/users/${id}`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de mettre à jour l\'utilisateur', 'UPDATE_ERROR', error.response?.status);
  }
};

// Supprimer un utilisateur
export const deleteUser = async (id: number): Promise<void> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');

  try {
    await api.delete(`/users/${id}`);
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de supprimer l\'utilisateur', 'DELETE_ERROR', error.response?.status);
  }
};

// Vérifier si un email existe
export const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!validateEmail(email)) return false;
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(`/users?email=${encodeURIComponent(email.toLowerCase())}`);
    return response.data['hydra:member'].length > 0;
  } catch {
    return false;
  }
};

// Rechercher utilisateur par nom
export const searchUsersByName = async (query: string): Promise<User[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(`/users?fullName=${encodeURIComponent(query.trim())}`);
    return response.data['hydra:member'];
  } catch {
    return [];
  }
};

// --- Export par défaut ---
export default {
  registerUser,
  testAPIConnection,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  checkEmailExists,
  searchUsersByName,
  UserServiceError,
};
