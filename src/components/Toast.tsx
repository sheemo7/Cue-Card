import React from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-4 right-4 bottom-16 sm:bottom-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md mx-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#262220] border border-[#322d28] p-3 text-xs flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-150"
        >
          <span className="text-[#ece6da] font-medium truncate">{t.message}</span>
          {t.actionLabel && t.onAction ? (
            <button
              type="button"
              onClick={() => {
                t.onAction?.();
                onDismiss(t.id);
              }}
              className="text-[#c58b4a] hover:text-[#d4a359] font-black uppercase tracking-wider text-xs whitespace-nowrap"
            >
              {t.actionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-[#8d8478] hover:text-[#ece6da] font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
