import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Tags,
  User as UserIcon,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/receitas', label: 'Receitas', icon: ArrowUpCircle },
  { to: '/despesas', label: 'Despesas', icon: ArrowDownCircle },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/perfil', label: 'Perfil', icon: UserIcon },
];

/**
 * MainLayout usa <Outlet /> do React Router: a Sidebar/Navbar são renderizadas
 * uma única vez, e apenas o conteúdo da página muda por baixo. Isso evita
 * duplicar a estrutura de navegação em cada página (DRY).
 */
export function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Wallet size={18} />
          </div>
          <span className="text-lg font-semibold text-gray-900">Finance Control</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 px-3 py-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Wallet size={16} />
            </div>
            <span className="font-semibold text-gray-900">Finance Control</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">Olá, {user?.name.split(' ')[0]}</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Navegação inferior para mobile, já que a sidebar fica oculta em telas pequenas */}
        <nav className="flex items-center justify-around border-b border-gray-200 bg-white py-2 md:hidden">
          {navItems.map(({ to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-lg p-2 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`
              }
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
