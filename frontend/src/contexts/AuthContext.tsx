import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

const TOKEN_KEY = '@finance-control:token';
const USER_KEY = '@finance-control:user';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

/**
 * AuthContext centraliza TODO o estado de autenticação da aplicação.
 * Por que Context API e não prop-drilling? Dezenas de componentes (Navbar,
 * PrivateRoute, páginas de perfil) precisam saber "quem é o usuário logado".
 * Passar isso via props por várias camadas de componentes acoplaria
 * componentes que não têm relação direta entre si.
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  function persistSession(token: string, sessionUser: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  }

  async function login(email: string, password: string) {
    const { token, user: sessionUser } = await authService.login(email, password);
    persistSession(token, sessionUser);
  }

  async function register(name: string, email: string, password: string) {
    const { token, user: sessionUser } = await authService.register(name, email, password);
    persistSession(token, sessionUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function updateUser(updatedUser: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
