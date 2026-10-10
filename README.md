# SurplusLink — Food Rescue Platform

SurplusLink is a full-stack, local-first food rescue application engineered for community food recovery. It bridges food donors (markets, bakeries, producers) with local volunteers to collect surplus food before it expires, tracking physical inventory with verified accounting reconciliation and concurrency control.

---

## 1. Project Overview & Features

- **Executive Dashboard & Inventory Accounting**:
  - Live inventory tracking across 6 KPI metrics: **Listed**, **Collected**, **Missed**, **Wasted**, **In Progress**, and **Still Open**.
  - Visible mathematical reconciliation verifying the identity:
    $$\text{Listed} = \text{Collected} + \text{Missed} + \text{Wasted} + \text{In Progress} + \text{Still Open}$$
  - Dynamic status summaries and donor/volunteer leaderboard metrics.
- **Volunteer Workflows**:
  - Browse open surplus food donations filtered by volunteer eligible zones.
  - Multi-rule claim validation engine enforcing volunteer capacity, remaining inventory, zone eligibility, pickup windows, and 60-minute scheduling buffers.
  - Claim fulfillment (Collection) strictly during pickup windows.
  - Claim cancellation strictly prior to planned pickup time $T$, immediately releasing inventory.
- **Donor Workflows**:
  - List new surplus food batches with whole kilogram quantities, zone assignment, and pickup windows.
  - Inspect associated volunteer claims.
  - Cancel open donations with zero active/collected claims.
- **Simulated Clock Engine**:
  - Standalone simulated clock initialized from `seed.json` (`2026-10-10T09:00`).
  - Independent of system clock; prevents backward time travel.
  - Automatically transitions active claims past their pickup deadline to `MISSED` and remaining kilograms to `WASTED`.
- **Persona / Role Switcher**:
  - Switch seamlessly between volunteer and donor personas from seeded records without external authentication services.

---

## 2. Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Vanilla CSS Design System with accessible green sustainability palette, responsive sidebar navigation, rounded cards, and status badges.
- **Icons**: Lucide React
- **Backend**: Node.js (ES Modules) + Express
- **Database**: SQLite via `better-sqlite3` with persistent local storage and WAL mode
- **Testing**: Built-in Node test runner (`node --test`)

---

## 3. Project Folder Structure

```
Superplus/
├── backend/
│   ├── tests/
│   │   └── business_rules.test.js  # 16 comprehensive automated tests
│   ├── db.js                       # SQLite schema, connection & non-destructive seed loader
│   ├── package.json                # Backend dependencies and scripts
│   ├── rules.js                    # Business rules validation engine & status calculator
│   ├── server.js                   # REST API server & static frontend host
│   ├── services.js                 # Transactional mutations, overbooking prevention & accounting
│   └── timeUtils.js                # Timezone-safe minute calculations (YYYY-MM-DDTHH:MM)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClaimModal.jsx      # Claim dialog with multi-rule error reporting
│   │   │   ├── ClockModal.jsx      # Simulated time advance dialog
│   │   │   ├── NewDonationModal.jsx# Donor batch creation modal
│   │   │   ├── Sidebar.jsx         # Desktop & mobile responsive sidebar
│   │   │   ├── StatusBadge.jsx     # Status badges (OPEN, FULLY_CLAIMED, etc.)
│   │   │   └── TopBar.jsx          # Simulated clock pill & persona selector
│   │   ├── views/
│   │   │   ├── ClockView.jsx       # Dedicated simulated clock controller
│   │   │   ├── DashboardView.jsx   # 6 KPI cards & verified reconciliation identity
│   │   │   ├── DonationsView.jsx   # Donation exploration & claiming
│   │   │   ├── ManageDonationsView.jsx # Donor listings & claim drawers
│   │   │   └── VolunteerClaimsView.jsx # Volunteer claims & collection/cancel actions
│   │   ├── api.js                  # Frontend REST API wrapper
│   │   ├── App.jsx                 # Main application state orchestrator
│   │   ├── index.css               # Design system tokens and styles
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── seed.json                       # Seed data specification
├── package.json                    # Root scripts
├── README.md                       # Documentation
└── AI_USAGE.md                     # AI usage and verification log
```

---

## 4. Prerequisites

- **Node.js**: v18.0.0 or later (v24.14.0 recommended)
- **npm**: v9.0.0 or later

---

## 5. Installation & Running Instructions

### Step 1: Install Dependencies
From the project root:
```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Build Frontend
```bash
cd frontend
npm run build
cd ..
```

### Step 3: Run the Application
You can run the full-stack application in either of two modes:

#### Option A: Unified Server (Recommended for Reviewers)
```bash
node backend/server.js
```
The backend serves both the REST API and the React single-page application on:
**[http://localhost:4000](http://localhost:4000)**

#### Option B: Development Mode with Vite HMR
In terminal 1 (Backend):
```bash
cd backend
npm start
```
In terminal 2 (Frontend Dev Server):
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser. (API requests are automatically proxied to port 4000).

---

## 6. How SQLite Database & Seed Initialization Work

1. On startup, `backend/db.js` initializes the SQLite database file (`backend/surpluslink.db`) with Foreign Keys enabled and Write-Ahead Logging (`WAL`) enabled.
2. The schema contains 5 tables: `clock`, `donors`, `volunteers`, `donations`, and `claims`.
3. **Non-destructive initialization**: The database checks `SELECT COUNT(*) FROM clock`.
   - If empty, it populates the database from `seed.json`.
   - If records already exist, **no seeding occurs**. Existing application state is preserved.
   - Restarting the backend server never resets or overwrites user modifications.

---

## 7. Example Workflows

### Donor Workflow
1. Select **Donor** role in the top-right persona selector (e.g., *GreenGrocer Market*).
2. Go to **Manage Donations** in the sidebar.
3. Click **New Surplus Batch**:
   - Description: `30kg Organic heirloom tomatoes`
   - Quantity: `30` kg
   - Zone: `Downtown`
   - Pickup Window: `2026-10-10T10:00` to `2026-10-10T15:00`
4. The donation appears in your batch list with status `OPEN`.
5. You can view associated claims by expanding the claims drawer.
6. If no active or collected claims exist, you can cancel the donation with the **Cancel Batch** button.

### Volunteer Workflow
1. Select **Volunteer** role in the persona selector (e.g., *Alex Rivera*, Capacity: 20kg, Zones: Downtown, Uptown).
2. Navigate to **Donations**. The filter defaults to **Eligible for Alex** (showing only OPEN donations in Downtown/Uptown).
3. Click **Claim Food** on an open donation:
   - Enter quantity (e.g., `15` kg).
   - Choose planned pickup time within the donation's window (e.g., `2026-10-10T11:00`).
   - If all rules pass, the claim is confirmed as `ACTIVE`.
   - If any rules are violated (e.g., quantity exceeds capacity or another claim is within 60 minutes), **all violated rules are highlighted**.
4. Go to **Volunteer Claims**:
   - When the simulated clock is within the pickup window, click **Collect** to fulfill the claim.
   - If the clock is strictly before the planned pickup time, click **Cancel** to release the kilograms back to the donation.

---

## 8. Business Rules & Logic

### Claim Rules (All evaluated simultaneously)
- **Rule 1**: Donation must not be `CANCELLED` or `EXPIRED`.
- **Rule 2**: Claim quantity $K$ must not exceed volunteer capacity $V_{\text{cap}}$.
- **Rule 3**: Claim quantity $K$ must not exceed donation remaining quantity.
- **Rule 4**: Donation zone must be listed in volunteer's eligible zones.
- **Rule 5**: Planned pickup time $T$ must be between donation `pickup_from` and `pickup_until` inclusive.
- **Rule 6**: Planned pickup time $T$ must not be earlier than simulated current time.
- **Rule 7**: Planned pickup time $T$ must be at least 60 minutes apart from any other `ACTIVE` or `COLLECTED` claim belonging to the volunteer:
  $$|T - T_{\text{other}}| \ge 60\text{ minutes}$$
  (An exact difference of 60 minutes is valid).

### Claim Fulfillment & Cancellation
- **Collection**: Allowed only by the claim owner when status is `ACTIVE` and current simulated time is between `pickup_from` and `pickup_until` inclusive.
- **Cancellation**: Allowed only by the claim owner when status is `ACTIVE` and current simulated time is strictly earlier than planned pickup time $T$.

### Donation Status Precedence
1. `CANCELLED` if donor cancelled it (`is_cancelled = 1`).
2. `EXPIRED` if simulated now is strictly after `pickup_until` (`simulated_now > pickup_until`). Equality is not expired.
3. `FULLY_CLAIMED` if remaining quantity is 0.
4. `OPEN` otherwise.

---

## 9. Simulated Clock Engine

- All business rules evaluate against the SQLite `clock` table.
- The clock timestamp is stored as local ISO `YYYY-MM-DDTHH:MM` strings without timezone drift.
- Fast-forward presets (`+15m`, `+30m`, `+1h`, `+2h`, `+4h`, `+1 day`) and custom inputs allow advancing the clock.
- Clock updates are strictly monotonic (cannot move backwards).
- **Automated Expired Claim Transition**:
  When the clock advances past any donation's `pickup_until`, an atomic transaction converts all associated `ACTIVE` claims to `MISSED`, and recalculates remaining uncollected kilograms as `WASTED`.

---

## 10. Testing Accounting Identity & Overbooking Protection

### Running the Automated Test Suite
From the `backend` directory:
```bash
npm test
```
This runs 16 automated test suites covering:
1. Valid donation creation.
2. Invalid quantities and invalid pickup windows.
3. Donation status precedence and expiration boundary equality.
4. Successful claim creation.
5. Multiple simultaneous claim rule violations.
6. Ineligible zone rejection.
7. Insufficient remaining quantity rejection.
8. Exactly 60 minutes separation (allowed) vs <60 minutes (rejected).
9. Pickup window inclusive boundary validation.
10. Collection at pickup window start and end.
11. Cancellation strictly before $T$ and refusal at $T$.
12. Automatic transition of active claims to `MISSED` on clock advance.
13. Donation cancellation restrictions (must be OPEN with no claims).
14. Complete dashboard accounting identity verification.
15. State persistence across backend restarts.
16. Transactional overbooking protection under concurrent claims.

---

## 11. Known Limitations

- Real authentication/passwords and map APIs are intentionally excluded per project instructions to keep the application lightweight, fully offline, and evaluable.
- Timestamps do not use timezone offsets (local string semantics are enforced across all operations).
