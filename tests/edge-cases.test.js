// Feature: expense-budget-visualizer, Task: 12.2 localStorage fallback

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// ---------------------------------------------------------------------------
// Inline copies of the pure storage functions from app.js.
// These mirror the implementation exactly so the tests validate the real logic
// without requiring ES module exports from app.js.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'expense_transactions';

/** @param {*} entry @returns {boolean} */
function isValidTransaction(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const allowedCategories = ['Food', 'Transport', 'Fun'];
  const hasValidId        = typeof entry.id === 'string' && entry.id.trim().length > 0;
  const hasValidItemName  = typeof entry.itemName === 'string'
                            && entry.itemName.trim().length > 0
                            && entry.itemName.length <= 100;
  const hasValidAmount    = typeof entry.amount === 'number'
                            && isFinite(entry.amount)
                            && entry.amount > 0
                            && entry.amount <= 999999999.99;
  const hasValidCategory  = allowedCategories.includes(entry.category);
  const hasValidTimestamp = typeof entry.timestamp === 'number'
                            && isFinite(entry.timestamp)
                            && entry.timestamp > 0;
  return hasValidId && hasValidItemName && hasValidAmount && hasValidCategory && hasValidTimestamp;
}

/**
 * Parameterised version of loadTransactions() — accepts a storage object so
 * tests can inject different localStorage behaviours. Logic is identical to
 * app.js.
 *
 * @param {{ getItem: (key: string) => string | null }} storage
 * @returns {Array}
 */
function loadTransactionsWithStorage(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransaction);
  } catch (_err) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers for full-app DOM integration tests
// ---------------------------------------------------------------------------

/** app.js source — read once at module load */
const APP_JS_SRC = readFileSync(resolve(__dir, '../js/app.js'), 'utf8');

/** Minimal HTML skeleton matching index.html's relevant IDs */
const HTML_SKELETON = `<!DOCTYPE html><html><head></head><body>
  <span id="balance-display">$0.00</span>
  <p id="empty-list-message">No transactions have been added yet.</p>
  <section class="transaction-list-section">
    <ul id="transaction-list" hidden></ul>
    <p id="delete-error-banner" hidden></p>
  </section>
  <form id="transaction-form">
    <input id="item-name" /><span class="error" id="item-name-error"></span>
    <input id="amount" /><span class="error" id="amount-error"></span>
    <select id="category"><option value="">--</option></select>
    <span class="error" id="category-error"></span>
    <button type="submit">Add</button>
  </form>
  <p id="chart-placeholder">No spending data available.</p>
  <canvas id="expense-chart"></canvas>
  <p id="chart-error-banner" hidden></p>
</body></html>`;

/**
 * Builds a jsdom window with app.js evaluated inside it and localStorage
 * controlled by the provided fake.
 *
 * A minimal Chart stub is installed so renderChart() reaches the "no data →
 * show placeholder" branch rather than the CDN-failure branch (which hides the
 * placeholder). This lets the chart-placeholder visibility test be meaningful.
 *
 * @param {{ getItem?: () => any, setItem?: () => void }} fakeStorage
 * @returns {Window}
 */
function createApp(fakeStorage = {}) {
  const dom = new JSDOM(HTML_SKELETON, {
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });

  const { window } = dom;

  // Install the fake localStorage BEFORE app.js executes
  const fakeLs = {
    getItem:    fakeStorage.getItem    ?? (() => null),
    setItem:    fakeStorage.setItem    ?? (() => {}),
    removeItem: () => {},
    clear:      () => {}
  };

  // jsdom's localStorage is configurable; replace it entirely
  Object.defineProperty(window, 'localStorage', {
    value:      fakeLs,
    writable:   true,
    configurable: true
  });

  // Install a minimal Chart stub so renderChart() doesn't take the CDN-failure
  // path (which would hide chart-placeholder). With this stub present,
  // buildChartData([]) returns null and renderChart shows the placeholder.
  window.Chart = function Chart(_canvas, _config) {
    this.destroy = function () {};
  };

  // Evaluate app.js in the window context via a script element
  const script = window.document.createElement('script');
  script.textContent = APP_JS_SRC;
  window.document.head.appendChild(script);

  // Explicitly call initApp() — DOMContentLoaded has already fired in jsdom
  window.initApp();

  return dom.window;
}

// ===========================================================================
// 12.2 Test suite
// ===========================================================================

describe('12.2 — loadTransactions() returns [] on corrupt / unavailable localStorage', () => {

  // -------------------------------------------------------------------------
  // Test 1: localStorage.getItem throws
  // -------------------------------------------------------------------------
  it('returns [] when localStorage.getItem throws', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('localStorage unavailable'); }
    };
    expect(loadTransactionsWithStorage(throwingStorage)).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Test 2: localStorage.getItem returns non-JSON
  // -------------------------------------------------------------------------
  it('returns [] when localStorage.getItem returns a non-JSON string', () => {
    const badJsonStorage = { getItem: () => 'not-json' };
    expect(loadTransactionsWithStorage(badJsonStorage)).toEqual([]);
  });

});

describe('12.2 — app renders empty state when localStorage throws on read', () => {
  let win;

  beforeEach(() => {
    win = createApp({
      getItem: () => { throw new Error('localStorage unavailable'); }
    });
  });

  it('balance display shows $0.00', () => {
    const el = win.document.getElementById('balance-display');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('$0.00');
  });

  it('#empty-list-message is visible', () => {
    const el = win.document.getElementById('empty-list-message');
    expect(el).not.toBeNull();
    expect(el.hidden).toBe(false);
  });

  it('#chart-placeholder is visible', () => {
    const el = win.document.getElementById('chart-placeholder');
    expect(el).not.toBeNull();
    expect(el.hidden).toBe(false);
  });
});

describe('12.2 — app renders empty state when localStorage returns invalid JSON', () => {
  let win;

  beforeEach(() => {
    win = createApp({ getItem: () => 'not-json' });
  });

  it('balance display shows $0.00', () => {
    const el = win.document.getElementById('balance-display');
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('$0.00');
  });

  it('#empty-list-message is visible', () => {
    const el = win.document.getElementById('empty-list-message');
    expect(el).not.toBeNull();
    expect(el.hidden).toBe(false);
  });

  it('#chart-placeholder is visible', () => {
    const el = win.document.getElementById('chart-placeholder');
    expect(el).not.toBeNull();
    expect(el.hidden).toBe(false);
  });
});


// ===========================================================================
// Feature: expense-budget-visualizer, Task: 12.3 delete-failure retention
// Requirement 2.6
// ===========================================================================
//
// When saveTransactions() returns false during a delete:
//   - state.transactions still contains the original transaction
//   - The list DOM is unchanged (transaction row still present)
//   - #delete-error-banner is visible (hidden === false)
//
// Strategy: reuse the createApp() helper above which evaluates app.js inside
// a fresh jsdom window with a controllable fake localStorage.  We seed one
// transaction (via getItem), then make setItem throw so saveTransactions()
// returns false.
//
// NOTE: app.js declares `state` as a top-level `const`, which is NOT a
// property of `window` in classic scripts.  We inject a second tiny script
// after app.js loads to promote `state` onto `window.__state` so tests can
// inspect it directly.

describe('12.3 - delete-failure retention (Requirement 2.6)', () => {

  /**
   * Extended createApp that also exposes `state` on `window.__state` via a
   * second inline script, working around the fact that top-level `const`
   * declarations in classic scripts are not properties of `window`.
   */
  function createAppWithStateExposed(fakeStorage) {
    const win = createApp(fakeStorage);

    // Inject a tiny script that promotes `state` onto `window` so tests can
    // inspect it directly.  This runs after app.js has already executed, so
    // `state` is in scope inside the jsdom window's script sandbox.
    const exposeScript = win.document.createElement('script');
    exposeScript.textContent = 'window.__state = state;';
    win.document.head.appendChild(exposeScript);

    return win;
  }

  /**
   * Builds a jsdom window where localStorage.getItem returns one valid
   * transaction and localStorage.setItem always throws.
   * Returns the window and the seeded transaction object.
   */
  function createAppWithFailingSetItem() {
    const tx = {
      id:        'tx-delete-fail-1',
      itemName:  'Coffee',
      amount:    3.50,
      category:  'Food',
      timestamp: 1700000000000,
    };

    const getItem = function(key) {
      if (key === 'expense_transactions') return JSON.stringify([tx]);
      return null;
    };
    const setItem = function() {
      throw new Error('QuotaExceededError: storage full');
    };

    const win = createAppWithStateExposed({ getItem: getItem, setItem: setItem });

    // Bind event listeners so the delegated delete handler is active
    win.bindEvents();

    return { win: win, tx: tx };
  }

  it('state.transactions still contains the transaction after a failed delete', () => {
    const result = createAppWithFailingSetItem();
    const win = result.win;
    const tx = result.tx;

    // Confirm state loaded correctly
    expect(win.__state.transactions).toHaveLength(1);
    expect(win.__state.transactions[0].id).toBe(tx.id);

    // Simulate clicking the delete button
    const deleteBtn = win.document.querySelector('[data-id="' + tx.id + '"].delete-btn');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    // State must be unchanged because saveTransactions() returned false
    expect(win.__state.transactions).toHaveLength(1);
    expect(win.__state.transactions[0].id).toBe(tx.id);
  });

  it('#delete-error-banner is visible after a failed delete', () => {
    const result = createAppWithFailingSetItem();
    const win = result.win;
    const tx = result.tx;

    const deleteBtn = win.document.querySelector('[data-id="' + tx.id + '"].delete-btn');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    const banner = win.document.getElementById('delete-error-banner');
    expect(banner).not.toBeNull();
    expect(banner.hidden).toBe(false);
  });

  it('the transaction row is still in the DOM after a failed delete', () => {
    const result = createAppWithFailingSetItem();
    const win = result.win;
    const tx = result.tx;

    const deleteBtn = win.document.querySelector('[data-id="' + tx.id + '"].delete-btn');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    // The <li> for this transaction must still exist
    const row = win.document.querySelector('li[data-id="' + tx.id + '"]');
    expect(row).not.toBeNull();
  });

  it('does NOT show the delete-error-banner when localStorage.setItem succeeds', () => {
    const tx = {
      id:        'tx-delete-ok-1',
      itemName:  'Bus ticket',
      amount:    2.00,
      category:  'Transport',
      timestamp: 1700000001000,
    };

    const win = createAppWithStateExposed({
      getItem: function(key) {
        return key === 'expense_transactions' ? JSON.stringify([tx]) : null;
      },
      setItem: function() {},  // success — no-op
    });
    win.bindEvents();

    expect(win.__state.transactions).toHaveLength(1);

    const deleteBtn = win.document.querySelector('[data-id="' + tx.id + '"].delete-btn');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    // Transaction should be removed from state
    expect(win.__state.transactions).toHaveLength(0);

    // Error banner must remain hidden
    const banner = win.document.getElementById('delete-error-banner');
    expect(banner.hidden).toBe(true);
  });
});
