import bcrypt from 'bcryptjs';
import { IUserRepository } from '../interfaces/repositories';
import { ChangePasswordDTO, UpdateProfileDTO } from '../dto/user.dto';
import { AppError } from '../utils/AppError';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }
    return { id: user.id, name: user.name, email: user.email };
  }

  async updateProfile(userId: string, data: UpdateProfileDTO) {
    if (data.email) {
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing && existing.id !== userId) {
        throw new AppError('Este e-mail já está em uso por outra conta', 409);
      }
    }

    const user = await this.userRepository.update(userId, data);
    return { id: user.id, name: user.name, email: user.email };
  }

  async changePassword(userId: string, data: ChangePasswordDTO) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // RN09: exige a senha atual antes de permitir a troca.
    const currentPasswordMatches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!currentPasswordMatches) {
      throw new AppError('Senha atual incorreta', 401);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await this.userRepository.update(userId, { passwordHash });
  }
}
