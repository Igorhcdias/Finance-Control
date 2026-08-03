import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userService } from '../services/user.service';
import { getApiErrorMessage } from '../services/api';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual'),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileFormSchema>;
type PasswordFormData = z.infer<typeof passwordFormSchema>;

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordFormSchema) });

  async function onSubmitProfile(data: ProfileFormData) {
    try {
      const updated = await userService.updateProfile(data);
      updateUser(updated);
      showToast('Perfil atualizado com sucesso', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao atualizar perfil'), 'error');
    }
  }

  async function onSubmitPassword(data: PasswordFormData) {
    try {
      await userService.changePassword(data);
      passwordForm.reset();
      showToast('Senha alterada com sucesso', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Erro ao alterar senha'), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Perfil</h1>
        <p className="text-sm text-gray-500">Gerencie seus dados pessoais e segurança</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Dados pessoais</h2>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} noValidate>
            <div className="mb-4">
              <label className="label-field" htmlFor="name">Nome</label>
              <input id="name" className="input-field" {...profileForm.register('name')} />
              {profileForm.formState.errors.name && (
                <p className="error-text">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="mb-6">
              <label className="label-field" htmlFor="email">E-mail</label>
              <input id="email" type="email" className="input-field" {...profileForm.register('email')} />
              {profileForm.formState.errors.email && (
                <p className="error-text">{profileForm.formState.errors.email.message}</p>
              )}
            </div>
            <button type="submit" disabled={profileForm.formState.isSubmitting} className="btn-primary">
              {profileForm.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Alterar senha</h2>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} noValidate>
            <div className="mb-4">
              <label className="label-field" htmlFor="currentPassword">Senha atual</label>
              <input id="currentPassword" type="password" className="input-field" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="error-text">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="label-field" htmlFor="newPassword">Nova senha</label>
              <input id="newPassword" type="password" className="input-field" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p className="error-text">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="mb-6">
              <label className="label-field" htmlFor="confirmPassword">Confirmar nova senha</label>
              <input id="confirmPassword" type="password" className="input-field" {...passwordForm.register('confirmPassword')} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="error-text">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" disabled={passwordForm.formState.isSubmitting} className="btn-primary">
              {passwordForm.formState.isSubmitting ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
