import React, { useState } from 'react';
import {
  Clock,
  FastForward,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function ClockView({
  simulatedNow,
  donations,
  onAdvanceClock
}) {
  const [customInput, setCustomInput] = useState(simulatedNow || '');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add minutes helper using UTC arithmetic
  const addMinutesToIso = (isoStr, minutesToAdd) => {
    const [datePart, timePart] = isoStr.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    const curMs = Date.UTC(y, m - 1, d, h, min);
    const newDate = new Date(curMs + minutesToAdd * 60000);
    const newY = newDate.getUTCFullYear();
    const newM = String(newDate.getUTCMonth() + 1).padStart(2, '0');
    const newD = String(newDate.getUTCDate()).padStart(2, '0');
    const newH = String(newDate.getUTCHours()).padStart(2, '0');
    const newMin = String(newDate.getUTCMinutes()).padStart(2, '0');
    return `${newY}-${newM}-${newD}T${newH}:${newMin}`;
  };

  const handleQuickAdvance = async (minutes, label) => {
    try {
      setError('');
      setSuccessMsg('');
      setIsSubmitting(true);
      const newTime = addMinutesToIso(simulatedNow, minutes);
      const res = await onAdvanceClock(newTime);
      setSuccessMsg(`Simulated clock advanced by ${label} to ${newTime}. (Converted ${res?.missedClaimsConverted ?? 0} active claims to MISSED).`);
      setCustomInput(newTime);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      if (!customInput) {
        setError('Please select a valid date & time.');
        return;
      }
      if (customInput < simulatedNow) {
        setError(`Clock cannot move backwards. Current: ${simulatedNow}, Requested: ${customInput}`);
        return;
      }
      setIsSubmitting(true);
      const res = await onAdvanceClock(customInput);
      setSuccessMsg(`Simulated clock set to ${customInput}. (Converted ${res?.missedClaimsConverted ?? 0} active claims to MISSED).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulated Time Controller</h1>
          <p className="page-description">
            Control the application-wide simulated clock. All business logic, windows, cancellations, collections, and status transitions adhere strictly to this clock.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Clock controls */}
        <div className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={22} color="var(--primary)" />
            <h3 className="card-title" style={{ margin: 0 }}>Simulated Clock State</h3>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Platform Time
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
              {simulatedNow}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, marginTop: '8px' }}>
              <div className="clock-live-dot" />
              <span>Persisted in SQLite Clock Store</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Fast-Forward Presets</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(15, '15m')}
              >
                +15 Mins
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(30, '30m')}
              >
                +30 Mins
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(60, '1 hour')}
              >
                +1 Hour
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(120, '2 hours')}
              >
                +2 Hours
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(240, '4 hours')}
              >
                +4 Hours
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(1440, '1 day')}
              >
                +1 Day
              </button>
            </div>
          </div>

          <form onSubmit={handleCustomSubmit}>
            <div className="form-group">
              <label className="form-label">Set Custom Simulated Date & Time</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={customInput}
                  min={simulatedNow}
                  onChange={(e) => setCustomInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <FastForward size={16} />
                  <span>Advance</span>
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert-box alert-danger">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <AlertTriangle size={15} />
                <span>Error</span>
              </div>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <CheckCircle2 size={15} />
                <span>Success</span>
              </div>
              <div>{successMsg}</div>
            </div>
          )}
        </div>

        {/* Right Column: Time Windows & Simulation Impact */}
        <div className="content-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Layers size={20} color="var(--primary)" />
            <h3 className="card-title" style={{ margin: 0 }}>Upcoming Donation Deadlines</h3>
          </div>
          <p className="card-subtitle">
            Advancing past these deadlines triggers automated transitions from ACTIVE to MISSED.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {donations.map(d => {
              const isPast = simulatedNow > d.pickup_until;
              const isCurrent = simulatedNow >= d.pickup_from && simulatedNow <= d.pickup_until;

              return (
                <div
                  key={d.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: isPast ? '#fffbeb' : isCurrent ? '#f0fdf4' : '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.88rem' }}>{d.description}</strong>
                    <StatusBadge status={d.status} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pickup Window: {d.pickup_from} → <strong>{d.pickup_until}</strong></span>
                    <span style={{ fontWeight: 600, color: isPast ? '#d97706' : isCurrent ? '#16a34a' : 'var(--text-muted)' }}>
                      {isPast ? 'Expired' : isCurrent ? 'Active Now' : 'Future'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              <Info size={14} color="var(--primary)" />
              <span>Simulated Clock Invariants</span>
            </div>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <li>Never moves backwards under any condition.</li>
              <li>Calculates minute differences with zero timezone drift.</li>
              <li>Replaces system clock for all claim and donation operations.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
