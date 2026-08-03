import bcrypt from 'bcryptjs';
import { IUserRepository } from '../interfaces/repositories';
import { LoginDTO, RegisterDTO } from '../dto/auth.dto';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';

/**
 * Service Layer: concentra as REGRAS DE NEGÓCIO, independente de HTTP.
 * O controller não sabe (e não precisa saber) como a senha é hasheada ou
 * como o token é gerado — apenas chama `authService.login(dto)`.
 * Isso é Single Responsibility: o controller lida com request/response,
 * o service lida com a regra de negócio.
 */
export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(data: RegisterDTO) {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Este e-mail já está cadastrado', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
    });

    return this.buildAuthResponse(user.id, user.email, user.name);
  }

  async login(data: LoginDTO) {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError('E-mail ou senha inválidos', 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('E-mail ou senha inválidos', 401);
    }

    return this.buildAuthResponse(user.id, user.email, user.name);
  }

  private buildAuthResponse(id: string, email: string, name: string) {
    const token = signToken({ sub: id, email });
    return { token, user: { id, name, email } };
  }
}
