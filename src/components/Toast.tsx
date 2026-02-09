'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
  duration?: number; // ミリ秒
}

export function Toast({ message, onUndo, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
        <p className="flex-1">{message}</p>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1 rounded transition-colors"
          >
            取り消し
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
