import React from 'react';
import { Bell, BellRing, Check, X } from 'lucide-react';
import type { OrmNotification, UserRoleProfile } from '../types/orm';
import { RiskTierBadge } from './RiskVisuals';

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
  user: UserRoleProfile;
  notifications: OrmNotification[];
  onMarkRead: (notif: OrmNotification) => Promise<void>;
  onSelectOrm: (ormId: string) => void;
  pushPermission: NotificationPermission | 'unsupported';
  onEnablePush: () => Promise<void>;
  pushStatusMessage: string | null;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  onClose,
  user,
  notifications,
  onMarkRead,
  onSelectOrm,
  pushPermission,
  onEnablePush,
  pushStatusMessage,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-drawer-title"
    >
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="notifications-drawer-title"
              className="font-display text-2xl font-bold text-slate-900 tracking-tight"
            >
              Mission Alerts & Push Inbox
            </h2>
            <p className="text-xs text-slate-500">
              FCM push notifications and real-time MDA sign-off updates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FCM Push Permission Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <BellRing className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
              <span>
                {pushPermission === 'granted'
                  ? 'Push alerts enabled on this device'
                  : pushPermission === 'unsupported'
                    ? 'In-app alerts active (browser lacks Push API)'
                    : 'Enable device push alerts for >= 6 pt MDA escalations'}
              </span>
            </div>
            {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={() => void onEnablePush()}
                className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Enable Push
              </button>
            )}
          </div>
          {pushStatusMessage && (
            <p className="mt-2 text-xs text-[#2E7D32] font-medium">{pushStatusMessage}</p>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700">No mission alerts yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Elevated ORM submissions (score &ge; 6) and command sign-off decisions will appear
                here immediately.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = notif.readBy.includes(user.uid);
              return (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors ${isRead ? 'bg-white' : 'bg-amber-50/40'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <RiskTierBadge level={notif.riskLevel} score={notif.score} compact />
                    <span className="font-mono-data text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">{notif.title}</p>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.body}</p>

                  {notif.topRiskDrivers.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Drivers: </span>
                      {notif.topRiskDrivers.join(' · ')}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void onMarkRead(notif);
                        onSelectOrm(notif.ormId);
                        onClose();
                      }}
                      className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      Open Mission ORM
                    </button>

                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => void onMarkRead(notif)}
                        className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Mark Read</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
