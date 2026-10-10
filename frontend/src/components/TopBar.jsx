import React from 'react';
import {
  Clock,
  FastForward,
  Building2,
  User,
  ShieldCheck,
  MapPin,
  ChevronRight
} from 'lucide-react';

export default function TopBar({
  activeSection,
  simulatedNow,
  role,
  setRole,
  selectedPersonId,
  setSelectedPersonId,
  donors = [],
  volunteers = [],
  onOpenClockModal
}) {
  const currentVolunteer = volunteers.find(v => v.id === selectedPersonId) || volunteers[0];
  const currentDonor = donors.find(d => d.id === selectedPersonId) || donors[0];

  // Map section to page title and subtitle
  const sectionMeta = {
    dashboard: {
      title: 'Operations Dashboard',
      subtitle: 'Real-time food rescue analytics, impact metrics, and reconciled physical accounting.'
    },
    donations: {
      title: 'Browse Surplus Donations',
      subtitle: 'Discover available food rescue batches posted by local grocers and bakeries.'
    },
    claims: {
      title: 'Volunteer Claims & Pickup',
      subtitle: 'Manage your active reservations, collect orders during pickup windows, and track fulfillment.'
    },
    manage: {
      title: 'Donor Surplus Inventory',
      subtitle: 'Publish fresh surplus food batches and monitor volunteer distribution claims.'
    },
    reports: {
      title: 'Impact & Reconciliation Audit',
      subtitle: 'Full transparent reporting of rescued kilograms, volunteer operations, and accounting balance.'
    }
  };

  const meta = sectionMeta[activeSection] || {
    title: 'SurplusLink Food Rescue',
    subtitle: 'Connecting commercial food surplus with community volunteer distributors.'
  };

  const formatTimeDisplay = (isoStr) => {
    if (!isoStr) return '--:--';
    const [date, time] = isoStr.split('T');
    return `${date} · ${time}`;
  };

  const currentInitials = role === 'volunteer'
    ? (currentVolunteer?.name?.split(' ').map(n => n[0]).join('') || 'V')
    : (currentDonor?.name?.split(' ').map(n => n[0]).join('') || 'D');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div className="page-header-title">{meta.title}</div>
          <div className="page-header-subtitle">{meta.subtitle}</div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Simulated Clock Pill */}
        <div className="clock-pill">
          <div className="clock-live-dot" />
          <Clock size={15} />
          <span>Clock: <strong>{formatTimeDisplay(simulatedNow)}</strong></span>
          <button
            className="btn btn-forest btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem', height: '24px' }}
            onClick={onOpenClockModal}
            title="Advance Simulated Clock"
          >
            <FastForward size={12} />
            <span>Advance</span>
          </button>
        </div>

        {/* Role & Persona Switcher */}
        <div className="role-persona-card">
          <div className="role-toggle-group">
            <button
              className={`role-toggle-btn ${role === 'volunteer' ? 'active' : ''}`}
              onClick={() => {
                setRole('volunteer');
                if (volunteers.length > 0) {
                  const alreadySelected = volunteers.some(v => v.id === selectedPersonId);
                  if (!alreadySelected) setSelectedPersonId(volunteers[0].id);
                }
              }}
            >
              <User size={13} />
              <span>Volunteer</span>
            </button>
            <button
              className={`role-toggle-btn ${role === 'donor' ? 'active' : ''}`}
              onClick={() => {
                setRole('donor');
                if (donors.length > 0) {
                  const alreadySelected = donors.some(d => d.id === selectedPersonId);
                  if (!alreadySelected) setSelectedPersonId(donors[0].id);
                }
              }}
            >
              <Building2 size={13} />
              <span>Donor</span>
            </button>
          </div>

          {role === 'volunteer' ? (
            <select
              className="person-select"
              value={selectedPersonId || ''}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              title="Switch active volunteer persona"
            >
              {volunteers.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} (Cap: {v.capacity}kg | Zones: {v.eligible_zones?.join(', ')})
                </option>
              ))}
            </select>
          ) : (
            <select
              className="person-select"
              value={selectedPersonId || ''}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              title="Switch active donor persona"
            >
              {donors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.address?.split(',')[0] || d.address})
                </option>
              ))}
            </select>
          )}

          {/* User Avatar with Initials */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--deep-green)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(23, 77, 60, 0.2)'
            }}
            title={role === 'volunteer' ? `Active: ${currentVolunteer?.name}` : `Active: ${currentDonor?.name}`}
          >
            {currentInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
