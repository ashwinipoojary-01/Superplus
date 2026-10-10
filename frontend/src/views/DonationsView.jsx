import React, { useState } from 'react';
import {
  PackageSearch,
  HandHeart,
  Clock,
  MapPin,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function DonationsView({
  donations = [],
  donors = [],
  currentVolunteer,
  simulatedNow,
  onOpenClaimModal
}) {
  const [filterMode, setFilterMode] = useState('eligible'); // 'eligible' | 'open' | 'all'
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDonationDetails, setSelectedDonationDetails] = useState(null);

  const eligibleZones = currentVolunteer?.eligible_zones || [];

  const filteredDonations = donations.filter(d => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (d.description || '').toLowerCase();
      const donorName = (donors.find(donor => donor.id === d.donor_id)?.name || '').toLowerCase();
      const zone = (d.zone || '').toLowerCase();
      if (!desc.includes(q) && !donorName.includes(q) && !zone.includes(q)) {
        return false;
      }
    }

    // Zone filter
    if (zoneFilter !== 'all' && d.zone !== zoneFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;

    // Volunteer browsing modes
    if (filterMode === 'eligible') {
      return d.status === 'OPEN' && eligibleZones.includes(d.zone);
    }
    if (filterMode === 'open') {
      return d.status === 'OPEN';
    }
    return true; // 'all'
  });

  return (
    <div className="view-body">
      <div className="view-hero">
        <div>
          <h1 className="view-title">Browse Surplus Food Donations</h1>
          <p className="view-subtitle">
            Explore commercial food surplus ready for volunteer pickup and local redistribution. Active volunteer: <strong style={{ color: 'var(--deep-green)' }}>{currentVolunteer?.name || 'None selected'}</strong> (Eligible in: {eligibleZones.join(', ')}).
          </p>
        </div>
      </div>

      {/* Filter and Discovery Toolbar */}
      <div className="filter-toolbar">
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="filter-group">
            <button
              className={`filter-btn ${filterMode === 'eligible' ? 'active' : ''}`}
              onClick={() => setFilterMode('eligible')}
              title="Show only OPEN donations in your eligible zones"
            >
              <Sparkles size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              Eligible for {currentVolunteer?.name?.split(' ')[0] || 'Me'}
            </button>
            <button
              className={`filter-btn ${filterMode === 'open' ? 'active' : ''}`}
              onClick={() => setFilterMode('open')}
            >
              All Open Supply
            </button>
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Donations ({donations.length})
            </button>
          </div>

          {/* Zone Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Zone:</span>
            <select
              className="person-select"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={{ border: 'none', padding: '0 0.25rem', fontSize: '0.80rem' }}
            >
              <option value="all">All Zones</option>
              <option value="Downtown">Downtown</option>
              <option value="Uptown">Uptown</option>
              <option value="Northside">Northside</option>
            </select>
          </div>

          {/* Status filter if in 'all' mode */}
          {filterMode === 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="person-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: 'none', padding: '0 0.25rem', fontSize: '0.80rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="FULLY_CLAIMED">FULLY_CLAIMED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search food or donor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'inherit', width: '180px' }}
          />
        </div>
      </div>

      {/* Grid of Donation Cards */}
      {filteredDonations.length === 0 ? (
        <div className="content-card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <PackageSearch size={28} />
            </div>
            <h4 style={{ fontWeight: 700, color: 'var(--deep-green)', fontSize: '1.1rem' }}>No Donations Found</h4>
            <p style={{ maxWidth: '440px', fontSize: '0.85rem' }}>
              {filterMode === 'eligible'
                ? `No OPEN surplus batches currently in zones [${eligibleZones.join(', ')}] for ${currentVolunteer?.name}. Switch to "All Open Supply" or advance clock.`
                : 'No donations match the current criteria.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredDonations.map(don => {
            const donor = donors.find(d => d.id === don.donor_id);
            const isEligibleZone = eligibleZones.includes(don.zone);
            const isExpired = don.status === 'EXPIRED';
            const isCancelled = don.status === 'CANCELLED';
            const canClaim = don.status === 'OPEN' && don.remaining_quantity > 0;
            const percentClaimed = Math.min(100, Math.round(((don.total_quantity - don.remaining_quantity) / don.total_quantity) * 100));

            return (
              <div key={don.id} className="donation-card">
                <div>
                  <div className="donation-card-header">
                    <span className="donation-zone-tag">
                      <MapPin size={12} />
                      <span>{don.zone}</span>
                      {isEligibleZone && (
                        <span style={{ backgroundColor: 'var(--fresh-green-light)', color: 'var(--deep-green)', fontSize: '0.68rem', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--radius-sm)', marginLeft: '3px' }}>
                          Eligible
                        </span>
                      )}
                    </span>
                    <StatusBadge status={don.status} />
                  </div>

                  <h3 className="donation-title">
                    {don.description}
                  </h3>

                  <div className="donation-donor-meta">
                    <Building2 size={13} color="var(--deep-green)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {donor?.name || 'Commercial Donor'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>· {donor?.address?.split(',')[0]}</span>
                  </div>

                  {/* Quantity and Progress */}
                  <div style={{ margin: '0.75rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Available Quantity:</span>
                      <strong style={{ color: don.remaining_quantity > 0 ? 'var(--deep-green)' : 'var(--text-muted)', fontSize: '0.90rem' }}>
                        {don.remaining_quantity}kg <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>/ {don.total_quantity}kg</span>
                      </strong>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percentClaimed}%`,
                          backgroundColor: isExpired ? 'var(--status-expired)' : isCancelled ? 'var(--status-cancelled)' : 'var(--fresh-green)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pickup Window Meta Box */}
                  <div className="meta-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} color="var(--deep-green)" />
                      <span>Pickup: <strong>{don.pickup_from}</strong> to <strong>{don.pickup_until}</strong></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>Active Claims: {don.claims_count || 0}</span>
                      <span>Now: {simulatedNow.split('T')[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedDonationDetails(don)}
                    title="View full donation specification"
                  >
                    <Info size={13} />
                    <span>Details</span>
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!canClaim}
                    onClick={() => onOpenClaimModal(don)}
                    title={!canClaim ? `Donation is ${don.status}` : 'Claim food for volunteer rescue'}
                  >
                    <HandHeart size={14} />
                    <span>Claim Food</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details View Modal */}
      {selectedDonationDetails && (
        <div className="modal-overlay" onClick={() => setSelectedDonationDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <Info size={18} />
                <span>Donation Details</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDonationDetails(null)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--deep-green)' }}>
                  {selectedDonationDetails.description}
                </h3>
                <StatusBadge status={selectedDonationDetails.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                <div className="meta-box" style={{ margin: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Donor</span>
                  <strong style={{ fontSize: '0.90rem' }}>
                    {donors.find(d => d.id === selectedDonationDetails.donor_id)?.name || 'Commercial Donor'}
                  </strong>
                  <span style={{ fontSize: '0.76rem' }}>
                    {donors.find(d => d.id === selectedDonationDetails.donor_id)?.address}
                  </span>
                </div>

                <div className="meta-box" style={{ margin: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inventory</span>
                  <strong style={{ fontSize: '0.90rem' }}>
                    {selectedDonationDetails.remaining_quantity}kg Remaining
                  </strong>
                  <span style={{ fontSize: '0.76rem' }}>
                    Total Listed: {selectedDonationDetails.total_quantity}kg
                  </span>
                </div>

                <div className="meta-box" style={{ margin: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zone & Coverage</span>
                  <strong style={{ fontSize: '0.90rem' }}>{selectedDonationDetails.zone}</strong>
                  <span style={{ fontSize: '0.76rem', color: eligibleZones.includes(selectedDonationDetails.zone) ? 'var(--fresh-green)' : 'var(--text-muted)' }}>
                    {eligibleZones.includes(selectedDonationDetails.zone) ? '✓ Eligible for your active profile' : 'Outside your eligible zones'}
                  </span>
                </div>

                <div className="meta-box" style={{ margin: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup Window</span>
                  <strong style={{ fontSize: '0.85rem' }}>{selectedDonationDetails.pickup_from}</strong>
                  <span style={{ fontSize: '0.76rem' }}>until {selectedDonationDetails.pickup_until}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                disabled={selectedDonationDetails.status !== 'OPEN'}
                onClick={() => {
                  const d = selectedDonationDetails;
                  setSelectedDonationDetails(null);
                  onOpenClaimModal(d);
                }}
              >
                <HandHeart size={15} />
                <span>Claim Food Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
