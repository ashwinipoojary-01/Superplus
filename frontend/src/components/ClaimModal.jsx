import React, { useState, useEffect } from 'react';
import {
  HandHeart,
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  MapPin,
  Check
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ClaimModal({
  isOpen,
  onClose,
  donation,
  volunteer,
  simulatedNow,
  onSubmitClaim
}) {
  const [quantity, setQuantity] = useState(1);
  const [plannedTime, setPlannedTime] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (donation && isOpen) {
      // Suggest reasonable initial quantity
      const maxInitial = Math.min(donation.remaining_quantity || 1, volunteer?.capacity || 1);
      setQuantity(Math.max(1, Math.min(5, maxInitial)));

      // Suggest initial pickup time: simulatedNow if within pickup window, else donation.pickup_from
      let initialTime = donation.pickup_from;
      if (simulatedNow && simulatedNow >= donation.pickup_from && simulatedNow <= donation.pickup_until) {
        initialTime = simulatedNow;
      }
      setPlannedTime(initialTime);
      setValidationErrors([]);
      setGeneralError('');
    }
  }, [donation, volunteer, simulatedNow, isOpen]);

  if (!isOpen || !donation || !volunteer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors([]);
    setGeneralError('');
    setIsSubmitting(true);

    try {
      await onSubmitClaim({
        donationId: donation.id,
        volunteerId: volunteer.id,
        quantity: parseInt(quantity, 10),
        plannedPickupTime: plannedTime
      });
      onClose();
    } catch (err) {
      if (err.validationErrors && err.validationErrors.length > 0) {
        setValidationErrors(err.validationErrors);
      } else {
        setGeneralError(err.message || 'Failed to submit claim.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isZoneEligible = volunteer.eligible_zones?.includes(donation.zone);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <HandHeart size={20} color="var(--fresh-green)" />
            <span>Reserve Surplus Food</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Donation Summary Box */}
            <div style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.90rem', fontWeight: 700, color: 'var(--deep-green)' }}>
                  {donation.description}
                </span>
                <StatusBadge status={donation.status} />
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>Zone: <strong>{donation.zone}</strong></div>
                <div>Remaining: <strong style={{ color: 'var(--fresh-green)' }}>{donation.remaining_quantity}kg</strong> (Total: {donation.total_quantity}kg)</div>
                <div style={{ gridColumn: 'span 2' }}>
                  Pickup Window: <strong>{donation.pickup_from}</strong> to <strong>{donation.pickup_until}</strong>
                </div>
              </div>
            </div>

            {/* Volunteer Context Banner */}
            <div style={{ backgroundColor: 'var(--fresh-green-light)', border: '1px solid #BCE2CD', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.80rem', color: 'var(--deep-green)' }}>
              <div>Claiming as: <strong>{volunteer.name}</strong></div>
              <div>Max Volunteer Capacity: <strong>{volunteer.capacity}kg</strong> | Eligible Zones: <strong>{volunteer.eligible_zones?.join(', ')}</strong></div>
              {!isZoneEligible && (
                <div style={{ color: '#DC2626', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={13} />
                  <span>Notice: Donation zone '{donation.zone}' is outside your registered zones!</span>
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label className="form-label">
                Quantity to Claim (positive whole kg)
              </label>
              <input
                type="number"
                className="form-input"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <div className="form-hint">
                Must be positive integer. Max available is {donation.remaining_quantity}kg; your capacity is {volunteer.capacity}kg.
              </div>
            </div>

            {/* Planned Pickup Time Input */}
            <div className="form-group">
              <label className="form-label">
                Planned Pickup Time (T)
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                required
              />
              <div className="form-hint">
                Must fall inside pickup window ({donation.pickup_from} to {donation.pickup_until}), ≥ simulated now ({simulatedNow}), and ≥ 60 mins from other active/collected claims.
              </div>
            </div>

            {/* Validation Errors from Backend */}
            {validationErrors.length > 0 && (
              <div className="alert-box alert-danger">
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                    Claim Refused: {validationErrors.length} Business Rules Violated
                  </div>
                  <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {validationErrors.map((err, idx) => (
                      <li key={idx} style={{ fontSize: '0.80rem' }}>
                        <strong>[{err.rule}]:</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {generalError && (
              <div className="alert-box alert-danger">
                <AlertTriangle size={18} />
                <span>{generalError}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <HandHeart size={15} />
              <span>{isSubmitting ? 'Validating Claim...' : 'Confirm Claim'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
