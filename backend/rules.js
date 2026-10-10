import { compareTimes, diffMinutes, isValidIsoDateTime } from './timeUtils.js';

/**
 * Computes remaining quantity for a donation.
 * Remaining quantity = total_quantity - sum of quantities of claims whose status is not CANCELLED.
 */
export function calculateRemainingQuantity(donation, claims) {
  const donationClaims = claims.filter(c => c.donation_id === donation.id && c.status !== 'CANCELLED');
  const claimedTotal = donationClaims.reduce((sum, c) => sum + Number(c.quantity), 0);
  return Math.max(0, Number(donation.total_quantity) - claimedTotal);
}

/**
 * Computes donation status using exact precedence:
 * 1. CANCELLED if the donor cancelled it.
 * 2. EXPIRED if simulated now is strictly after pickup_until.
 * 3. FULLY_CLAIMED if remaining quantity is zero.
 * 4. OPEN otherwise.
 */
export function calculateDonationStatus(donation, claims, simulatedNow) {
  if (donation.is_cancelled || donation.status === 'CANCELLED') {
    return 'CANCELLED';
  }

  // Strictly after pickup_until. Equality is NOT expired.
  if (compareTimes(simulatedNow, donation.pickup_until) > 0) {
    return 'EXPIRED';
  }

  const remaining = calculateRemainingQuantity(donation, claims);
  if (remaining === 0) {
    return 'FULLY_CLAIMED';
  }

  return 'OPEN';
}

/**
 * Validates a claim request.
 * Returns an object { isValid: boolean, errors: Array<{ rule: string, message: string }> }
 * Evaluates ALL 7 business rules and collects all violations.
 */
export function validateClaimRules({
  donation,
  volunteer,
  allClaims,
  quantity,
  plannedPickupTime,
  simulatedNow
}) {
  const errors = [];

  // Input validation
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      isValid: false,
      errors: [{ rule: 'INPUT_INVALID', message: 'Quantity must be a positive whole number in kilograms.' }]
    };
  }

  if (!isValidIsoDateTime(plannedPickupTime)) {
    return {
      isValid: false,
      errors: [{ rule: 'INPUT_INVALID', message: 'Planned pickup time must be in YYYY-MM-DDTHH:MM format.' }]
    };
  }

  if (!donation) {
    return {
      isValid: false,
      errors: [{ rule: 'NOT_FOUND', message: 'Donation not found.' }]
    };
  }

  if (!volunteer) {
    return {
      isValid: false,
      errors: [{ rule: 'NOT_FOUND', message: 'Volunteer not found.' }]
    };
  }

  const donStatus = calculateDonationStatus(donation, allClaims, simulatedNow);
  const remaining = calculateRemainingQuantity(donation, allClaims);
  const eligibleZones = Array.isArray(volunteer.eligible_zones)
    ? volunteer.eligible_zones
    : JSON.parse(volunteer.eligible_zones || '[]');

  // Rule 1: D must not be CANCELLED or EXPIRED
  if (donStatus === 'CANCELLED' || donStatus === 'EXPIRED') {
    errors.push({
      rule: 'RULE_1',
      message: `Donation must not be CANCELLED or EXPIRED (Current status: ${donStatus}).`
    });
  }

  // Rule 2: K must not exceed V's capacity
  if (quantity > volunteer.capacity) {
    errors.push({
      rule: 'RULE_2',
      message: `Claim quantity (${quantity}kg) exceeds volunteer capacity (${volunteer.capacity}kg).`
    });
  }

  // Rule 3: K must not exceed D's remaining quantity
  if (quantity > remaining) {
    errors.push({
      rule: 'RULE_3',
      message: `Claim quantity (${quantity}kg) exceeds remaining donation quantity (${remaining}kg).`
    });
  }

  // Rule 4: D's zone must be one of V's eligible zones
  if (!eligibleZones.includes(donation.zone)) {
    errors.push({
      rule: 'RULE_4',
      message: `Donation zone '${donation.zone}' is not in volunteer eligible zones [${eligibleZones.join(', ')}].`
    });
  }

  // Rule 5: T must be between pickup_from and pickup_until, inclusive
  const beforeStart = compareTimes(plannedPickupTime, donation.pickup_from) < 0;
  const afterEnd = compareTimes(plannedPickupTime, donation.pickup_until) > 0;
  if (beforeStart || afterEnd) {
    errors.push({
      rule: 'RULE_5',
      message: `Planned pickup time ${plannedPickupTime} must be between ${donation.pickup_from} and ${donation.pickup_until} (inclusive).`
    });
  }

  // Rule 6: T must not be earlier than simulated current time
  if (compareTimes(plannedPickupTime, simulatedNow) < 0) {
    errors.push({
      rule: 'RULE_6',
      message: `Planned pickup time ${plannedPickupTime} cannot be earlier than simulated current time ${simulatedNow}.`
    });
  }

  // Rule 7: T must be at least 60 minutes apart from the planned pickup time of every other ACTIVE or COLLECTED claim belonging to V
  const volunteerClaims = allClaims.filter(
    c => c.volunteer_id === volunteer.id && (c.status === 'ACTIVE' || c.status === 'COLLECTED')
  );

  for (const c of volunteerClaims) {
    const diff = diffMinutes(plannedPickupTime, c.planned_pickup_time);
    if (diff < 60) {
      errors.push({
        rule: 'RULE_7',
        message: `Planned pickup time ${plannedPickupTime} is within 60 minutes of your existing ${c.status} claim at ${c.planned_pickup_time} (${diff} minutes apart, minimum required is 60).`
      });
      break; // One violation note for Rule 7 is clear and sufficient
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates claim collection.
 */
export function validateClaimCollection({ claim, donation, volunteerId, simulatedNow }) {
  if (!claim) {
    return { isValid: false, error: 'Claim not found.' };
  }
  if (claim.volunteer_id !== volunteerId) {
    return { isValid: false, error: 'Only the volunteer who owns this claim can collect it.' };
  }
  if (claim.status !== 'ACTIVE') {
    return { isValid: false, error: `Claim cannot be collected because its status is ${claim.status}. Only ACTIVE claims can be collected.` };
  }
  // Simulated current time must be between pickup_from and pickup_until, inclusive
  if (
    compareTimes(simulatedNow, donation.pickup_from) < 0 ||
    compareTimes(simulatedNow, donation.pickup_until) > 0
  ) {
    return {
      isValid: false,
      error: `Collection is only permitted during the pickup window (${donation.pickup_from} to ${donation.pickup_until}). Current time is ${simulatedNow}.`
    };
  }
  return { isValid: true };
}

/**
 * Validates claim cancellation by volunteer.
 */
export function validateClaimCancellation({ claim, volunteerId, simulatedNow }) {
  if (!claim) {
    return { isValid: false, error: 'Claim not found.' };
  }
  if (claim.volunteer_id !== volunteerId) {
    return { isValid: false, error: 'Only the volunteer who owns this claim can cancel it.' };
  }
  if (claim.status !== 'ACTIVE') {
    return { isValid: false, error: `Claim cannot be cancelled because its status is ${claim.status}. Only ACTIVE claims can be cancelled.` };
  }
  // Simulated current time must be strictly earlier than planned pickup time T
  if (compareTimes(simulatedNow, claim.planned_pickup_time) >= 0) {
    return {
      isValid: false,
      error: `Claim cancellation refused. Cancellation is only permitted strictly before planned pickup time (${claim.planned_pickup_time}). Current time is ${simulatedNow}.`
    };
  }
  return { isValid: true };
}

/**
 * Validates donation cancellation by donor.
 */
export function validateDonationCancellation({ donation, claims, donorId, simulatedNow }) {
  if (!donation) {
    return { isValid: false, error: 'Donation not found.' };
  }
  if (donation.donor_id !== donorId) {
    return { isValid: false, error: 'You cannot cancel another donor’s donation.' };
  }
  const status = calculateDonationStatus(donation, claims, simulatedNow);
  if (status !== 'OPEN') {
    return {
      isValid: false,
      error: `Donation cannot be cancelled because its status is ${status}. Only OPEN donations can be cancelled.`
    };
  }
  // Must have no ACTIVE or COLLECTED claims
  const activeOrCollected = claims.filter(
    c => c.donation_id === donation.id && (c.status === 'ACTIVE' || c.status === 'COLLECTED')
  );
  if (activeOrCollected.length > 0) {
    return {
      isValid: false,
      error: `Donation cannot be cancelled because it has ${activeOrCollected.length} active or collected claim(s).`
    };
  }
  return { isValid: true };
}

/**
 * Validates donation creation by donor.
 */
export function validateDonationCreation({ description, quantity, pickup_from, pickup_until, zone, simulatedNow }) {
  const errors = [];
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description is required.');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push('Quantity must be a whole number greater than or equal to 1.');
  }
  if (!isValidIsoDateTime(pickup_from)) {
    errors.push('Pickup start time must be a valid timestamp (YYYY-MM-DDTHH:MM).');
  }
  if (!isValidIsoDateTime(pickup_until)) {
    errors.push('Pickup end time must be a valid timestamp (YYYY-MM-DDTHH:MM).');
  }
  if (isValidIsoDateTime(pickup_from) && isValidIsoDateTime(pickup_until)) {
    if (compareTimes(pickup_from, pickup_until) >= 0) {
      errors.push('Pickup start time must be earlier than pickup end time.');
    }
    // pickup_until cannot be before the simulated current time
    if (compareTimes(pickup_until, simulatedNow) < 0) {
      errors.push(`Pickup end time cannot be earlier than the current simulated time (${simulatedNow}).`);
    }
  }
  if (!zone || typeof zone !== 'string' || zone.trim().length === 0) {
    errors.push('Zone is required.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
