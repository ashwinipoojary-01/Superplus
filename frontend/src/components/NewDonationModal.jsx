import React, { useState, useEffect } from 'react';
import { Store, AlertTriangle, X, PlusCircle, Calendar, Clock, MapPin } from 'lucide-react';

export default function NewDonationModal({
  isOpen,
  onClose,
  donor,
  simulatedNow,
  onSubmitDonation
}) {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(15);
  const [zone, setZone] = useState('Downtown');
  const [pickupFrom, setPickupFrom] = useState('');
  const [pickupUntil, setPickupUntil] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && simulatedNow) {
      setDescription('');
      setQuantity(15);
      setErrors([]);

      // Auto-detect donor default zone based on address
      if (donor?.address?.includes('Downtown')) setZone('Downtown');
      else if (donor?.address?.includes('Uptown')) setZone('Uptown');
      else if (donor?.address?.includes('Northside')) setZone('Northside');
      else setZone('Downtown');

      // Default pickup window: starting at current simulated time, ending +4 hours later
      setPickupFrom(simulatedNow);

      const [datePart, timePart] = simulatedNow.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      const [h, min] = timePart.split(':').map(Number);
      const untilMs = Date.UTC(y, m - 1, d, h + 4, min);
      const untilDate = new Date(untilMs);
      const uY = untilDate.getUTCFullYear();
      const uM = String(untilDate.getUTCMonth() + 1).padStart(2, '0');
      const uD = String(untilDate.getUTCDate()).padStart(2, '0');
      const uH = String(untilDate.getUTCHours()).padStart(2, '0');
      const uMin = String(untilDate.getUTCMinutes()).padStart(2, '0');
      setPickupUntil(`${uY}-${uM}-${uD}T${uH}:${uMin}`);
    }
  }, [isOpen, simulatedNow, donor]);

  if (!isOpen || !donor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    try {
      await onSubmitDonation({
        donorId: donor.id,
        description: description.trim(),
        quantity: parseInt(quantity, 10),
        pickup_from: pickupFrom,
        pickup_until: pickupUntil,
        zone
      });
      onClose();
    } catch (err) {
      if (err.details && err.details.length > 0) {
        setErrors(err.details);
      } else {
        setErrors([err.message || 'Failed to list donation.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <PlusCircle size={20} color="var(--fresh-green)" />
            <span>Post Surplus Food Batch</span>
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
            {/* Donor context info */}
            <div style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.80rem' }}>
              <div>Posting as: <strong style={{ color: 'var(--deep-green)' }}>{donor.name}</strong></div>
              <div style={{ color: 'var(--text-muted)' }}>Location: {donor.address} · Phone: {donor.phone}</div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                Food Description & Packaging
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. 20kg Artisan multigrain baguettes, freshly baked today, packed in crates"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Quantity & Zone row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Total Quantity (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <div className="form-hint">Must be positive integer</div>
              </div>

              <div className="form-group">
                <label className="form-label">Distribution Zone</label>
                <select
                  className="form-select"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  required
                >
                  <option value="Downtown">Downtown</option>
                  <option value="Uptown">Uptown</option>
                  <option value="Northside">Northside</option>
                </select>
                <div className="form-hint">Zone of pickup origin</div>
              </div>
            </div>

            {/* Pickup Windows */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Pickup Window Start</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={pickupFrom}
                  onChange={(e) => setPickupFrom(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pickup Window End</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={pickupUntil}
                  onChange={(e) => setPickupUntil(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-hint" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              Pickup end must be strictly after start, and cannot be before current simulated time ({simulatedNow}).
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <div className="alert-box alert-danger">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '3px' }}>Validation Refused</div>
                  <ul style={{ paddingLeft: '1.1rem', fontSize: '0.80rem' }}>
                    {errors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <PlusCircle size={15} />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Surplus Batch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
