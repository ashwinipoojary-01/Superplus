import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import {
  advanceClock,
  cancelClaim,
  cancelDonation,
  collectClaim,
  createClaim,
  createDonation,
  getAllClaims,
  getAllDonations,
  getAllDonors,
  getAllVolunteers,
  getAppState,
  getDashboardTotals,
  getSimulatedNow
} from './services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(dbInstance) {
  const app = express();
  const db = dbInstance || initDatabase();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SurplusLink API', simulated_now: getSimulatedNow(db) });
  });

  // Complete application state
  app.get('/api/state', (req, res) => {
    try {
      const state = getAppState(db);
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Simulated clock
  app.get('/api/clock', (req, res) => {
    try {
      const simulatedNow = getSimulatedNow(db);
      res.json({ simulated_now: simulatedNow });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/clock/advance', (req, res) => {
    try {
      const { newSimulatedNow } = req.body;
      if (!newSimulatedNow) {
        return res.status(400).json({ error: 'Missing newSimulatedNow field.' });
      }
      const result = advanceClock(db, newSimulatedNow);
      res.json({
        success: true,
        ...result,
        app_state: getAppState(db)
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Donors
  app.get('/api/donors', (req, res) => {
    try {
      const donors = getAllDonors(db);
      res.json(donors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/donors/:id', (req, res) => {
    try {
      const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
      if (!donor) return res.status(404).json({ error: 'Donor not found.' });
      res.json(donor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Volunteers
  app.get('/api/volunteers', (req, res) => {
    try {
      const volunteers = getAllVolunteers(db);
      res.json(volunteers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/volunteers/:id', (req, res) => {
    try {
      const vol = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(req.params.id);
      if (!vol) return res.status(404).json({ error: 'Volunteer not found.' });
      res.json({
        ...vol,
        eligible_zones: JSON.parse(vol.eligible_zones || '[]')
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Donations
  app.get('/api/donations', (req, res) => {
    try {
      const donations = getAllDonations(db);
      res.json(donations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/donations/:id', (req, res) => {
    try {
      const donations = getAllDonations(db);
      const donation = donations.find(d => d.id === req.params.id);
      if (!donation) return res.status(404).json({ error: 'Donation not found.' });
      const claims = db.prepare('SELECT * FROM claims WHERE donation_id = ?').all(req.params.id);
      res.json({ ...donation, claims });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/donations', (req, res) => {
    try {
      const { donorId, description, quantity, pickup_from, pickup_until, zone } = req.body;
      const created = createDonation(db, { donorId, description, quantity, pickup_from, pickup_until, zone });
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message,
        details: err.details || null
      });
    }
  });

  app.post('/api/donations/:id/cancel', (req, res) => {
    try {
      const { donorId } = req.body;
      const result = cancelDonation(db, { donationId: req.params.id, donorId });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  // Claims
  app.get('/api/claims', (req, res) => {
    try {
      let claims = getAllClaims(db);
      if (req.query.volunteerId) {
        claims = claims.filter(c => c.volunteer_id === req.query.volunteerId);
      }
      if (req.query.donationId) {
        claims = claims.filter(c => c.donation_id === req.query.donationId);
      }
      res.json(claims);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/claims', (req, res) => {
    try {
      const { donationId, volunteerId, quantity, plannedPickupTime } = req.body;
      const claim = createClaim(db, { donationId, volunteerId, quantity, plannedPickupTime });
      res.status(201).json(claim);
    } catch (err) {
      res.status(err.status || 500).json({
        error: err.message,
        validationErrors: err.validationErrors || []
      });
    }
  });

  app.post('/api/claims/:id/collect', (req, res) => {
    try {
      const { volunteerId } = req.body;
      const claim = collectClaim(db, { claimId: req.params.id, volunteerId });
      res.json(claim);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.post('/api/claims/:id/cancel', (req, res) => {
    try {
      const { volunteerId } = req.body;
      const claim = cancelClaim(db, { claimId: req.params.id, volunteerId });
      res.json(claim);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  // Dashboard & Accounting
  app.get('/api/dashboard', (req, res) => {
    try {
      const totals = getDashboardTotals(db);
      res.json(totals);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve frontend static build if available
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  return { app, db };
}

// Standalone server execution
const isMain = process.argv[1] && process.argv[1].endsWith('server.js');
if (isMain) {
  const PORT = process.env.PORT || 4000;
  const { app } = createApp();
  app.listen(PORT, () => {
    console.log(`[SurplusLink Backend] Server listening on http://localhost:${PORT}`);
  });
}
