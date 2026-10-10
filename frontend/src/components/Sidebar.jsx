import React from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  HandHeart,
  Store,
  BarChart3,
  Leaf,
  Clock,
  Sparkles,
  User,
  Building2
} from 'lucide-react';

export default function Sidebar({
  activeSection,
  setActiveSection,
  role,
  currentVolunteer,
  currentDonor,
  claimsCount = 0,
  donationsCount = 0
}) {
  const isVolunteer = role === 'volunteer';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon">
          <Leaf size={22} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">
            SurplusLink
          </div>
          <div className="brand-subtitle">Food Rescue Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        <div className="nav-section-label">Main Overview</div>
        <button
          className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('dashboard')}
        >
          <div className="nav-item-content">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
        </button>

        <button
          className={`nav-item ${activeSection === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveSection('donations')}
        >
          <div className="nav-item-content">
            <PackageSearch size={18} />
            <span>Browse Donations</span>
          </div>
        </button>

        <div className="nav-section-label">
          {isVolunteer ? 'Volunteer Center' : 'Donor Operations'}
        </div>

        {/* My Claims (Volunteer focus) */}
        <button
          className={`nav-item ${activeSection === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveSection('claims')}
          style={{
            opacity: !isVolunteer ? 0.75 : 1
          }}
        >
          <div className="nav-item-content">
            <HandHeart size={18} />
            <span>My Claims</span>
          </div>
          {claimsCount > 0 && (
            <span className="nav-pill">{claimsCount}</span>
          )}
        </button>

        {/* My Donations (Donor focus) */}
        <button
          className={`nav-item ${activeSection === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveSection('manage')}
          style={{
            opacity: isVolunteer ? 0.75 : 1
          }}
        >
          <div className="nav-item-content">
            <Store size={18} />
            <span>My Donations</span>
          </div>
          {donationsCount > 0 && (
            <span className="nav-pill">{donationsCount}</span>
          )}
        </button>

        <div className="nav-section-label">Analytics & Audit</div>
        <button
          className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveSection('reports')}
        >
          <div className="nav-item-content">
            <BarChart3 size={18} />
            <span>Impact & Reports</span>
          </div>
        </button>
      </nav>

      {/* Sidebar Footer Persona Indicator */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Active Persona
        </div>
        <div className="persona-mini-card">
          <div className="persona-avatar">
            {isVolunteer
              ? (currentVolunteer?.name?.split(' ').map(n => n[0]).join('') || 'VO')
              : (currentDonor?.name?.split(' ').map(n => n[0]).join('') || 'DO')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.80rem', color: 'var(--deep-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isVolunteer ? currentVolunteer?.name : currentDonor?.name}
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
              {isVolunteer ? `Capacity: ${currentVolunteer?.capacity || 0}kg` : (currentDonor?.address?.split(',')[0] || 'Donor')}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
