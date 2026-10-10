# AI_USAGE.md

## 1. AI Tool Assisting Implementation
- **Tool**: Antigravity AI Assistant (powered by Google DeepMind / Gemini 3.8 Flash)
- **Role**: Pair programmer and full-stack software development assistant for the 3-hour Software Development Intern hackathon challenge.

---

## 2. AI-Assisted Components

- **Architecture Design**:
  - Structuring the full-stack repository into modular `backend/` and `frontend/` directories with a clear boundary.
  - Designing the SQLite relational schema (`clock`, `donors`, `volunteers`, `donations`, `claims`) with transactional constraints.
- **Backend Implementation**:
  - Time utilities (`timeUtils.js`) for timezone-safe minute-based calculations without timezone shift bugs.
  - Validation engine (`rules.js`) that enforces all 7 business rules and collects all violated rules simultaneously.
  - State management and transactional operations (`services.js`) enforcing overbooking protection using SQLite immediate transactions.
  - Express REST API endpoints (`server.js`) with structured JSON error responses and static asset serving.
- **Frontend Implementation**:
  - React + Vite user interface with custom CSS design system using an accessible green palette, clean cards, and responsive sidebar navigation.
  - UI components for real-time persona switching (donor vs volunteer), prominent simulated clock pill, fast-forward modals, and claims handling.
  - Live accounting reconciliation formula display verified on the executive dashboard.
- **Automated Test Suite**:
  - Writing 16 integration tests in `backend/tests/business_rules.test.js` validating all critical business rules, boundary conditions, concurrency, and accounting invariants.

---

## 3. Implementation Decisions Accepted

1. **Local Time ISO Format**:
   - Timestamps are formatted as `YYYY-MM-DDTHH:MM`. Handled with UTC minute math (`Date.UTC`) to avoid operating system timezone conversion anomalies while maintaining exact minute differences for the 60-minute rule.
2. **Dynamic Status Precedence**:
   - Donation status is calculated dynamically from persisted records and the simulated clock (`CANCELLED` > `EXPIRED` > `FULLY_CLAIMED` > `OPEN`).
   - Equality with `pickup_until` is defined as not expired; strictly greater is expired.
3. **Multi-Rule Evaluation**:
   - Rather than returning early on the first rule failure, the claim validation engine evaluates all rules and returns an array of structured error objects (`RULE_1` through `RULE_7`), rendered in the UI as distinct alerts.
4. **Immediate Transactions for Concurrency**:
   - `better-sqlite3` database transactions serialize writes and recalculate remaining quantities inside the transaction, preventing overbooking.
5. **Non-destructive Seed Initialization**:
   - Database checks for existing records before running the seed routine. Existing state is never overwritten across backend restarts.

---

## 4. Manually Reviewed, Changed, or Rejected

1. **Path-to-Regexp / Express 5 Route Handling**:
   - Express 5 threw a `PathError: Missing parameter name at index 1: *` when using `app.get('*')`.
   - *Fix applied*: Replaced with custom middleware fallback (`app.use((req, res, next) => ...)`) that serves `index.html` for GET requests while preserving all `/api` endpoints.
2. **SQLite Query Parameterization in Tests**:
   - An initial test query used `WHERE id = "don-1"` which SQLite interpreted as a column identifier rather than a string literal.
   - *Fix applied*: Corrected to use parameterized queries (`WHERE id = ?`).
3. **Test 14 Clock Advance Order**:
   - Test 14 attempted to create a claim at `09:30` after already advancing the clock to `10:30`, which correctly triggered Rule 6.
   - *Fix applied*: Reordered test sequence so claims are scheduled prior to advancing the simulated clock past their execution window.
4. **Playwright Browser Subagent**:
   - The automated headless browser subagent failed due to a missing Windows driver zip from the upstream CDN (`playwright-1.57.0-win32_x64.zip` returned 404).
   - *Fix applied*: Tested and verified all UI and API workflows directly via live development server, curl/REST commands, and automated test runners.

---

## 5. Tests Executed & Results

All 16 automated backend tests were executed via `npm test` using Node.js built-in test runner (`node --test tests/*.test.js`).

| Test # | Test Description | Result |
| :--- | :--- | :--- |
| 1 | Valid donation creation | **PASSED** |
| 2 | Invalid quantity and pickup windows | **PASSED** |
| 3 | Donation status precedence and expiration boundaries | **PASSED** |
| 4 | Successful claim creation | **PASSED** |
| 5 | Every claim-rule violation, including multiple simultaneous violations | **PASSED** |
| 6 | Claims in an ineligible zone | **PASSED** |
| 7 | Insufficient remaining kilograms and overbooking attempt | **PASSED** |
| 8 | Exactly 60 minutes between pickup times allowed vs <60 rejected | **PASSED** |
| 9 | Pickup-window inclusive boundaries | **PASSED** |
| 10 | Collecting at the start and end of the pickup window | **PASSED** |
| 11 | Cancellation just before $T$ and refusal at $T$ | **PASSED** |
| 12 | Advancing clock and automatically marking claims MISSED | **PASSED** |
| 13 | Donation cancellation restrictions | **PASSED** |
| 14 | Dashboard accounting identity holds in all states | **PASSED** |
| 15 | Persistence after restart (state retained, seed not re-applied) | **PASSED** |
| 16 | Concurrent overbooking prevention in transactional execution | **PASSED** |

**Summary**: 16 tests executed, 16 passed, 0 failed.
Live API endpoints and state persistence across process restarts were also verified via REST calls.
