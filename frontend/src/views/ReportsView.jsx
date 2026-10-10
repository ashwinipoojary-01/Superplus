import React from 'react';
import {
  BarChart3,
  Building2,
  Users,
  ShieldCheck,
  AlertTriangle,
  Download,
  CheckCircle2,
  Clock,
  PieChart,
  FileSpreadsheet,
  Leaf
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function ReportsView({ dashboard, simulatedNow }) {
  if (!dashboard) {
    return (
      <div className="view-body">
        <div className="empty-state">
          <div className="clock-live-dot" style={{ width: '16px', height: '16px' }} />
          <div>Generating live impact audit report...</div>
        </div>
      </div>
    );
  }

  const { kpis, accounting, donor_stats = [], volunteer_stats = [], status_summary } = dashboard;

  const exportReport = () => {
    const reportData = {
      generatedAt: simulatedNow,
      kpis,
      accounting,
      donor_stats,
      volunteer_stats,
      status_summary
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SurplusLink-Impact-Report-${simulatedNow.replace(/[:]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="view-body">
      <div className="view-hero">
        <div>
          <h1 className="view-title">Executive Impact & Reconciliation Audit</h1>
          <p className="view-subtitle">
            Comprehensive audit report of physical inventory flows, partner performance, and mathematical inventory reconciliation.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportReport} title="Export audit data to JSON">
          <Download size={16} />
          <span>Export Audit (JSON)</span>
        </button>
      </div>

      {/* Accounting Reconciliation Audit Banner */}
      <div className={`reconciliation-card ${accounting?.is_reconciled ? 'verified' : 'unbalanced'}`}>
        <div className="reconciliation-header">
          <div className={`reconciliation-status ${accounting?.is_reconciled ? 'verified' : 'unbalanced'}`}>
            {accounting?.is_reconciled ? (
              <ShieldCheck size={22} color="var(--deep-green)" />
            ) : (
              <AlertTriangle size={22} color="#DC2626" />
            )}
            <span>
              {accounting?.is_reconciled
                ? 'Mathematical Accounting Identity: Reconciled & Balanced'
                : 'Warning: Physical Inventory Reconciliation Discrepancy!'}
            </span>
          </div>
          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
            Excludes Cancelled Batches from All Calculations
          </span>
        </div>

        <div className="accounting-equation" style={{ fontSize: '0.90rem' }}>
          <div className="eq-item">
            <span style={{ color: 'var(--text-muted)' }}>Listed (</span>
            <strong style={{ color: 'var(--deep-green)' }}>{kpis?.listed} kg</strong>
            <span style={{ color: 'var(--text-muted)' }}>)</span>
          </div>
          <span className="eq-op">=</span>
          <div className="eq-item">
            <span>Collected (</span>
            <strong style={{ color: 'var(--fresh-green)' }}>{kpis?.collected} kg</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Missed (</span>
            <strong style={{ color: '#DC2626' }}>{kpis?.missed} kg</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Wasted (</span>
            <strong style={{ color: '#D97706' }}>{kpis?.wasted} kg</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>In Progress (</span>
            <strong style={{ color: '#2563EB' }}>{kpis?.in_progress} kg</strong>
            <span>)</span>
          </div>
          <span className="eq-op">+</span>
          <div className="eq-item">
            <span>Still Open (</span>
            <strong style={{ color: '#0891B2' }}>{kpis?.still_open} kg</strong>
            <span>)</span>
          </div>
        </div>

        <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            Formula: <code>Listed = Collected + Missed + Wasted + In Progress + Still Open</code>
          </div>
          <div style={{ fontWeight: 700, color: accounting?.is_reconciled ? 'var(--deep-green)' : '#DC2626' }}>
            {accounting?.is_reconciled
              ? `Status: Verified (${accounting?.listed} kg = ${accounting?.components_sum} kg)`
              : `Discrepancy: ${Math.abs((kpis?.listed || 0) - (accounting?.components_sum || 0))} kg`}
          </div>
        </div>
      </div>

      {/* Comprehensive Totals Table */}
      <div className="content-card">
        <div className="content-card-header">
          <div className="content-card-title">
            <FileSpreadsheet size={18} />
            <span>Comprehensive System Inventory Breakdown</span>
          </div>
        </div>
        <div className="content-card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Definition & Problem Statement Role</th>
                  <th>Quantity (kg)</th>
                  <th>% of Listed Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style={{ color: 'var(--deep-green)' }}>Listed Supply</strong></td>
                  <td>Sum of total quantities for all non-cancelled donations</td>
                  <td><strong>{kpis?.listed || 0} kg</strong></td>
                  <td>100.0%</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--fresh-green)' }}>Collected</strong></td>
                  <td>ACTIVE claims successfully confirmed collected by claim owners within pickup window</td>
                  <td><strong style={{ color: 'var(--fresh-green)' }}>{kpis?.collected || 0} kg</strong></td>
                  <td>{kpis?.listed ? ((kpis.collected / kpis.listed) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td><strong style={{ color: '#DC2626' }}>Missed</strong></td>
                  <td>ACTIVE claims whose donation pickup window passed before volunteer collected</td>
                  <td><strong style={{ color: '#DC2626' }}>{kpis?.missed || 0} kg</strong></td>
                  <td>{kpis?.listed ? ((kpis.missed / kpis.listed) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td><strong style={{ color: '#D97706' }}>Wasted</strong></td>
                  <td>Unclaimed remaining kilograms on EXPIRED donations (now &gt; pickup_until)</td>
                  <td><strong style={{ color: '#D97706' }}>{kpis?.wasted || 0} kg</strong></td>
                  <td>{kpis?.listed ? ((kpis.wasted / kpis.listed) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td><strong style={{ color: '#2563EB' }}>In Progress</strong></td>
                  <td>Currently ACTIVE volunteer reservations awaiting pickup</td>
                  <td><strong style={{ color: '#2563EB' }}>{kpis?.in_progress || 0} kg</strong></td>
                  <td>{kpis?.listed ? ((kpis.in_progress / kpis.listed) * 100).toFixed(1) : 0}%</td>
                </tr>
                <tr>
                  <td><strong style={{ color: '#0891B2' }}>Still Open</strong></td>
                  <td>Remaining kilograms available for claims on active, unexpired donations</td>
                  <td><strong style={{ color: '#0891B2' }}>{kpis?.still_open || 0} kg</strong></td>
                  <td>{kpis?.listed ? ((kpis.still_open / kpis.listed) * 100).toFixed(1) : 0}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Two Column Breakdown: Donors & Volunteers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Donor Impact Table */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <Building2 size={18} />
              <span>Donor Partner Fulfillment</span>
            </div>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Donor Name</th>
                    <th>Rescued (kg)</th>
                    <th>Listed (kg)</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {donor_stats.map(d => {
                    const eff = d.total_donated_kg > 0 ? Math.round((d.collected_kg / d.total_donated_kg) * 100) : 0;
                    return (
                      <tr key={d.donor_id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td><strong style={{ color: 'var(--fresh-green)' }}>{d.collected_kg} kg</strong></td>
                        <td>{d.total_donated_kg} kg</td>
                        <td>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: eff > 0 ? 'var(--deep-green)' : 'var(--text-muted)' }}>
                            {eff}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Volunteer Rescue Reliability Table */}
        <div className="content-card" style={{ margin: 0 }}>
          <div className="content-card-header">
            <div className="content-card-title">
              <Users size={18} />
              <span>Volunteer Rescue Reliability</span>
            </div>
          </div>
          <div className="content-card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Volunteer Name</th>
                    <th>Collected (kg)</th>
                    <th>Missed Claims</th>
                    <th>Active Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteer_stats.map(v => (
                    <tr key={v.volunteer_id}>
                      <td style={{ fontWeight: 600 }}>{v.name}</td>
                      <td><strong style={{ color: 'var(--fresh-green)' }}>{v.collected_kg} kg</strong></td>
                      <td>
                        <span style={{ color: v.missed_claims_count > 0 ? '#DC2626' : 'var(--text-muted)', fontWeight: v.missed_claims_count > 0 ? 700 : 400 }}>
                          {v.missed_claims_count}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>{v.active_claims_count}</span>
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
