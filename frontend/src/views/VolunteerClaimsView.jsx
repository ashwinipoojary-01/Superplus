import React, { useState } from 'react';
import {
  HandHeart,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  AlertCircle,
  User,
  FastForward,
  CheckCheck,
  Search,
  Filter
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function VolunteerClaimsView({
  claims = [],
  donations = [],
  donors = [],
  currentVolunteer,
  simulatedNow,
  onCollectClaim,
  onCancelClaim,
  onAdvanceClock
}) {
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' | 'all'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingClaimId, setProcessingClaimId] = useState(null);

  // Helper date comparisons using timestamps for robust timezone-safe comparison
  const isTimeBetween = (now, from, until) => {
    if (!now || !from || !until) return false;
    const tNow = new Date(now).getTime();
    const tFrom = new Date(from).getTime();
    const tUntil = new Date(until).getTime();
    return tNow >= tFrom && tNow <= tUntil;
  };

  const isTimeBefore = (t1, t2) => {
    if (!t1 || !t2) return false;
    return new Date(t1).getTime() < new Date(t2).getTime();
  };

  const isTimeAfter = (t1, t2) => {
    if (!t1 || !t2) return false;
    return new Date(t1).getTime() > new Date(t2).getTime();
  };

  const formatShortTime = (isoStr) => {
    if (!isoStr) return '';
    return isoStr.split('T')[1] || isoStr;
  };

  const filteredClaims = claims.filter(c => {
    if (filterMode === 'mine' && c.volunteer_id !== currentVolunteer?.id) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (c.donation_description || '').toLowerCase();
      const vName = (c.volunteer_name || '').toLowerCase();
      const zone = (c.donation_zone || '').toLowerCase();
      if (!desc.includes(q) && !vName.includes(q) && !zone.includes(q)) return false;
    }
    return true;
  });

  const handleCollect = async (claimId) => {
    try {
      setProcessingClaimId(claimId);
      await onCollectClaim(claimId, currentVolunteer.id);
    } catch (err) {
      // error handled via toast in App
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleCancel = async (claimId) => {
    if (!window.confirm('Are you sure you want to cancel this claim? Its kilograms will be immediately restored to the open donation pool.')) {
      return;
    }
    try {
      setProcessingClaimId(claimId);
      await onCancelClaim(claimId, currentVolunteer.id);
    } catch (err) {
      // error handled via toast in App
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleJumpClock = async (targetTime) => {
    if (!onAdvanceClock) return;
    try {
      await onAdvanceClock(targetTime);
    } catch (err) {
      // Toast displayed by parent
    }
  };

  const myClaimsCount = claims.filter(c => c.volunteer_id === currentVolunteer?.id).length;

  return (
    <div className="view-body">
      <div className="view-hero">
        <div>
          <h1 className="view-title">Volunteer Claims & Deliveries</h1>
          <p className="view-subtitle">
            Manage your food rescue commitments. Active Volunteer: <strong style={{ color: 'var(--deep-green)' }}>{currentVolunteer?.name || 'None'}</strong> (Max Capacity: {currentVolunteer?.capacity || 0}kg · Eligible Zones: {currentVolunteer?.eligible_zones?.join(', ')}).
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-toolbar">
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <button
              className={`filter-btn ${filterMode === 'mine' ? 'active' : ''}`}
              onClick={() => setFilterMode('mine')}
            >
              My Claims ({myClaimsCount})
            </button>
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Volunteer Claims ({claims.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            <select
              className="person-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ border: 'none', padding: '0 0.25rem', fontSize: '0.80rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COLLECTED">COLLECTED</option>
              <option value="MISSED">MISSED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search claims or food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'inherit', width: '180px' }}
            />
          </div>
        </div>
      </div>

      {/* Claims Content */}
      {filteredClaims.length === 0 ? (
        <div className="content-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <HandHeart size={28} />
            </div>
            <h4 style={{ fontWeight: 700, color: 'var(--deep-green)', fontSize: '1.1rem' }}>No Claims Found</h4>
            <p style={{ maxWidth: '420px', fontSize: '0.85rem' }}>
              {filterMode === 'mine'
                ? `You have no ${statusFilter !== 'all' ? statusFilter : ''} claims yet. Browse open donations to reserve surplus food for rescue!`
                : 'No claims match the selected criteria.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="content-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Volunteer</th>
                  <th>Donation Details</th>
                  <th>Donor</th>
                  <th>Zone</th>
                  <th>Quantity</th>
                  <th>Planned Pickup</th>
                  <th>Pickup Window</th>
                  <th>Status</th>
                  <th style={{ minWidth: '220px' }}>Actions & Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map(claim => {
                  const isOwner = claim.volunteer_id === currentVolunteer?.id;
                  const isActive = claim.status === 'ACTIVE';

                  // Robust ISO timestamp comparison
                  const isDuringPickup = isTimeBetween(simulatedNow, claim.donation_pickup_from, claim.donation_pickup_until);
                  const isBeforePickup = isTimeBefore(simulatedNow, claim.donation_pickup_from);
                  const isAfterPickup = isTimeAfter(simulatedNow, claim.donation_pickup_until);

                  // Collection rule: ACTIVE, volunteer is claim owner, simulatedNow within pickup window inclusive
                  const canCollect = isActive && isOwner && isDuringPickup;

                  let collectReason = null;
                  if (!isActive) {
                    collectReason = { text: `Claim is ${claim.status}`, type: 'muted' };
                  } else if (!isOwner) {
                    collectReason = { text: `Owned by ${claim.volunteer_name}`, type: 'info' };
                  } else if (isBeforePickup) {
                    collectReason = {
                      text: `Available during pickup window (starts ${formatShortTime(claim.donation_pickup_from)})`,
                      type: 'warning',
                      canJump: true,
                      jumpTime: claim.donation_pickup_from
                    };
                  } else if (isAfterPickup) {
                    collectReason = {
                      text: `Pickup window ended at ${formatShortTime(claim.donation_pickup_until)}`,
                      type: 'danger'
                    };
                  }

                  // Cancellation rule: ACTIVE, volunteer is claim owner, simulatedNow strictly before planned pickup time
                  const canCancel = isActive && isOwner && isTimeBefore(simulatedNow, claim.planned_pickup_time);

                  let cancelReason = '';
                  if (!isActive) cancelReason = `Claim is ${claim.status}`;
                  else if (!isOwner) cancelReason = `Owned by ${claim.volunteer_name}`;
                  else if (!isTimeBefore(simulatedNow, claim.planned_pickup_time)) {
                    cancelReason = `Simulated time is at or past planned pickup (${formatShortTime(claim.planned_pickup_time)}). Cancellation refused.`;
                  }

                  // Find donor name
                  const donor = donors.find(d => d.id === claim.donor_id);
                  const donorName = donor?.name || claim.donor_name || 'Commercial Donor';

                  return (
                    <tr key={claim.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {claim.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{claim.volunteer_name}</span>
                          {isOwner && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: 'var(--fresh-green-light)', color: 'var(--deep-green)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: '220px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {claim.donation_description}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                          <Building2 size={13} color="var(--deep-green)" />
                          <span>{donorName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="donation-zone-tag">
                          <MapPin size={12} />
                          <span>{claim.donation_zone}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--fresh-green)', fontSize: '0.96rem' }}>
                          {claim.quantity} kg
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                          <Clock size={13} color="#2563EB" />
                          <span>{claim.planned_pickup_time}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <div>{claim.donation_pickup_from}</div>
                        <div style={{ fontSize: '0.72rem' }}>to {claim.donation_pickup_until}</div>
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td>
                        {claim.status === 'COLLECTED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--deep-green)', fontWeight: 600, fontSize: '0.80rem' }}>
                            <CheckCheck size={16} color="var(--fresh-green)" />
                            <span>Collected & Fulfilled</span>
                          </div>
                        ) : isActive && isOwner ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!canCollect || processingClaimId === claim.id}
                                onClick={() => handleCollect(claim.id)}
                                title={canCollect ? 'Confirm food collection inside pickup window' : (collectReason?.text || 'Collection disabled')}
                              >
                                <CheckCircle2 size={14} />
                                <span>{processingClaimId === claim.id ? 'Collecting...' : 'Collect'}</span>
                              </button>

                              <button
                                className="btn btn-danger btn-sm"
                                disabled={!canCancel || processingClaimId === claim.id}
                                onClick={() => handleCancel(claim.id)}
                                title={canCancel ? 'Cancel claim before planned pickup time' : cancelReason}
                              >
                                <XCircle size={14} />
                                <span>Cancel</span>
                              </button>
                            </div>

                            {/* Inline exact reason why disabled */}
                            {!canCollect && collectReason && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span className={`reason-pill reason-pill-${collectReason.type}`}>
                                  <AlertCircle size={12} />
                                  <span>{collectReason.text}</span>
                                </span>
                                {collectReason.canJump && onAdvanceClock && (
                                  <button
                                    className="btn-quick-jump"
                                    onClick={() => handleJumpClock(collectReason.jumpTime)}
                                    title="Advance simulated clock to start of pickup window"
                                  >
                                    Set Clock to Window
                                  </button>
                                )}
                              </div>
                            )}

                            {!canCancel && cancelReason && (
                              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                {cancelReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {!isActive ? `Closed (${claim.status})` : `Owned by ${claim.volunteer_name}`}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
