import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/Loading';

/**
 * PrivateRoute: um único ponto de decisão sobre "esta rota exige login?".
 * Ao usar <Outlet /> como filho de uma <Route> pai, qualquer rota aninhada
 * herda automaticamente essa proteção — sem repetir a checagem em cada página.
 */
export function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading label="Verificando sessão..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
