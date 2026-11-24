import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../types/orm';

interface ThemeToggleButtonProps {
  theme: ThemePreference;
  onToggle: () => void;
  variant?: 'default' | 'overlay';
  saving?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  theme,
  onToggle,
  variant = 'default',
  saving = false,
}) => {
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const variantClasses =
    variant === 'overlay'
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-xs'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      data-testid="theme-toggle-button"
      className={`min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 disabled:opacity-60 ${variantClasses}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
};
