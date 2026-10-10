import React from 'react';
import {
  Package,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Clock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Users,
  Leaf,
  HeartHandshake,
  BarChart2,
  PieChart,
  ArrowUpRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function DashboardView({
  dashboard,
  donations = [],
  claims = [],
  simulatedNow,
  onNavigate
}) {
  if (!dashboard) {
    return (
      <div className="view-body">
        <div className="empty-state">
          <div className="clock-live-dot" style={{ width: '16px', height: '16px' }} />
          <div>Loading live operational metrics...</div>
        </div>
      </div>
    );
  }

  const { kpis, accounting, donor_stats = [], volunteer_stats = [], status_summary } = dashboard;

  // Impact calculations based purely on actual collected kg
  const collectedKg = kpis?.collected ?? 0;
  // Standard benchmark: ~2.4 community meals provided per kg of wholesome surplus food rescued
  const estimatedMeals = Math.round(collectedKg * 2.4);
  const activeRescuesCount = claims.filter(c => c.status === 'ACTIVE').length;

  // Recent non-cancelled donations (last 4)
  const recentDonations = [...donations]
    .filter(d => !d.is_cancelled)
    .slice(0, 4);

  return (
    <div className="view-body">
      {/* Welcome & Impact Hero */}
      <div className="view-hero">
        <div>
          <h1 className="view-title">SurplusLink Operations & Impact</h1>
          <p className="view-subtitle">
            Connecting commercial grocery and bakery surplus with community distribution volunteers in real-time.
          </p>
        </div>
      </div>

      {/* Prominent Food-Saved Impact Summary */}
      <div className="impact-hero-card">
        <div className="impact-hero-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.74rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <Leaf size={13} />
            <span>Community Impact Metric</span>
          </div>
          <h2>Verified Food Waste Prevention</h2>
          <p>
            Across our active retail partners, SurplusLink volunteers have successfully collected and distributed <strong>{collectedKg} kilograms</strong> of fresh surplus food, diverting edible nutrition from commercial waste streams into community hands.
          </p>
        </div>

        <div className="impact-hero-stats">
          <div className="impact-stat-item">
            <div className="impact-stat-number">{collectedKg}<span>kg</span></div>
            <div className="impact-stat-label">Food Rescued</div>
          </div>
          <div className="impact-stat-item">
            <div className="impact-stat-number">{estimatedMeals}<span>meals</span></div>
            <div className="impact-stat-label">Meals Provided</div>
          </div>
          <div className="impact-stat-item">
            <div className="impact-stat-number">{activeRescuesCount}<span>active</span></div>
            <div className="impact-stat-label">Rescues In Progress</div>
          </div>
        </div>
      </div>

      {/* 6 Core Live Metric KPI Cards */}
      <div className="kpi-grid">
        {/* 1. Listed */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--deep-green)' }}>
          <div className="kpi-top">
            <span className="kpi-label">Listed</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: '#EAF7F0', color: 'var(--deep-green)' }}>
              <Package size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis?.listed ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Active non-cancelled supply</span>
        </div>

        {/* 2. Collected */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--fresh-green)' }}>
          <div className="kpi-top">
            <span className="kpi-label">Collected</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: 'var(--fresh-green-light)', color: 'var(--fresh-green)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--fresh-green)' }}>{kpis?.collected ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Successfully fulfilled</span>
        </div>

        {/* 3. Missed */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div className="kpi-top">
            <span className="kpi-label">Missed</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              <AlertOctagon size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#DC2626' }}>{kpis?.missed ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Claims past pickup window</span>
        </div>

        {/* 4. Wasted */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="kpi-top">
            <span className="kpi-label">Wasted</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <Trash2 size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#D97706' }}>{kpis?.wasted ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Unclaimed on expired batches</span>
        </div>

        {/* 5. In Progress */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="kpi-top">
            <span className="kpi-label">In Progress</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#2563EB' }}>{kpis?.in_progress ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Active volunteer reservations</span>
        </div>

        {/* 6. Still Open */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #0891B2' }}>
          <div className="kpi-top">
            <span className="kpi-label">Still Open</span>
            <div className="kpi-icon-wrap" style={{ backgroundColor: '#ECFEFF', color: '#0891B2' }}>
              <Unlock size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#0891B2' }}>{kpis?.still_open ?? 0}</span>
            <span className="kpi-unit">kg</span>
          </div>
          <span className="kpi-subtext">Available unexpired quantity</span>
        </div>
      </div>

      {/* Accounting Identity Banner */}
      <div className={`reconciliation-card ${accounting?.is_reconciled ? 'verified' : 'unbalanced'}`}>
        <div className="reconciliation-header">
          <div className={`reconciliation-status ${accounting?.is_reconciled ? 'verified' : 'unbalanced'}`}>
            {accounting?.is_reconciled ? (
              <ShieldCheck size={20} color="var(--deep-green)" />
            ) : (
              <AlertTriangle size={20} color="#DC2626" />
            )}
            <span>
              {accounting?.is_reconciled
                ? 'Accounting Identity Verified (100% Balanced)'
                : 'Accounting Discrepancy Detected!'}
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Strict physical inventory balance (excludes cancelled donations)
          </span>
        </div>

        <div className="accounting-equation">
          <div className="eq-item">
            <span style={{ color: 'var(--text-muted)' }}>Listed (</span>
            <strong style={{ color: 'var(--deep-green)' }}>{kpis?.listed} kg</strong>
            <span style={{ color: 'var(--text-muted)' }}>)</span>
          </div>
          <span className="eq-op">=</span>
          <div className="eq-item">
            <span>Collected (</span>
            <strong style={{ color: 'var(--fresh-green)' }}>{kpis?.collected}</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Missed (</span>
            <strong style={{ color: '#DC2626' }}>{kpis?.missed}</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Wasted (</span>
            <strong style={{ color: '#D97706' }}>{kpis?.wasted}</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>In Progress (</span>
            <strong style={{ color: '#2563EB' }}>{kpis?.in_progress}</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Still Open (</span>
            <strong style={{ color: '#0891B2' }}>{kpis?.still_open}</strong>
            <span>)</span>
          </div>

          <div style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '0.80rem', color: accounting?.is_reconciled ? 'var(--deep-green)' : '#DC2626' }}>
            {accounting?.is_reconciled
              ? `✓ Sum = ${accounting?.components_sum} kg`
              : `Difference: ${Math.abs((kpis?.listed || 0) - (accounting?.components_sum || 0))} kg`}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Donations & Status Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Recent Donations */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <Package size={18} />
              <span>Recent Surplus Supply</span>
            </div>
            {onNavigate && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('donations')}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                View All
              </button>
            )}
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Zone</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDonations.map(d => (
                    <tr key={d.id}>
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{d.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: {d.total_quantity}kg</div>
                      </td>
                      <td>
                        <span className="donation-zone-tag">
                          <MapPin size={11} />
                          <span>{d.zone}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: d.remaining_quantity > 0 ? 'var(--fresh-green)' : 'var(--text-muted)' }}>
                          {d.remaining_quantity}kg
                        </strong>
                      </td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Status Distribution Summary */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <BarChart2 size={18} />
              <span>Status Distribution</span>
            </div>
          </div>
          <div className="content-card-body">
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--deep-green)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Donations Status
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OPEN</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-open)' }}>{status_summary?.donations?.OPEN || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FULLY CLAIMED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-claimed)' }}>{status_summary?.donations?.FULLY_CLAIMED || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EXPIRED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-expired)' }}>{status_summary?.donations?.EXPIRED || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CANCELLED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-cancelled)' }}>{status_summary?.donations?.CANCELLED || 0}</div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--deep-green)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Claims Status
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>COLLECTED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-collected)' }}>{status_summary?.claims?.COLLECTED || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ACTIVE</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-claimed)' }}>{status_summary?.claims?.ACTIVE || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MISSED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-missed)' }}>{status_summary?.claims?.MISSED || 0}</div>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CANCELLED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-cancelled)' }}>{status_summary?.claims?.CANCELLED || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Donor Rankings & Volunteer Operational Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Collected kg by Donor */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <Building2 size={18} />
              <span>Collected Kilograms by Donor</span>
            </div>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Donor Partner</th>
                    <th>Rescued (kg)</th>
                    <th>Total Donated (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {donor_stats.map(d => (
                    <tr key={d.donor_id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>
                        <strong style={{ color: 'var(--fresh-green)', fontSize: '0.92rem' }}>
                          {d.collected_kg} kg
                        </strong>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {d.total_donated_kg} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Volunteer Ops */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <Users size={18} />
              <span>Volunteer Deliveries & Reliability</span>
            </div>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Volunteer</th>
                    <th>Collected (kg)</th>
                    <th>Missed Claims</th>
                    <th>Active Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteer_stats.map(v => (
                    <tr key={v.volunteer_id}>
                      <td style={{ fontWeight: 600 }}>{v.name}</td>
                      <td>
                        <strong style={{ color: 'var(--fresh-green)' }}>
                          {v.collected_kg} kg
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: v.missed_claims_count > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: v.missed_claims_count > 0 ? 700 : 400 }}>
                          {v.missed_claims_count}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>
                          {v.active_claims_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
