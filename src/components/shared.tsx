import { useEffect, useState } from 'react';

// ─── Status Pill ────────────────────────────────────────────────────────────────
interface StatusPillProps {
  label: string;
  value: string | number;
}
export function StatusPill({ label, value }: StatusPillProps) {
  return (
    <div className="status-pill">
      <span className="status-pill__label">{label}</span>
      <span className="status-pill__value">{value}</span>
    </div>
  );
}

// ─── Timer Progress Bar ─────────────────────────────────────────────────────────
interface TimerBarProps {
  pct: number; // 0–100
}
export function TimerBar({ pct }: TimerBarProps) {
  return (
    <div className="timer-progress-bar">
      <div className="timer-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Category / Status badge ─────────────────────────────────────────────────────
import type { GroupCategory, GroupStatus } from '../types';
import { getCategoryLabel } from '../services/dataService';

export function CategoryBadge({ category }: { category: GroupCategory }) {
  const cls = ['girlGroup', 'femaleSoloist'].includes(category)
    ? 'badge--girl'
    : ['boyGroup', 'maleSoloist'].includes(category)
      ? 'badge--boy'
      : 'badge--soloist';
  const isSolo = category === 'femaleSoloist' || category === 'maleSoloist';
  const icon = ['girlGroup', 'femaleSoloist'].includes(category) ? '♀' : '♂';
  return (
    <span className={`badge ${cls} ${isSolo ? 'badge--soloist' : ''}`}>
      {icon} {getCategoryLabel(category)}
    </span>
  );
}

export function StatusBadge({ status }: { status: GroupStatus }) {
  return (
    <span className={`badge ${status === 'active' ? 'badge--active' : 'badge--inactive'}`}>
      {status === 'active' ? 'Actif' : 'Inactif'}
    </span>
  );
}

// ─── Toast notification ─────────────────────────────────────────────────────────
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  };

  const ToastEl = message ? <div className="toast">{message}</div> : null;
  return { showToast, ToastEl };
}

// ─── Empty state ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__text">{text}</div>
    </div>
  );
}

// ─── Countdown hook ───────────────────────────────────────────────────────────────
export function useCountdown(seconds: number, running: boolean, onEnd?: () => void) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const t = setTimeout(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) onEnd?.();
        return next;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [running, remaining, onEnd]);

  const reset = () => setRemaining(seconds);
  const pct = seconds > 0 ? (remaining / seconds) * 100 : 100;
  return { remaining, pct, reset };
}
