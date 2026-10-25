import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  accessible?: boolean;
  dismissible?: boolean;
}

/**
 * Componente de UI "burro" (dumb component): recebe estado via props
 * (`isOpen`) e delega decisões (`onClose`) para quem o usa. Isso o torna
 * reutilizável em qualquer contexto (form de categoria, confirmação de
 * exclusão, etc.) sem acoplamento a uma tela específica.
 */
export function Modal({ isOpen, title, onClose, children, accessible = false, dismissible = true }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    dismissibleRef.current = dismissible;
  }, [dismissible]);

  useEffect(() => {
    if (!isOpen || !accessible) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (dismissibleRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;

      const elements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]:not(:disabled)',
      );
      if (!elements?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const focusIsOutside = !dialogRef.current?.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, accessible]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 p-4">
      <div
        ref={dialogRef}
        role={accessible ? 'dialog' : undefined}
        aria-modal={accessible ? true : undefined}
        aria-labelledby={accessible ? titleId : undefined}
        tabIndex={accessible ? -1 : undefined}
        className={`w-full max-w-md rounded-xl bg-white p-6 shadow-xl ${accessible ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto outline-none' : ''}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Fechar"
            className={`rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 ${accessible ? 'flex min-h-11 min-w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600' : ''}`}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
