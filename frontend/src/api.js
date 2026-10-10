/**
 * api.js
 * Client REST API service wrapper for SurplusLink backend.
 */

const API_BASE = '/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || res.statusText || 'Request failed');
    error.status = res.status;
    error.validationErrors = data.validationErrors || [];
    error.details = data.details || [];
    throw error;
  }
  return data;
}

export const api = {
  async getState() {
    const res = await fetch(`${API_BASE}/state`);
    return handleResponse(res);
  },

  async getClock() {
    const res = await fetch(`${API_BASE}/clock`);
    return handleResponse(res);
  },

  async advanceClock(newSimulatedNow) {
    const res = await fetch(`${API_BASE}/clock/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newSimulatedNow })
    });
    return handleResponse(res);
  },

  async getDonations() {
    const res = await fetch(`${API_BASE}/donations`);
    return handleResponse(res);
  },

  async createDonation(payload) {
    const res = await fetch(`${API_BASE}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async cancelDonation(donationId, donorId) {
    const res = await fetch(`${API_BASE}/donations/${donationId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorId })
    });
    return handleResponse(res);
  },

  async getClaims(volunteerId) {
    const url = volunteerId ? `${API_BASE}/claims?volunteerId=${volunteerId}` : `${API_BASE}/claims`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async createClaim(payload) {
    const res = await fetch(`${API_BASE}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async collectClaim(claimId, volunteerId) {
    const res = await fetch(`${API_BASE}/claims/${claimId}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId })
    });
    return handleResponse(res);
  },

  async cancelClaim(claimId, volunteerId) {
    const res = await fetch(`${API_BASE}/claims/${claimId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId })
    });
    return handleResponse(res);
  },

  async getDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`);
    return handleResponse(res);
  }
};
