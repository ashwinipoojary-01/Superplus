import React, { useState } from 'react';
import {
  Store,
  PlusCircle,
  XCircle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  CheckCircle2,
  Package,
  Calendar,
  Building2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function ManageDonationsView({
  donations = [],
  claims = [],
  currentDonor,
  simulatedNow,
  onOpenNewDonationModal,
  onCancelDonation
}) {
  const [filterMode, setFilterMode] = useState('mine'); // 'mine' | 'all'
  const [expandedDonationId, setExpandedDonationId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const filteredDonations = donations.filter(d => {
    if (filterMode === 'mine' && d.donor_id !== currentDonor?.id) return false;
    return true;
  });

  const handleCancel = async (donationId) => {
    if (!window.confirm('Are you sure you want to cancel this donation? This action is permanent and prevents any further claims.')) {
      return;
    }
    try {
      setProcessingId(donationId);
      await onCancelDonation(donationId, currentDonor.id);
    } catch (err) {
      // error handled via toast in parent
    } finally {
      setProcessingId(null);
    }
  };

  const toggleExpand = (donationId) => {
    setExpandedDonationId(prev => prev === donationId ? null : donationId);
  };

  const myDonationsCount = donations.filter(d => d.donor_id === currentDonor?.id).length;

  return (
    <div className="view-body">
      <div className="view-hero">
        <div>
          <h1 className="view-title">Manage Surplus Inventory</h1>
          <p className="view-subtitle">
            Publish fresh surplus food batches and monitor distribution claims. Active donor: <strong style={{ color: 'var(--deep-green)' }}>{currentDonor?.name || 'None'}</strong> ({currentDonor?.address}).
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={onOpenNewDonationModal}
          disabled={!currentDonor}
        >
          <PlusCircle size={18} />
          <span>Post Surplus Food</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <button
            className={`filter-btn ${filterMode === 'mine' ? 'active' : ''}`}
            onClick={() => setFilterMode('mine')}
          >
            My Donations ({myDonationsCount})
          </button>
          <button
            className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Donors ({donations.length})
          </button>
        </div>
      </div>

      {/* Donations List / Table */}
      {filteredDonations.length === 0 ? (
        <div className="content-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Store size={28} />
            </div>
            <h4 style={{ fontWeight: 700, color: 'var(--deep-green)', fontSize: '1.1rem' }}>No Surplus Batches Listed</h4>
            <p style={{ maxWidth: '420px', fontSize: '0.85rem' }}>
              {filterMode === 'mine'
                ? `You have not posted any surplus food batches yet. Click "Post Surplus Food" to list fresh food for community pickup.`
                : 'No donations found.'}
            </p>
            {filterMode === 'mine' && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
                onClick={onOpenNewDonationModal}
              >
                <PlusCircle size={16} />
                <span>Post Your First Batch</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="content-card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Description</th>
                  <th>Zone</th>
                  <th>Total Supply</th>
                  <th>Remaining</th>
                  <th>Pickup Window</th>
                  <th>Status</th>
                  <th>Claims</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map(don => {
                  const isOwner = don.donor_id === currentDonor?.id;
                  const isExpanded = expandedDonationId === don.id;
                  const relatedClaims = claims.filter(c => c.donation_id === don.id);
                  const activeOrCollected = relatedClaims.filter(c => c.status === 'ACTIVE' || c.status === 'COLLECTED');

                  // Cancellation rule: donation must be OPEN, owned by donor, and have NO active or collected claims
                  const canCancel = isOwner && don.status === 'OPEN' && activeOrCollected.length === 0;

                  let cancelDisabledReason = '';
                  if (!isOwner) cancelDisabledReason = 'Owned by another donor';
                  else if (don.status !== 'OPEN') cancelDisabledReason = `Donation is ${don.status} (only OPEN can be cancelled)`;
                  else if (activeOrCollected.length > 0) cancelDisabledReason = `Has ${activeOrCollected.length} active/collected claim(s)`;

                  return (
                    <React.Fragment key={don.id}>
                      <tr>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {don.id}
                        </td>
                        <td style={{ maxWidth: '240px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {don.description}
                          </div>
                        </td>
                        <td>
                          <span className="donation-zone-tag">
                            <MapPin size={12} />
                            <span>{don.zone}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{don.total_quantity} kg</span>
                        </td>
                        <td>
                          <strong style={{ color: don.remaining_quantity > 0 ? 'var(--fresh-green)' : 'var(--text-muted)', fontSize: '0.92rem' }}>
                            {don.remaining_quantity} kg
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <div>{don.pickup_from}</div>
                          <div style={{ fontSize: '0.72rem' }}>to {don.pickup_until}</div>
                        </td>
                        <td>
                          <StatusBadge status={don.status} />
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => toggleExpand(don.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.25rem 0.55rem' }}
                          >
                            <Users size={13} />
                            <span>{relatedClaims.length} Claims</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </td>
                        <td>
                          {isOwner && don.status !== 'CANCELLED' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={!canCancel || processingId === don.id}
                                onClick={() => handleCancel(don.id)}
                                title={canCancel ? 'Cancel this donation permanently' : cancelDisabledReason}
                              >
                                <XCircle size={13} />
                                <span>{processingId === don.id ? 'Cancelling...' : 'Cancel'}</span>
                              </button>
                              {!canCancel && (
                                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                  {cancelDisabledReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {don.status === 'CANCELLED' ? 'Cancelled' : 'View only'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Claim Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ backgroundColor: 'var(--surface-muted)', padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--deep-green)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Users size={15} />
                              <span>Claims breakdown for batch "{don.description}" ({relatedClaims.length} total)</span>
                            </div>

                            {relatedClaims.length === 0 ? (
                              <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                No claims recorded yet. Kilograms remain 100% available for community pickup.
                              </div>
                            ) : (
                              <div style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Claim ID</th>
                                      <th>Volunteer Name</th>
                                      <th>Claimed Quantity</th>
                                      <th>Planned Pickup Time (T)</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {relatedClaims.map(rc => (
                                      <tr key={rc.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{rc.id}</td>
                                        <td style={{ fontWeight: 600 }}>{rc.volunteer_name || rc.volunteer_id}</td>
                                        <td><strong style={{ color: 'var(--fresh-green)' }}>{rc.quantity} kg</strong></td>
                                        <td>{rc.planned_pickup_time}</td>
                                        <td><StatusBadge status={rc.status} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
