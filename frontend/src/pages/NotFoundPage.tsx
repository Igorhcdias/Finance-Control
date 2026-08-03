import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Compass size={28} />
      </div>
      <h1 className="text-3xl font-semibold text-gray-900">404</h1>
      <p className="max-w-sm text-sm text-gray-500">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link to="/dashboard" className="btn-primary">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
