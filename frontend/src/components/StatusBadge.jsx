import React from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Ban
} from 'lucide-react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const cleanStatus = status.toUpperCase();

  const config = {
    OPEN: { label: 'Open', icon: Sparkles },
    FULLY_CLAIMED: { label: 'Fully Claimed', icon: CheckCheck },
    EXPIRED: { label: 'Expired', icon: AlertTriangle },
    CANCELLED: { label: 'Cancelled', icon: Ban },
    ACTIVE: { label: 'Active', icon: Clock },
    COLLECTED: { label: 'Collected', icon: CheckCircle2 },
    MISSED: { label: 'Missed', icon: AlertOctagon }
  };

  const item = config[cleanStatus] || { label: cleanStatus, icon: null };
  const Icon = item.icon;

  return (
    <span className={`badge badge-${cleanStatus}`}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      <span>{item.label}</span>
    </span>
  );
}
