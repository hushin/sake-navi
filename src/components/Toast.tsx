'use client';

import { useEffect } from 'react';
import { CloseIcon } from '@/components/icons';

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
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
