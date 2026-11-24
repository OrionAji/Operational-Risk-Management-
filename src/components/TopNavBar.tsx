import React, { useState } from 'react';
import { Bell, LogOut, WifiOff, CloudUpload } from 'lucide-react';
import type { ThemePreference, UserRoleProfile } from '../types/orm';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggleButton } from './ThemeToggleButton';

export type ActiveTab = 'my-orm' | 'command-queue' | 'admin';

interface TopNavBarProps {
  user: UserRoleProfile;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingQueueCount: number;
  pendingUsersCount: number;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onSignOut: () => Promise<void>;
  isOnline: boolean;
  pendingSyncCount: number;
  theme: ThemePreference;
  onToggleTheme: () => void;
}

const EMBLEM_SRC = '/assets/aistudio/407_Logo_without_BG_309bff86.png';

export const TopNavBar: React.FC<TopNavBarProps> = ({
  user,
  activeTab,
  onSelectTab,
  pendingQueueCount,
  pendingUsersCount,
  unreadNotificationsCount,
  onOpenNotifications,
  onSignOut,
  isOnline,
  pendingSyncCount,
  theme,
  onToggleTheme,
}) => {
  const [emblemFailed, setEmblemFailed] = useState(false);
  const hasCommandAccess = user.commandRole !== 'Pilot' || user.isAdmin;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Title (single line) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!emblemFailed ? (
              <img
                src={EMBLEM_SRC}
                alt="407 ACTG Emblem"
                referrerPolicy="no-referrer"
                onError={() => setEmblemFailed(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950 font-display font-bold text-sm flex items-center justify-center">
                407
              </div>
            )}
            <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              407 ACTG ORM
            </span>
          </div>

          {/* Zone 2: Desktop Single-Line Navigation Tabs */}
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => onSelectTab('my-orm')}
              aria-current={activeTab === 'my-orm' ? 'page' : undefined}
              className={`relative py-5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'my-orm'
                  ? 'text-slate-950 dark:text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0F172A] dark:after:bg-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              My Flight ORM
            </button>

            {hasCommandAccess && (
              <button
                type="button"
                onClick={() => onSelectTab('command-queue')}
                aria-current={activeTab === 'command-queue' ? 'page' : undefined}
                className={`relative py-5 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'command-queue'
                    ? 'text-slate-950 dark:text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0F172A] dark:after:bg-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>Command Sign-Off Queue</span>
                {pendingQueueCount > 0 && (
                  <span className="font-mono-data text-xs font-semibold text-[#C62828] dark:text-[#F87171]">
                    ({pendingQueueCount})
                  </span>
                )}
              </button>
            )}

            {user.isAdmin && (
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                className={`relative py-5 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'admin'
                    ? 'text-slate-950 dark:text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0F172A] dark:after:bg-slate-100'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>Admin Directory</span>
                {pendingUsersCount > 0 && (
                  <span className="font-mono-data text-xs font-semibold text-[#B45309] dark:text-[#FBBF24]">
                    ({pendingUsersCount})
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Zone 3: Actions (Theme Toggle, Notifications, PWA Install, Account/Sign-Out) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />

            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={`Notifications${unreadNotificationsCount > 0 ? `, ${unreadNotificationsCount} unread` : ''}`}
              className="relative min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C62828] text-white font-mono-data text-[10px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <div className="hidden lg:flex flex-col items-end leading-tight pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[140px] truncate">
                {user.displayName}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {user.commandRole}
                {user.isAdmin ? ' · Admin' : ''}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void onSignOut()}
              aria-label="Sign out"
              className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Strip (non-sticky so mobile viewport maintains >85% open reading area) */}
      {(hasCommandAccess || user.isAdmin) && (
        <nav
          aria-label="Mobile sections"
          className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 flex items-center gap-1.5 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => onSelectTab('my-orm')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'my-orm'
                ? 'bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            My Flight ORM
          </button>

          {hasCommandAccess && (
            <button
              type="button"
              onClick={() => onSelectTab('command-queue')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'command-queue'
                  ? 'bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Command Queue {pendingQueueCount > 0 ? `(${pendingQueueCount})` : ''}
            </button>
          )}

          {user.isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'admin'
                  ? 'bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Admin {pendingUsersCount > 0 ? `(${pendingUsersCount})` : ''}
            </button>
          )}
        </nav>
      )}

      {/* Offline / Pending Sync Banner (only visible when offline or syncing queued local writes) */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div
          role="status"
          className="px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2"
          style={{
            backgroundColor: !isOnline ? '#F57F17' : '#0F172A',
            color: !isOnline ? '#0F172A' : '#FFFFFF',
          }}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Offline Mode — ORMs are cached locally and will auto-sync to Firestore once
                reconnected.
              </span>
            </>
          ) : (
            <>
              <CloudUpload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Syncing {pendingSyncCount} offline ORM record{pendingSyncCount === 1 ? '' : 's'} to
                Cloud Firestore...
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
};
