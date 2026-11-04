import { LogOut, Waves } from 'lucide-react';
import type { ReactNode } from 'react';

type AppHeaderProps = {
  subtitle: string;
  userLabel: string;
  onSignOut: () => void;
  actions?: ReactNode;
};

export default function AppHeader({ subtitle, userLabel, onSignOut, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-[500] border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <Waves className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-[1.2] text-slate-900">RiverGuard</p>
            <p className="truncate text-xs leading-[1.5] text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 md:block">{userLabel}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
