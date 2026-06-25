import {
  AlertCircle,
  CheckCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

/** [v2] Portfolio StatCard — text-3xl number + text-sm label below */
export function StatCard({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <p className="text-3xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}

/** [v2] Card shell — p-6, slate border */
export function DashboardCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900/50 p-6 ${className}`}
    >
      {title ? (
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}

export type StatusKind = "trigger_alert" | "record_only" | "pay_for_service";

const STATUS_CONFIG: Record<
  StatusKind,
  { Icon: LucideIcon; className: string }
> = {
  trigger_alert: { Icon: AlertCircle, className: "text-red-500" },
  record_only: { Icon: Info, className: "text-slate-500" },
  pay_for_service: { Icon: CheckCircle, className: "text-emerald-500" },
};

/** [v2] Status badge — lucide icon + semantic color */
export function StatusBadge({
  kind,
  label,
}: {
  kind: StatusKind;
  label: string;
}) {
  const { Icon, className } = STATUS_CONFIG[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
