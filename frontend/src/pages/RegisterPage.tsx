import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

const registerFormSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerFormSchema) });

  async function onSubmit(data: RegisterFormData) {
    setIsSubmitting(true);
    try {
      await registerUser(data.name, data.email, data.password);
      showToast('Conta criada com sucesso!', 'success');
      navigate('/dashboard');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Não foi possível criar sua conta'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a organizar suas finanças em minutos">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label className="label-field" htmlFor="name">Nome</label>
          <input id="name" className="input-field" placeholder="Seu nome completo" {...register('name')} />
          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>

        <div className="mb-4">
          <label className="label-field" htmlFor="email">E-mail</label>
          <input id="email" type="email" className="input-field" placeholder="voce@exemplo.com" {...register('email')} />
          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label className="label-field" htmlFor="password">Senha</label>
          <input id="password" type="password" className="input-field" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="error-text">{errors.password.message}</p>}
        </div>

        <div className="mb-6">
          <label className="label-field" htmlFor="confirmPassword">Confirmar senha</label>
          <input
            id="confirmPassword"
            type="password"
            className="input-field"
            placeholder="••••••••"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
