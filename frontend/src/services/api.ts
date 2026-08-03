import axios from 'axios';

/**
 * Instância única do Axios.
 * Por quê centralizar aqui?
 * - Base URL, headers e interceptors ficam em um único lugar; nenhuma
 *   página/service precisa saber onde a API está hospedada.
 * - O interceptor de request injeta o token JWT automaticamente em toda
 *   chamada autenticada, e o de response trata expiração de sessão de forma
 *   global (evita repetir esse tratamento em cada chamada).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@finance-control:token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@finance-control:token');
      localStorage.removeItem('@finance-control:user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extrai uma mensagem de erro amigável de uma resposta de erro do Axios,
 * evitando repetir `error.response?.data?.message ?? 'algo'` em cada página.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
