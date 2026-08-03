import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { IncomesPage } from '../pages/IncomesPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ProfilePage } from '../pages/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Todas as rotas da aplicação vivem neste único arquivo.
 * Rotas privadas ficam aninhadas dentro de <PrivateRoute> + <MainLayout>,
 * herdando automaticamente a guarda de autenticação e o layout com
 * Navbar/Sidebar — nenhuma página precisa se preocupar com isso.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/receitas" element={<IncomesPage />} />
          <Route path="/despesas" element={<ExpensesPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
