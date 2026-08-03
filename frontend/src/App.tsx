import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppRoutes } from './routes/AppRoutes';

/**
 * Ordem dos providers importa: ToastProvider fica fora porque o AuthContext
 * (login/register) pode precisar disparar toasts de erro. BrowserRouter
 * envolve tudo pois AppRoutes e o próprio AuthProvider (redirecionamentos)
 * dependem do contexto de rota.
 */
export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
