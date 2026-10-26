import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  User as UserIcon,
  LogOut,
  Wallet,
  PiggyBank,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {useState} from "react";

const navItems = [
  { to: '/investimento', label: 'Investimento', icon: PiggyBank },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
          <aside
      className={`hidden shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 md:flex md:flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
                <div
          className={`flex items-center py-5 ${
            sidebarOpen ? 'gap-2 px-6' : 'justify-center px-2'
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Wallet size={18} />
          </div>

          {sidebarOpen && (
            <span className="text-lg font-semibold text-gray-900">
              Finance Control
            </span>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm font-medium transition-colors ${
                  sidebarOpen
                    ? 'w-full gap-3 px-3 py-2.5'
                    : 'h-11 w-11 shrink-0 self-center justify-center p-0'
                } ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 px-3 py-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            aria-expanded={sidebarOpen}
            className={`flex shrink-0 items-center rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              sidebarOpen
                ? 'w-full justify-start gap-3 px-3 py-2.5'
                : 'h-10 w-10 self-center justify-center'
            }`}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} className="shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftOpen size={20} aria-hidden="true" />
            )}
            {sidebarOpen && <span>Recolher menu</span>}
          </button>
          <button
              type="button"
              onClick={logout}
              aria-label="Sair"
              title="Sair"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
          <LogOut size={18} className="shrink-0" />
          {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
            <button
              type="button"
              onClick={logout}
              aria-label="Sair"
              title="Sair"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:hidden"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Navegação inferior para mobile, já que a sidebar fica oculta em telas pequenas */}
        <nav className="flex items-center justify-around border-b border-gray-200 bg-white py-2 md:hidden">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `rounded-lg p-2 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500'}`
              }
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
