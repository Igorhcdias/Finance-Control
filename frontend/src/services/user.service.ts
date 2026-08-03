import { api } from './api';
import { User } from '../types';

export const userService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get<User>('/users/me');
    return data;
  },

  async updateProfile(input: { name?: string; email?: string }): Promise<User> {
    const { data } = await api.put<User>('/users/me', input);
    return data;
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/users/me/password', input);
  },
};
