import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, X, FastForward } from 'lucide-react';

export default function ClockModal({ isOpen, onClose, currentSimulatedNow, onAdvanceClock }) {
  const [customDateTime, setCustomDateTime] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentSimulatedNow) {
      setCustomDateTime(currentSimulatedNow);
      setError('');
    }
  }, [currentSimulatedNow, isOpen]);

  if (!isOpen) return null;

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

  const handleQuickAdvance = async (minutes) => {
    try {
      setError('');
      setIsSubmitting(true);
      const newTime = addMinutesToIso(currentSimulatedNow, minutes);
      await onAdvanceClock(newTime);
      onClose();
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
      if (!customDateTime) {
        setError('Please select a valid date and time.');
        return;
      }
      if (customDateTime < currentSimulatedNow) {
        setError(`Clock cannot move backwards. Selected: ${customDateTime}, Current: ${currentSimulatedNow}`);
        return;
      }
      setIsSubmitting(true);
      await onAdvanceClock(customDateTime);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Clock size={20} color="var(--fresh-green)" />
            <span>Advance Simulated Clock</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Current Simulated Time
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--deep-green)', marginTop: '2px' }}>
              {currentSimulatedNow}
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div className="form-label">Quick Advance Shortcuts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(15)}
              >
                +15 Mins
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(30)}
              >
                +30 Mins
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(60)}
              >
                +1 Hour
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(120)}
              >
                +2 Hours
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(240)}
              >
                +4 Hours
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
                onClick={() => handleQuickAdvance(1440)}
              >
                +1 Day
              </button>
            </div>
          </div>

          <form onSubmit={handleCustomSubmit}>
            <div className="form-group">
              <label className="form-label">Set Specific Target Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                value={customDateTime}
                min={currentSimulatedNow}
                onChange={(e) => setCustomDateTime(e.target.value)}
                required
              />
              <div className="form-hint">
                Must be at or after current simulated time ({currentSimulatedNow}). Moving backwards is strictly refused.
              </div>
            </div>

            {error && (
              <div className="alert-box alert-danger">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Validation Error</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            <div style={{ backgroundColor: 'var(--fresh-green-light)', border: '1px solid #BCE2CD', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--deep-green)' }}>
              <strong>Automated Simulation Engine:</strong> Advancing past any donation's pickup window end time will automatically convert all its ACTIVE claims to <code>MISSED</code> and its remaining kilograms to <code>WASTED</code>.
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-forest" disabled={isSubmitting}>
                <FastForward size={16} />
                <span>{isSubmitting ? 'Advancing...' : 'Advance Clock'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
