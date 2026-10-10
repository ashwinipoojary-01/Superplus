import crypto from 'crypto';
import {
  calculateDonationStatus,
  calculateRemainingQuantity,
  validateClaimCancellation,
  validateClaimCollection,
  validateClaimRules,
  validateDonationCancellation,
  validateDonationCreation
} from './rules.js';
import { compareTimes, isValidIsoDateTime } from './timeUtils.js';

export function getSimulatedNow(db) {
  const row = db.prepare('SELECT simulated_now FROM clock WHERE id = 1').get();
  return row ? row.simulated_now : '2026-10-10T09:00';
}

export function getAllDonations(db, simulatedNow) {
  const simNow = simulatedNow || getSimulatedNow(db);
  const donations = db.prepare('SELECT * FROM donations ORDER BY created_at DESC, id DESC').all();
  const claims = db.prepare('SELECT * FROM claims').all();

  return donations.map(d => {
    const remaining = calculateRemainingQuantity(d, claims);
    const status = calculateDonationStatus(d, claims, simNow);
    const relatedClaims = claims.filter(c => c.donation_id === d.id);
    return {
      ...d,
      is_cancelled: Boolean(d.is_cancelled),
      remaining_quantity: remaining,
      status,
      claims_count: relatedClaims.length
    };
  });
}

export function getAllClaims(db) {
  const claims = db.prepare(`
    SELECT c.*, d.zone as donation_zone, d.description as donation_description,
           d.pickup_from as donation_pickup_from, d.pickup_until as donation_pickup_until,
           v.name as volunteer_name, d.donor_id
    FROM claims c
    JOIN donations d ON c.donation_id = d.id
    JOIN volunteers v ON c.volunteer_id = v.id
    ORDER BY c.created_at DESC, c.id DESC
  `).all();
  return claims;
}

export function getAllDonors(db) {
  return db.prepare('SELECT * FROM donors ORDER BY name ASC').all();
}

export function getAllVolunteers(db) {
  const rows = db.prepare('SELECT * FROM volunteers ORDER BY name ASC').all();
  return rows.map(v => ({
    ...v,
    eligible_zones: JSON.parse(v.eligible_zones || '[]')
  }));
}

export function getAppState(db) {
  const simulatedNow = getSimulatedNow(db);
  const donors = getAllDonors(db);
  const volunteers = getAllVolunteers(db);
  const donations = getAllDonations(db, simulatedNow);
  const claims = getAllClaims(db);
  const dashboard = getDashboardTotals(db);

  return {
    simulated_now: simulatedNow,
    donors,
    volunteers,
    donations,
    claims,
    dashboard
  };
}

/**
 * Advance the simulated clock.
 * Checks that the clock never moves backwards.
 * Automatically marks ACTIVE claims as MISSED if now > donation.pickup_until.
 */
export function advanceClock(db, newSimulatedNow) {
  if (!isValidIsoDateTime(newSimulatedNow)) {
    throw new Error('Invalid timestamp format for simulated clock. Expected YYYY-MM-DDTHH:MM.');
  }

  const currentSimNow = getSimulatedNow(db);
  if (compareTimes(newSimulatedNow, currentSimNow) < 0) {
    throw new Error(`Clock cannot move backwards. Current time is ${currentSimNow}, requested time is ${newSimulatedNow}.`);
  }

  const txn = db.transaction(() => {
    // 1. Update clock
    db.prepare('UPDATE clock SET simulated_now = ? WHERE id = 1').run(newSimulatedNow);

    // 2. Identify and convert active claims on expired donations to MISSED
    // A donation is expired when newSimulatedNow > pickup_until
    const activeClaimsToMiss = db.prepare(`
      SELECT c.id, c.donation_id, d.pickup_until
      FROM claims c
      JOIN donations d ON c.donation_id = d.id
      WHERE c.status = 'ACTIVE'
    `).all();

    let missedCount = 0;
    const updateClaimStmt = db.prepare("UPDATE claims SET status = 'MISSED' WHERE id = ?");
    for (const c of activeClaimsToMiss) {
      if (compareTimes(newSimulatedNow, c.pickup_until) > 0) {
        updateClaimStmt.run(c.id);
        missedCount++;
      }
    }

    return {
      previousTime: currentSimNow,
      newTime: newSimulatedNow,
      missedClaimsConverted: missedCount
    };
  });

  return txn();
}

/**
 * Creates a new donation.
 */
export function createDonation(db, { donorId, description, quantity, pickup_from, pickup_until, zone }) {
  const simNow = getSimulatedNow(db);
  const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId);
  if (!donor) {
    throw new Error('Donor not found.');
  }

  const parsedQty = parseInt(quantity, 10);
  const validation = validateDonationCreation({
    description,
    quantity: parsedQty,
    pickup_from,
    pickup_until,
    zone,
    simulatedNow: simNow
  });

  if (!validation.isValid) {
    const error = new Error('Validation failed for donation creation.');
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const id = `don-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const insertStmt = db.prepare(`
    INSERT INTO donations (id, donor_id, zone, description, total_quantity, pickup_from, pickup_until, is_cancelled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  insertStmt.run(id, donorId, zone.trim(), description.trim(), parsedQty, pickup_from, pickup_until, simNow);

  return db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
}

/**
 * Cancels a donation by donor.
 */
export function cancelDonation(db, { donationId, donorId }) {
  const simNow = getSimulatedNow(db);
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }

  const claims = db.prepare('SELECT * FROM claims WHERE donation_id = ?').all(donationId);
  const validation = validateDonationCancellation({
    donation,
    claims,
    donorId,
    simulatedNow: simNow
  });

  if (!validation.isValid) {
    const err = new Error(validation.error);
    err.status = 400;
    throw err;
  }

  db.prepare('UPDATE donations SET is_cancelled = 1 WHERE id = ?').run(donationId);
  return { success: true, message: 'Donation successfully cancelled.' };
}

/**
 * Creates a claim with transactional overbooking protection.
 */
export function createClaim(db, { donationId, volunteerId, quantity, plannedPickupTime }) {
  const parsedQty = parseInt(quantity, 10);

  // Execute in an immediate transaction to guarantee isolation and overbooking protection
  const txn = db.transaction(() => {
    const simNow = getSimulatedNow(db);
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
    const volunteer = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(volunteerId);
    const allClaims = db.prepare('SELECT * FROM claims').all();

    const validation = validateClaimRules({
      donation,
      volunteer,
      allClaims,
      quantity: parsedQty,
      plannedPickupTime,
      simulatedNow: simNow
    });

    if (!validation.isValid) {
      const err = new Error('Claim validation failed.');
      err.status = 400;
      err.validationErrors = validation.errors;
      throw err;
    }

    const id = `claim-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    db.prepare(`
      INSERT INTO claims (id, donation_id, volunteer_id, quantity, planned_pickup_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(id, donationId, volunteerId, parsedQty, plannedPickupTime, simNow);

    return db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
  });

  return txn();
}

/**
 * Collects an active claim.
 */
export function collectClaim(db, { claimId, volunteerId }) {
  const txn = db.transaction(() => {
    const simNow = getSimulatedNow(db);
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      const err = new Error('Claim not found.');
      err.status = 404;
      throw err;
    }
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(claim.donation_id);

    const validation = validateClaimCollection({
      claim,
      donation,
      volunteerId,
      simulatedNow: simNow
    });

    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.status = 400;
      throw err;
    }

    db.prepare("UPDATE claims SET status = 'COLLECTED' WHERE id = ?").run(claimId);
    return db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
  });

  return txn();
}

/**
 * Cancels an active claim.
 */
export function cancelClaim(db, { claimId, volunteerId }) {
  const txn = db.transaction(() => {
    const simNow = getSimulatedNow(db);
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      const err = new Error('Claim not found.');
      err.status = 404;
      throw err;
    }

    const validation = validateClaimCancellation({
      claim,
      volunteerId,
      simulatedNow: simNow
    });

    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.status = 400;
      throw err;
    }

    db.prepare("UPDATE claims SET status = 'CANCELLED' WHERE id = ?").run(claimId);
    return db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
  });

  return txn();
}

/**
 * Calculates dashboard totals and accounting identity across all non-cancelled donations.
 */
export function getDashboardTotals(db) {
  const simNow = getSimulatedNow(db);
  const donations = db.prepare('SELECT * FROM donations WHERE is_cancelled = 0').all();
  const claims = db.prepare('SELECT * FROM claims').all();
  const donors = db.prepare('SELECT * FROM donors').all();
  const volunteers = db.prepare('SELECT * FROM volunteers').all();

  let totalListed = 0;
  let totalWasted = 0;
  let totalStillOpen = 0;

  for (const d of donations) {
    totalListed += Number(d.total_quantity);
    const remaining = calculateRemainingQuantity(d, claims);
    const status = calculateDonationStatus(d, claims, simNow);

    if (status === 'EXPIRED') {
      totalWasted += remaining;
    } else {
      totalStillOpen += remaining;
    }
  }

  // Filter claims belonging to non-cancelled donations
  const nonCancelledDonationIds = new Set(donations.map(d => d.id));
  const activeDonationClaims = claims.filter(c => nonCancelledDonationIds.has(c.donation_id));

  let totalCollected = 0;
  let totalMissed = 0;
  let totalInProgress = 0;

  for (const c of activeDonationClaims) {
    const qty = Number(c.quantity);
    if (c.status === 'COLLECTED') {
      totalCollected += qty;
    } else if (c.status === 'MISSED') {
      totalMissed += qty;
    } else if (c.status === 'ACTIVE') {
      totalInProgress += qty;
    }
  }

  const sumOfComponents = totalCollected + totalMissed + totalWasted + totalInProgress + totalStillOpen;
  const isReconciled = totalListed === sumOfComponents;

  // Per-donor collected kilograms (for non-cancelled donations)
  const donorStats = donors.map(donor => {
    const donorDonationIds = new Set(
      donations.filter(d => d.donor_id === donor.id).map(d => d.id)
    );
    const collectedKg = claims
      .filter(c => donorDonationIds.has(c.donation_id) && c.status === 'COLLECTED')
      .reduce((sum, c) => sum + Number(c.quantity), 0);

    const totalDonatedKg = donations
      .filter(d => d.donor_id === donor.id)
      .reduce((sum, d) => sum + Number(d.total_quantity), 0);

    return {
      donor_id: donor.id,
      name: donor.name,
      collected_kg: collectedKg,
      total_donated_kg: totalDonatedKg
    };
  });

  // Per-volunteer stats
  const volunteerStats = volunteers.map(vol => {
    const volClaims = claims.filter(c => c.volunteer_id === vol.id && nonCancelledDonationIds.has(c.donation_id));
    const collectedKg = volClaims
      .filter(c => c.status === 'COLLECTED')
      .reduce((sum, c) => sum + Number(c.quantity), 0);
    const missedClaimsCount = volClaims
      .filter(c => c.status === 'MISSED').length;
    const activeClaimsCount = volClaims
      .filter(c => c.status === 'ACTIVE').length;

    return {
      volunteer_id: vol.id,
      name: vol.name,
      capacity: vol.capacity,
      collected_kg: collectedKg,
      missed_claims_count: missedClaimsCount,
      active_claims_count: activeClaimsCount
    };
  });

  // Status summaries
  const donationStatusCounts = {
    OPEN: 0,
    FULLY_CLAIMED: 0,
    EXPIRED: 0,
    CANCELLED: 0
  };
  const allDonationsList = db.prepare('SELECT * FROM donations').all();
  for (const d of allDonationsList) {
    const st = calculateDonationStatus(d, claims, simNow);
    donationStatusCounts[st] = (donationStatusCounts[st] || 0) + 1;
  }

  const claimStatusCounts = {
    ACTIVE: 0,
    COLLECTED: 0,
    CANCELLED: 0,
    MISSED: 0
  };
  for (const c of claims) {
    claimStatusCounts[c.status] = (claimStatusCounts[c.status] || 0) + 1;
  }

  return {
    kpis: {
      listed: totalListed,
      collected: totalCollected,
      missed: totalMissed,
      wasted: totalWasted,
      in_progress: totalInProgress,
      still_open: totalStillOpen
    },
    accounting: {
      is_reconciled: isReconciled,
      listed: totalListed,
      components_sum: sumOfComponents,
      formula: 'Listed = Collected + Missed + Wasted + In Progress + Still Open'
    },
    donor_stats: donorStats,
    volunteer_stats: volunteerStats,
    status_summary: {
      donations: donationStatusCounts,
      claims: claimStatusCounts
    }
  };
}
