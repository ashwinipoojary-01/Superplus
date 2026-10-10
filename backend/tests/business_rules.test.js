import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDatabase, initDatabase } from '../db.js';
import {
  calculateDonationStatus,
  calculateRemainingQuantity,
  validateClaimRules,
  validateClaimCollection,
  validateClaimCancellation,
  validateDonationCancellation,
  validateDonationCreation
} from '../rules.js';
import {
  advanceClock,
  cancelClaim,
  cancelDonation,
  collectClaim,
  createClaim,
  createDonation,
  getDashboardTotals,
  getSimulatedNow
} from '../services.js';
import { diffMinutes, parseToMinutes, minutesToIsoDateTime } from '../timeUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE clock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      simulated_now TEXT NOT NULL
    );
    CREATE TABLE donors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL
    );
    CREATE TABLE volunteers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      eligible_zones TEXT NOT NULL,
      phone TEXT NOT NULL
    );
    CREATE TABLE donations (
      id TEXT PRIMARY KEY,
      donor_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      description TEXT NOT NULL,
      total_quantity INTEGER NOT NULL,
      pickup_from TEXT NOT NULL,
      pickup_until TEXT NOT NULL,
      is_cancelled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (donor_id) REFERENCES donors(id)
    );
    CREATE TABLE claims (
      id TEXT PRIMARY KEY,
      donation_id TEXT NOT NULL,
      volunteer_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      planned_pickup_time TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (donation_id) REFERENCES donations(id),
      FOREIGN KEY (volunteer_id) REFERENCES volunteers(id)
    );
  `);

  const initialSeed = {
    simulated_now: '2026-10-10T09:00',
    donors: [
      { id: 'donor-1', name: 'GreenGrocer Market', address: '124 Market St, Downtown', phone: '555-0101' },
      { id: 'donor-2', name: 'Sunrise Bakery', address: '45 Elm Ave, Uptown', phone: '555-0102' }
    ],
    volunteers: [
      { id: 'vol-1', name: 'Alex Rivera', capacity: 20, eligible_zones: ['Downtown', 'Uptown'], phone: '555-0201' },
      { id: 'vol-2', name: 'Samira Khan', capacity: 15, eligible_zones: ['Northside'], phone: '555-0202' }
    ],
    donations: [
      {
        id: 'don-1',
        donor_id: 'donor-1',
        zone: 'Downtown',
        description: '50kg Fresh organic vegetables',
        total_quantity: 50,
        pickup_from: '2026-10-10T10:00',
        pickup_until: '2026-10-10T14:00'
      },
      {
        id: 'don-2',
        donor_id: 'donor-2',
        zone: 'Uptown',
        description: '20kg Bread',
        total_quantity: 20,
        pickup_from: '2026-10-10T09:00',
        pickup_until: '2026-10-10T11:00'
      }
    ],
    claims: []
  };

  seedDatabase(db, initialSeed);
  return db;
}

describe('SurplusLink Comprehensive Test Suite', () => {

  test('1. Valid donation creation', () => {
    const db = createTestDb();
    const created = createDonation(db, {
      donorId: 'donor-1',
      description: 'Apples and pears',
      quantity: 12,
      pickup_from: '2026-10-10T10:00',
      pickup_until: '2026-10-10T12:00',
      zone: 'Downtown'
    });

    assert.ok(created.id);
    assert.equal(created.total_quantity, 12);
    assert.equal(created.description, 'Apples and pears');
    assert.equal(created.is_cancelled, 0);
  });

  test('2. Invalid quantity and pickup windows', () => {
    const db = createTestDb();

    // Zero quantity
    assert.throws(() => {
      createDonation(db, {
        donorId: 'donor-1',
        description: 'Test',
        quantity: 0,
        pickup_from: '2026-10-10T10:00',
        pickup_until: '2026-10-10T12:00',
        zone: 'Downtown'
      });
    }, /Validation failed/);

    // Negative quantity
    assert.throws(() => {
      createDonation(db, {
        donorId: 'donor-1',
        description: 'Test',
        quantity: -5,
        pickup_from: '2026-10-10T10:00',
        pickup_until: '2026-10-10T12:00',
        zone: 'Downtown'
      });
    }, /Validation failed/);

    // pickup_from >= pickup_until
    assert.throws(() => {
      createDonation(db, {
        donorId: 'donor-1',
        description: 'Test',
        quantity: 5,
        pickup_from: '2026-10-10T12:00',
        pickup_until: '2026-10-10T10:00',
        zone: 'Downtown'
      });
    }, /Validation failed/);

    // pickup_until before simulated current time (simulated now = 09:00)
    assert.throws(() => {
      createDonation(db, {
        donorId: 'donor-1',
        description: 'Test',
        quantity: 5,
        pickup_from: '2026-10-10T07:00',
        pickup_until: '2026-10-10T08:30',
        zone: 'Downtown'
      });
    }, /Validation failed/);
  });

  test('3. Donation status precedence and expiration boundaries', () => {
    const donation = {
      id: 'd-test',
      total_quantity: 10,
      pickup_from: '2026-10-10T10:00',
      pickup_until: '2026-10-10T14:00',
      is_cancelled: 0
    };

    // Before window
    assert.equal(calculateDonationStatus(donation, [], '2026-10-10T09:00'), 'OPEN');

    // Exactly at pickup_until: Equality is NOT expired
    assert.equal(calculateDonationStatus(donation, [], '2026-10-10T14:00'), 'OPEN');

    // Strictly after pickup_until: EXPIRED
    assert.equal(calculateDonationStatus(donation, [], '2026-10-10T14:01'), 'EXPIRED');

    // FULLY_CLAIMED precedence over OPEN
    const fullClaim = [{ donation_id: 'd-test', quantity: 10, status: 'ACTIVE' }];
    assert.equal(calculateDonationStatus(donation, fullClaim, '2026-10-10T12:00'), 'FULLY_CLAIMED');

    // EXPIRED takes precedence over FULLY_CLAIMED
    assert.equal(calculateDonationStatus(donation, fullClaim, '2026-10-10T14:05'), 'EXPIRED');

    // CANCELLED takes highest precedence
    donation.is_cancelled = 1;
    assert.equal(calculateDonationStatus(donation, fullClaim, '2026-10-10T15:00'), 'CANCELLED');
    assert.equal(calculateDonationStatus(donation, [], '2026-10-10T08:00'), 'CANCELLED');
  });

  test('4. Successful claim creation', () => {
    const db = createTestDb();
    const claim = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 10,
      plannedPickupTime: '2026-10-10T11:00'
    });

    assert.ok(claim.id);
    assert.equal(claim.status, 'ACTIVE');
    assert.equal(claim.quantity, 10);
    assert.equal(claim.volunteer_id, 'vol-1');
  });

  test('5. Every claim-rule violation, including multiple simultaneous violations', () => {
    const db = createTestDb();
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get('don-1'); // 50kg, 10:00 - 14:00, Downtown
    const volunteer = db.prepare('SELECT * FROM volunteers WHERE id = ?').get('vol-2'); // capacity 15, zone Northside
    // Request: quantity 25 (> vol capacity 15), wrong zone (Downtown vs Northside), planned time 08:00 (< pickup_from 10:00 and < simulated now 09:00)
    const result = validateClaimRules({
      donation,
      volunteer,
      allClaims: [],
      quantity: 25,
      plannedPickupTime: '2026-10-10T08:00',
      simulatedNow: '2026-10-10T09:00'
    });

    assert.equal(result.isValid, false);
    const ruleIds = result.errors.map(e => e.rule);
    // Multiple simultaneous violations returned!
    assert.ok(ruleIds.includes('RULE_2'), 'Should violate Rule 2 (exceeds capacity)');
    assert.ok(ruleIds.includes('RULE_4'), 'Should violate Rule 4 (ineligible zone)');
    assert.ok(ruleIds.includes('RULE_5'), 'Should violate Rule 5 (outside pickup window)');
    assert.ok(ruleIds.includes('RULE_6'), 'Should violate Rule 6 (earlier than simulated current time)');
  });

  test('6. Claims in an ineligible zone', () => {
    const db = createTestDb();
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get('don-1'); // Downtown
    const volunteer = db.prepare('SELECT * FROM volunteers WHERE id = ?').get('vol-2'); // Only Northside

    const result = validateClaimRules({
      donation,
      volunteer,
      allClaims: [],
      quantity: 5,
      plannedPickupTime: '2026-10-10T11:00',
      simulatedNow: '2026-10-10T09:00'
    });

    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.rule === 'RULE_4'));
  });

  test('7. Insufficient remaining kilograms and overbooking attempt', () => {
    const db = createTestDb();
    // don-2 has 20kg. vol-1 (capacity 20) claims 15kg.
    createClaim(db, {
      donationId: 'don-2',
      volunteerId: 'vol-1',
      quantity: 15,
      plannedPickupTime: '2026-10-10T09:30'
    });

    // Attempt to claim 10kg when only 5kg remains
    assert.throws(() => {
      createClaim(db, {
        donationId: 'don-2',
        volunteerId: 'vol-1',
        quantity: 10,
        plannedPickupTime: '2026-10-10T10:45'
      });
    }, (err) => {
      return err.validationErrors && err.validationErrors.some(e => e.rule === 'RULE_3');
    });
  });

  test('8. Exactly 60 minutes between pickup times allowed vs <60 rejected', () => {
    const db = createTestDb();
    // Claim 1 at 10:00
    createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T10:00'
    });

    // 59 minutes apart (10:59) -> Rejected
    assert.throws(() => {
      createClaim(db, {
        donationId: 'don-1',
        volunteerId: 'vol-1',
        quantity: 5,
        plannedPickupTime: '2026-10-10T10:59'
      });
    }, (err) => {
      return err.validationErrors && err.validationErrors.some(e => e.rule === 'RULE_7');
    });

    // Exactly 60 minutes apart (11:00) -> Allowed!
    const claim2 = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T11:00'
    });
    assert.ok(claim2.id);

    // Exactly 60 minutes before (09:00) on don-2 -> Allowed!
    const claim3 = createClaim(db, {
      donationId: 'don-2',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T09:00'
    });
    assert.ok(claim3.id);
  });

  test('9. Pickup-window inclusive boundaries', () => {
    const db = createTestDb();
    // don-1 window: 10:00 to 14:00
    // At exactly 10:00
    const startClaim = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T10:00'
    });
    assert.ok(startClaim.id);

    // At exactly 14:00 (which is 240 mins from 10:00)
    const endClaim = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T14:00'
    });
    assert.ok(endClaim.id);
  });

  test('10. Collecting at the start and end of the pickup window', () => {
    const db = createTestDb();
    const claim = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T11:00'
    });

    // don-1 window: 10:00 to 14:00.
    // Try collecting at 09:30 (before window) -> Refused
    assert.throws(() => {
      collectClaim(db, { claimId: claim.id, volunteerId: 'vol-1' });
    }, /Collection is only permitted during the pickup window/);

    // Advance clock to exactly 10:00 (start of window) -> Allowed!
    advanceClock(db, '2026-10-10T10:00');
    const collected = collectClaim(db, { claimId: claim.id, volunteerId: 'vol-1' });
    assert.equal(collected.status, 'COLLECTED');

    // Prevent repeated collection
    assert.throws(() => {
      collectClaim(db, { claimId: claim.id, volunteerId: 'vol-1' });
    }, /Only ACTIVE claims can be collected/);
  });

  test('11. Cancellation just before T and refusal at T', () => {
    const db = createTestDb();
    const claim = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T12:00'
    });

    // Advance to 11:59 (just before T)
    advanceClock(db, '2026-10-10T11:59');
    // Cancellation should succeed
    const cancelled = cancelClaim(db, { claimId: claim.id, volunteerId: 'vol-1' });
    assert.equal(cancelled.status, 'CANCELLED');

    // Create a new claim at 13:00 (since first is cancelled, no 60m conflict)
    const claim2 = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T13:00'
    });

    // Advance clock to exactly 13:00 (at T)
    advanceClock(db, '2026-10-10T13:00');
    // Refusal at T! (Must be strictly earlier)
    assert.throws(() => {
      cancelClaim(db, { claimId: claim2.id, volunteerId: 'vol-1' });
    }, /Cancellation is only permitted strictly before planned pickup time/);
  });

  test('12. Advancing clock and automatically marking claims MISSED', () => {
    const db = createTestDb();
    // don-2 pickup_until is 11:00.
    const claim = createClaim(db, {
      donationId: 'don-2',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T10:30'
    });
    assert.equal(claim.status, 'ACTIVE');

    // Advance clock to 11:00 (equality: not expired yet)
    advanceClock(db, '2026-10-10T11:00');
    let fetched = db.prepare('SELECT status FROM claims WHERE id = ?').get(claim.id);
    assert.equal(fetched.status, 'ACTIVE');

    // Advance clock to 11:01 (past pickup_until: expired!)
    const result = advanceClock(db, '2026-10-10T11:01');
    assert.equal(result.missedClaimsConverted, 1);
    fetched = db.prepare('SELECT status FROM claims WHERE id = ?').get(claim.id);
    assert.equal(fetched.status, 'MISSED');
  });

  test('13. Donation cancellation restrictions', () => {
    const db = createTestDb();
    // New donation with no claims
    const don = createDonation(db, {
      donorId: 'donor-1',
      description: 'Salad boxes',
      quantity: 10,
      pickup_from: '2026-10-10T10:00',
      pickup_until: '2026-10-10T13:00',
      zone: 'Downtown'
    });

    // Cannot be cancelled by another donor
    assert.throws(() => {
      cancelDonation(db, { donationId: don.id, donorId: 'donor-2' });
    }, /You cannot cancel another donor/);

    // Can be cancelled by owner when OPEN and no claims
    const res = cancelDonation(db, { donationId: don.id, donorId: 'donor-1' });
    assert.equal(res.success, true);
    const updated = db.prepare('SELECT is_cancelled FROM donations WHERE id = ?').get(don.id);
    assert.equal(updated.is_cancelled, 1);

    // Try cancelling a donation that has an active claim
    createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 10,
      plannedPickupTime: '2026-10-10T11:00'
    });

    assert.throws(() => {
      cancelDonation(db, { donationId: 'don-1', donorId: 'donor-1' });
    }, /has 1 active or collected claim/);
  });

  test('14. Dashboard accounting identity holds in all states', () => {
    const db = createTestDb();
    // At simulated now 09:00:
    // don-2 (20kg total, pickup 09:00-11:00): Claim 5kg at 09:30 by vol-1
    const c3 = createClaim(db, {
      donationId: 'don-2',
      volunteerId: 'vol-1',
      quantity: 5,
      plannedPickupTime: '2026-10-10T09:30'
    });

    // don-1 (50kg total, pickup 10:00-14:00): Claim 15kg at 11:00 by vol-1 (90m apart)
    const c1 = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 15,
      plannedPickupTime: '2026-10-10T11:00'
    });

    // don-1: Claim 10kg at 12:30 by vol-1 (90m apart)
    const c2 = createClaim(db, {
      donationId: 'don-1',
      volunteerId: 'vol-1',
      quantity: 10,
      plannedPickupTime: '2026-10-10T12:30'
    });

    // Advance to 10:30 (inside don-1 pickup window 10:00 - 14:00)
    advanceClock(db, '2026-10-10T10:30');
    collectClaim(db, { claimId: c1.id, volunteerId: 'vol-1' }); // c1 COLLECTED (15kg)

    // Advance clock past don-2 pickup_until (11:01) -> c3 becomes MISSED, remaining 15kg on don-2 becomes WASTED
    advanceClock(db, '2026-10-10T11:01');

    const totals = getDashboardTotals(db);
    assert.equal(totals.accounting.is_reconciled, true);
    assert.equal(totals.kpis.listed, totals.accounting.components_sum);
    // Listed = 50 + 20 = 70kg
    assert.equal(totals.kpis.listed, 70);
    // Collected = 15kg (c1)
    assert.equal(totals.kpis.collected, 15);
    // Missed = 5kg (c3)
    assert.equal(totals.kpis.missed, 5);
    // In progress = 10kg (c2)
    assert.equal(totals.kpis.in_progress, 10);
    // Wasted = 15kg (remaining on don-2)
    assert.equal(totals.kpis.wasted, 15);
    // Still open = 25kg (50 - 15 - 10 = 25kg remaining on don-1)
    assert.equal(totals.kpis.still_open, 25);
    // Check sum: 15 + 5 + 10 + 15 + 25 = 70.
    assert.equal(totals.kpis.listed, 15 + 5 + 10 + 15 + 25);
  });

  test('15. Persistence after restart (state retained, seed not re-applied)', async () => {
    const testDbFile = path.join(__dirname, 'test_persist.db');
    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

    // First startup: seed loaded
    const db1 = initDatabase(testDbFile);
    createDonation(db1, {
      donorId: 'donor-1',
      description: 'Persisted Bread',
      quantity: 8,
      pickup_from: '2026-10-10T10:00',
      pickup_until: '2026-10-10T12:00',
      zone: 'Downtown'
    });
    db1.close();

    // Second startup (simulating restart)
    const db2 = initDatabase(testDbFile);
    const donations = db2.prepare('SELECT * FROM donations WHERE description = ?').all('Persisted Bread');
    assert.equal(donations.length, 1);
    db2.close();

    if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  });

  test('16. Concurrent overbooking prevention in transactional execution', () => {
    const db = createTestDb();
    // Create donation with 10kg
    const don = createDonation(db, {
      donorId: 'donor-1',
      description: 'Limited produce',
      quantity: 10,
      pickup_from: '2026-10-10T10:00',
      pickup_until: '2026-10-10T14:00',
      zone: 'Downtown'
    });

    // Two attempts to claim 10kg
    const claim1 = createClaim(db, {
      donationId: don.id,
      volunteerId: 'vol-1',
      quantity: 10,
      plannedPickupTime: '2026-10-10T11:00'
    });
    assert.ok(claim1.id);

    // Second claim must fail because remaining is now 0kg
    assert.throws(() => {
      createClaim(db, {
        donationId: don.id,
        volunteerId: 'vol-1',
        quantity: 10,
        plannedPickupTime: '2026-10-10T12:30'
      });
    }, (err) => {
      return err.validationErrors && err.validationErrors.some(e => e.rule === 'RULE_3');
    });
  });

});
