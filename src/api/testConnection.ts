// src/api/testConnection.ts
import api from './axiosConfig';

export const testAPIConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Test de connexion API...');
    const response = await api.get('/');
    console.log('✅ Connexion API réussie:', response.status);
    return true;
  } catch (error: any) {
    console.error('❌ Échec connexion API:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url
    });
    return false;
  }
};