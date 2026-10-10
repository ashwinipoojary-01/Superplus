import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initDatabase(dbPath, seedPath) {
  const resolvedDbPath = dbPath || process.env.DB_PATH || path.join(__dirname, 'surpluslink.db');
  const db = new Database(resolvedDbPath);

  // Enable foreign keys and WAL mode for better concurrency
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS clock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      simulated_now TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS volunteers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      eligible_zones TEXT NOT NULL,
      phone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donations (
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

    CREATE TABLE IF NOT EXISTS claims (
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

  // Check if state exists
  const clockCount = db.prepare('SELECT COUNT(*) as count FROM clock').get().count;

  if (clockCount === 0) {
    // Only initialize from seed if no state exists!
    const candidateSeedPaths = [
      seedPath,
      process.env.SEED_PATH,
      path.join(__dirname, '..', 'seed.json'),
      path.join(__dirname, 'seed.json'),
      path.join(process.cwd(), 'seed.json')
    ].filter(Boolean);

    let seedLoaded = false;
    for (const sp of candidateSeedPaths) {
      if (fs.existsSync(sp)) {
        try {
          const raw = fs.readFileSync(sp, 'utf8');
          const seedData = JSON.parse(raw);
          seedDatabase(db, seedData);
          console.log(`[DB] Successfully initialized database from seed: ${sp}`);
          seedLoaded = true;
          break;
        } catch (err) {
          console.error(`[DB] Error parsing seed file at ${sp}:`, err);
        }
      }
    }

    if (!seedLoaded) {
      console.warn('[DB] Warning: No seed.json found. Initializing with default fallback clock.');
      db.prepare('INSERT INTO clock (id, simulated_now) VALUES (1, ?)').run('2026-10-10T09:00');
    }
  } else {
    console.log('[DB] Existing saved state found. Retaining existing database without re-seeding.');
  }

  return db;
}

export function seedDatabase(db, seedData) {
  const insertSeed = db.transaction(() => {
    // 1. Clock
    const simNow = seedData.simulated_now || '2026-10-10T09:00';
    db.prepare('INSERT OR REPLACE INTO clock (id, simulated_now) VALUES (1, ?)').run(simNow);

    // 2. Donors
    const insertDonor = db.prepare('INSERT OR IGNORE INTO donors (id, name, address, phone) VALUES (?, ?, ?, ?)');
    for (const d of seedData.donors || []) {
      insertDonor.run(d.id, d.name, d.address, d.phone);
    }

    // 3. Volunteers
    const insertVol = db.prepare('INSERT OR IGNORE INTO volunteers (id, name, capacity, eligible_zones, phone) VALUES (?, ?, ?, ?, ?)');
    for (const v of seedData.volunteers || []) {
      insertVol.run(v.id, v.name, v.capacity, JSON.stringify(v.eligible_zones || []), v.phone);
    }

    // 4. Donations
    const insertDonation = db.prepare(`
      INSERT OR IGNORE INTO donations (id, donor_id, zone, description, total_quantity, pickup_from, pickup_until, is_cancelled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const don of seedData.donations || []) {
      insertDonation.run(
        don.id,
        don.donor_id,
        don.zone,
        don.description,
        don.total_quantity,
        don.pickup_from,
        don.pickup_until,
        don.is_cancelled ? 1 : 0,
        simNow
      );
    }

    // 5. Claims
    const insertClaim = db.prepare(`
      INSERT OR IGNORE INTO claims (id, donation_id, volunteer_id, quantity, planned_pickup_time, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cl of seedData.claims || []) {
      insertClaim.run(
        cl.id,
        cl.donation_id,
        cl.volunteer_id,
        cl.quantity,
        cl.planned_pickup_time,
        cl.status,
        simNow
      );
    }
  });

  insertSeed();
}
