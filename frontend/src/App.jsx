import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ClockModal from './components/ClockModal';
import ClaimModal from './components/ClaimModal';
import NewDonationModal from './components/NewDonationModal';
import DashboardView from './views/DashboardView';
import DonationsView from './views/DonationsView';
import VolunteerClaimsView from './views/VolunteerClaimsView';
import ManageDonationsView from './views/ManageDonationsView';
import ReportsView from './views/ReportsView';
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [role, setRole] = useState('volunteer'); // 'volunteer' | 'donor'
  const [selectedPersonId, setSelectedPersonId] = useState('');

  // Live Application Data
  const [simulatedNow, setSimulatedNow] = useState('2026-10-10T09:00');
  const [donors, setDonors] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [claims, setClaims] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isClockModalOpen, setIsClockModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingDonation, setClaimingDonation] = useState(null);
  const [isNewDonationModalOpen, setIsNewDonationModalOpen] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Fetch complete application state from SQLite backend
  const loadState = useCallback(async () => {
    try {
      const data = await api.getState();
      setSimulatedNow(data.simulated_now);
      setDonors(data.donors || []);
      setVolunteers(data.volunteers || []);
      setDonations(data.donations || []);
      setClaims(data.claims || []);
      setDashboard(data.dashboard || null);

      // Default select first person if none selected
      setSelectedPersonId(prev => {
        if (prev) return prev;
        if (role === 'volunteer' && data.volunteers?.length > 0) {
          return data.volunteers[0].id;
        }
        if (role === 'donor' && data.donors?.length > 0) {
          return data.donors[0].id;
        }
        return '';
      });
    } catch (err) {
      console.error('Failed to load application state:', err);
      showToast('error', `Failed to connect to backend: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // When role changes, ensure a valid persona for that role is selected
  useEffect(() => {
    if (role === 'volunteer' && volunteers.length > 0) {
      const exists = volunteers.some(v => v.id === selectedPersonId);
      if (!exists) setSelectedPersonId(volunteers[0].id);
    } else if (role === 'donor' && donors.length > 0) {
      const exists = donors.some(d => d.id === selectedPersonId);
      if (!exists) setSelectedPersonId(donors[0].id);
    }
  }, [role, volunteers, donors, selectedPersonId]);

  // Clock Advancement
  const handleAdvanceClock = async (newSimulatedNow) => {
    try {
      const res = await api.advanceClock(newSimulatedNow);
      await loadState();
      const missedMsg = res.missedClaimsConverted > 0
        ? ` (${res.missedClaimsConverted} active claim(s) transitioned to MISSED)`
        : '';
      showToast('success', `Simulated clock advanced to ${newSimulatedNow}${missedMsg}.`);
      return res;
    } catch (err) {
      showToast('error', `Clock advance failed: ${err.message}`);
      throw err;
    }
  };

  // Claim Creation
  const handleSubmitClaim = async (claimData) => {
    try {
      const created = await api.createClaim(claimData);
      await loadState();
      showToast('success', `Reservation of ${created.quantity}kg created successfully!`);
      return created;
    } catch (err) {
      throw err;
    }
  };

  // Claim Collection (Fixed Flow)
  const handleCollectClaim = async (claimId, volunteerId) => {
    try {
      await api.collectClaim(claimId, volunteerId);
      await loadState();
      showToast('success', 'Claim successfully collected! Status updated to COLLECTED.');
    } catch (err) {
      showToast('error', `Collection refused: ${err.message}`);
      throw err;
    }
  };

  // Claim Cancellation
  const handleCancelClaim = async (claimId, volunteerId) => {
    try {
      await api.cancelClaim(claimId, volunteerId);
      await loadState();
      showToast('success', 'Claim cancelled! Kilograms restored to available donation quantity.');
    } catch (err) {
      showToast('error', `Cancellation refused: ${err.message}`);
      throw err;
    }
  };

  // Donation Creation
  const handleSubmitDonation = async (donationData) => {
    try {
      const created = await api.createDonation(donationData);
      await loadState();
      showToast('success', `Surplus batch of ${created.total_quantity}kg published for volunteer pickup!`);
      return created;
    } catch (err) {
      throw err;
    }
  };

  // Donation Cancellation
  const handleCancelDonation = async (donationId, donorId) => {
    try {
      await api.cancelDonation(donationId, donorId);
      await loadState();
      showToast('success', 'Donation successfully cancelled.');
    } catch (err) {
      showToast('error', `Cancellation refused: ${err.message}`);
      throw err;
    }
  };

  const currentVolunteer = volunteers.find(v => v.id === selectedPersonId) || volunteers[0];
  const currentDonor = donors.find(d => d.id === selectedPersonId) || donors[0];

  const volunteerClaimsCount = claims.filter(c => c.volunteer_id === currentVolunteer?.id).length;
  const donorDonationsCount = donations.filter(d => d.donor_id === currentDonor?.id).length;

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        role={role}
        currentVolunteer={currentVolunteer}
        currentDonor={currentDonor}
        claimsCount={volunteerClaimsCount}
        donationsCount={donorDonationsCount}
      />

      <div className="main-content">
        {/* Top bar with simulated clock and persona switcher */}
        <TopBar
          activeSection={activeSection}
          simulatedNow={simulatedNow}
          role={role}
          setRole={setRole}
          selectedPersonId={selectedPersonId}
          setSelectedPersonId={setSelectedPersonId}
          donors={donors}
          volunteers={volunteers}
          onOpenClockModal={() => setIsClockModalOpen(true)}
        />

        {/* Global Toast Notifications */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '1.75rem',
              right: '1.75rem',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
              color: toast.type === 'error' ? '#991B1B' : '#166534',
              border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {isLoading ? (
          <div className="view-body">
            <div className="empty-state">
              <div className="clock-live-dot" style={{ width: '16px', height: '16px' }} />
              <div>Connecting to SurplusLink local SQLite engine...</div>
            </div>
          </div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <DashboardView
                dashboard={dashboard}
                donations={donations}
                claims={claims}
                simulatedNow={simulatedNow}
                onNavigate={setActiveSection}
              />
            )}

            {activeSection === 'donations' && (
              <DonationsView
                donations={donations}
                donors={donors}
                currentVolunteer={currentVolunteer}
                simulatedNow={simulatedNow}
                onOpenClaimModal={(don) => {
                  setClaimingDonation(don);
                  setIsClaimModalOpen(true);
                }}
              />
            )}

            {activeSection === 'claims' && (
              <VolunteerClaimsView
                claims={claims}
                donations={donations}
                donors={donors}
                currentVolunteer={currentVolunteer}
                simulatedNow={simulatedNow}
                onCollectClaim={handleCollectClaim}
                onCancelClaim={handleCancelClaim}
                onAdvanceClock={handleAdvanceClock}
              />
            )}

            {activeSection === 'manage' && (
              <ManageDonationsView
                donations={donations}
                claims={claims}
                currentDonor={currentDonor}
                simulatedNow={simulatedNow}
                onOpenNewDonationModal={() => setIsNewDonationModalOpen(true)}
                onCancelDonation={handleCancelDonation}
              />
            )}

            {activeSection === 'reports' && (
              <ReportsView
                dashboard={dashboard}
                simulatedNow={simulatedNow}
              />
            )}
          </>
        )}
      </div>

      {/* Clock Modal */}
      <ClockModal
        isOpen={isClockModalOpen}
        onClose={() => setIsClockModalOpen(false)}
        currentSimulatedNow={simulatedNow}
        onAdvanceClock={handleAdvanceClock}
      />

      {/* Claim Modal */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setClaimingDonation(null);
        }}
        donation={claimingDonation}
        volunteer={currentVolunteer}
        simulatedNow={simulatedNow}
        onSubmitClaim={handleSubmitClaim}
      />

      {/* New Donation Modal */}
      <NewDonationModal
        isOpen={isNewDonationModalOpen}
        onClose={() => setIsNewDonationModalOpen(false)}
        donor={currentDonor}
        simulatedNow={simulatedNow}
        onSubmitDonation={handleSubmitDonation}
      />
    </div>
  );
}
