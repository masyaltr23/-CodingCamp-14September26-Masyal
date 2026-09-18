# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application that lets users record personal expense transactions, review them in a scrollable list, monitor a running total balance, and understand spending patterns through a dynamic pie chart. The application is intentionally technology-constrained: it runs on plain HTML, CSS, and Vanilla JavaScript with Chart.js (CDN) as the only external library. All data is persisted in the browser's `localStorage` — no server, no build step.

### Goals

- Provide a minimal but complete expense tracking experience in a single deployable file set.
- Deliver an immediately interactive UI (< 3 s on broadband) with no back-end dependency.
- Maintain correctness under edge cases: invalid input, corrupted storage, CDN failure, zero-balance state.
- Meet WCAG 2.1 AA color-contrast and focus-indicator requirements across the full responsive range (320 px – 1920 px).

---

## Architecture

The application follows a **unidirectional data flow** pattern adapted for plain JavaScript:

```
User Interaction → Validator → State Mutation → Storage_Manager → UI Renderer
                                                                 └→ Chart_Renderer
```

All live application state is held in a single in-memory array (`state.transactions`). Every mutation of that array is immediately flushed to `localStorage` by `Storage_Manager`, then propagates to all UI components through explicit render calls. There is no event bus or reactive framework — each mutation site calls the relevant render functions directly.

### File Structure

```
/
├── index.html          ← single HTML entry point
├── css/
│   └── styles.css      ← all styles; no inline styles in HTML or JS
└── js/
    └── app.js          ← all application logic
```

Chart.js is loaded from CDN inside `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

A guard in `app.js` detects CDN failure and surfaces the error message required by Requirement 6.5.

---

## Components and Interfaces

### 1. State Module

A plain object holding all runtime state. It is the single source of truth in memory.

```js
const state = {
  transactions: [],   // Transaction[]
  chartInstance: null // Chart | null — held to call .destroy() before re-render
};
```

### 2. Validator

Pure functions that accept raw form-field values and return a result object.

```js
/**
 * @param {{ itemName: string, amount: string, category: string }} fields
 * @returns {{ valid: boolean, errors: { itemName?: string, amount?: string, category?: string } }}
 */
function validateForm(fields) { … }
```

Rules enforced:
| Field | Rule | Error message |
|---|---|---|
| `itemName` | Non-empty after trim | "Item name is required." |
| `itemName` | `trimmed.length <= 100` | "Item name must be 100 characters or fewer." |
| `amount` | Non-empty | "Amount is required." |
| `amount` | Parsed float > 0 | "Amount must be a positive number." |
| `amount` | Parsed float ≤ 999,999,999.99 | "Amount must not exceed 999,999,999.99." |
| `category` | One of `["Food","Transport","Fun"]` | "Please select a category." |

`validateForm` is a pure function with no DOM side-effects; error display is handled by the Form Renderer.

### 3. Storage Manager

Encapsulates all `localStorage` access. Errors are caught and handled locally so callers receive clean return values.

```js
const STORAGE_KEY = 'expense_transactions';

/**
 * Reads and returns all valid transactions from localStorage.
 * Returns [] on any parse error or if localStorage is unavailable.
 * @returns {Transaction[]}
 */
function loadTransactions() { … }

/**
 * Serialises the current transactions array to localStorage.
 * @param {Transaction[]} transactions
 * @returns {boolean} true on success, false on failure
 */
function saveTransactions(transactions) { … }
```

On failure, `saveTransactions` returns `false` and the caller (delete handler) retains the item in the UI and displays an error, satisfying Requirement 2.6.

### 4. Form Renderer

Controls inline error display and form reset. Called after validation or successful submission.

```js
function showFormErrors(errors) { … }  // injects error text into named error spans
function clearFormErrors() { … }       // removes all inline error text
function resetForm() { … }             // clears inputs + error spans
```

### 5. Transaction List Renderer

Rebuilds the transaction list DOM from the current `state.transactions` array. Uses `innerHTML` assignment for simplicity; each row carries a `data-id` attribute tied to the transaction's unique ID.

```js
/**
 * @param {Transaction[]} transactions
 */
function renderTransactionList(transactions) { … }
```

Transactions are rendered newest-first (reverse-insertion order). If the array is empty, an empty-state message is rendered instead.

### 6. Balance Renderer

Computes `Total_Balance` from `state.transactions` and updates the DOM element.

```js
function renderBalance(transactions) { … }
```

Balance is formatted as `$X.XX` using `toFixed(2)`.

### 7. Chart Renderer

Wraps Chart.js. Destroys any existing chart instance before re-creating to avoid canvas memory leaks.

```js
/**
 * @param {Transaction[]} transactions
 */
function renderChart(transactions) { … }
```

If `transactions` is empty or all category totals are zero, the canvas is hidden and a placeholder message is shown instead (Requirement 4.6 / 4.7).

If `window.Chart` is undefined (CDN failed), this function displays the CDN-failure error message (Requirement 6.5) and returns immediately.

### 8. Event Controller

Wires all DOM event listeners on `DOMContentLoaded`. Delegates to the components above.

```js
document.addEventListener('DOMContentLoaded', () => {
  initApp();   // load from storage, render initial state
  bindEvents(); // attach submit, delete (delegated), CDN guard
});
```

Delete events use **event delegation** on the list container to avoid re-attaching listeners after every re-render.

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id          - Unique identifier (crypto.randomUUID() or Date.now().toString())
 * @property {string} itemName    - 1–100 character label
 * @property {number} amount      - Float > 0 and <= 999,999,999.99
 * @property {'Food'|'Transport'|'Fun'} category
 * @property {number} timestamp   - Unix ms (Date.now()) used for ordering
 */
```

### LocalStorage Serialization

Stored as a JSON array under the key `"expense_transactions"`:

```json
[
  {
    "id": "1720000000000",
    "itemName": "Lunch",
    "amount": 12.50,
    "category": "Food",
    "timestamp": 1720000000000
  }
]
```

Validation on load (Requirement 5.5) checks that each entry has:
- `id` — truthy string
- `itemName` — non-empty string ≤ 100 chars
- `amount` — finite number > 0 and ≤ 999,999,999.99
- `category` — one of `["Food","Transport","Fun"]`
- `timestamp` — finite positive number

Invalid entries are silently discarded; the app continues with the valid subset.

### Category Color Map

```js
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56'
};
```

Colors are fixed constants, ensuring consistency across every render (Requirement 4.2).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid inputs are always accepted by the Validator

*For any* combination of a non-empty Item_Name (1–100 characters, no restrictions on content), a numeric Amount in the range (0, 999,999,999.99], and a Category from {"Food", "Transport", "Fun"}, `validateForm` SHALL return `{ valid: true, errors: {} }`.

**Validates: Requirements 1.2**

---

### Property 2: Item_Name exceeding 100 characters is always rejected

*For any* string of length greater than 100 characters supplied as the Item_Name (regardless of Amount or Category), `validateForm` SHALL return `{ valid: false }` with a non-empty `errors.itemName`.

**Validates: Requirements 1.4**

---

### Property 3: Non-positive and out-of-range Amounts are always rejected

*For any* numeric value that is ≤ 0 OR > 999,999,999.99 supplied as the Amount, `validateForm` SHALL return `{ valid: false }` with a non-empty `errors.amount`.

**Validates: Requirements 1.6, 1.7**

---

### Property 4: Transaction list is always displayed newest-first

*For any* sequence of transactions added one after another, `renderTransactionList` SHALL display them in reverse insertion order, such that the most recently added transaction appears first.

**Validates: Requirements 2.1**

---

### Property 5: Every rendered transaction row contains all required fields correctly formatted

*For any* valid Transaction, its rendered HTML row SHALL contain the Item_Name text, the Amount formatted as `$X.XX` with exactly two decimal places, and the Category label.

**Validates: Requirements 2.2**

---

### Property 6: Every rendered transaction row contains a delete control

*For any* non-empty transaction list, every rendered row SHALL contain a delete button with a `data-id` attribute matching that transaction's `id`.

**Validates: Requirements 2.4**

---

### Property 7: Deleting a transaction removes it from the list

*For any* transaction list of length N ≥ 1 and any transaction T in that list, after the delete action for T is triggered, T SHALL no longer appear in the rendered list and the list length SHALL be N − 1.

**Validates: Requirements 2.5**

---

### Property 8: Balance display always equals the sum of all transaction amounts, correctly formatted

*For any* list of transactions, `renderBalance` SHALL display a value equal to the arithmetic sum of all `amount` fields, formatted as `$X.XX` with exactly two decimal places and a `$` prefix.

**Validates: Requirements 3.2, 3.3, 3.4**

---

### Property 9: Pie chart slice proportions are mathematically correct

*For any* non-empty transaction list where Total_Expenses > 0, the data values supplied to Chart.js for each Category SHALL equal that Category's summed amounts rounded to two decimal places, and their ratios SHALL be proportional to each Category's share of Total_Expenses.

**Validates: Requirements 4.1**

---

### Property 10: Category colors are consistent across every render

*For any* two independent calls to `renderChart` with any transaction data, the color assigned to Food SHALL always be `#FF6384`, Transport SHALL always be `#36A2EB`, and Fun SHALL always be `#FFCE56`.

**Validates: Requirements 4.2**

---

### Property 11: Legend percentages match category share of Total_Expenses

*For any* non-empty transaction list, the percentage value shown in the legend for each Category SHALL equal `(category_total / total_expenses) * 100` rounded to one decimal place.

**Validates: Requirements 4.3**

---

### Property 12: Categories with zero transactions are omitted from the chart

*For any* transaction list in which one or more Categories have no transactions, the chart data array SHALL contain no entry for those Categories (zero-width slices are never rendered).

**Validates: Requirements 4.8**

---

### Property 13: Transaction serialization round-trip preserves data

*For any* valid Transaction object T, serializing T to JSON and immediately deserializing it SHALL produce an object that is structurally and value-equal to T (same `id`, `itemName`, `amount`, `category`, `timestamp`).

**Validates: Requirements 5.1**

---

### Property 14: Storage round-trip — saved transactions are fully restored on load

*For any* list of valid transactions written to `localStorage` via `saveTransactions`, a subsequent call to `loadTransactions` SHALL return an array of the same length containing value-equal entries in the same order.

**Validates: Requirements 5.3**

---

### Property 15: Invalid entries in stored data are discarded; valid entries are preserved

*For any* stored JSON array containing a mix of valid and invalid Transaction entries, `loadTransactions` SHALL return exactly the valid entries (in original order) and discard all invalid entries without throwing an error.

**Validates: Requirements 5.5**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Empty / whitespace Item_Name | Validator: `trimmed.length === 0` | Inline error; form not submitted |
| Item_Name > 100 chars | Validator: `trimmed.length > 100` | Inline error; form not submitted |
| Amount empty / non-numeric | Validator: `isNaN(parsed)` | Inline error; form not submitted |
| Amount ≤ 0 | Validator: `parsed <= 0` | Inline error; form not submitted |
| Amount > 999,999,999.99 | Validator: `parsed > 999999999.99` | Inline error; form not submitted |
| No category selected | Validator: value not in allowed set | Inline error; form not submitted |
| `localStorage` unavailable (write) | `try/catch` in `saveTransactions` → `false` | Transaction stays in list; error banner shown |
| `localStorage` unavailable (read) | `try/catch` in `loadTransactions` | App starts with empty state; no message shown |
| Corrupt `localStorage` data | `JSON.parse` throws in `loadTransactions` | Returns `[]`; app starts empty |
| Partial invalid entries in storage | Per-entry validation in `loadTransactions` | Only valid entries loaded; invalid silently discarded |
| Chart.js CDN failure | `if (!window.Chart)` guard in `renderChart` | Error message displayed; all non-chart features remain functional |

---

## Testing Strategy

### Unit Tests (Vitest or plain Jest — no DOM required for pure logic)

Focus on the pure logic modules: `validateForm`, `saveTransactions` / `loadTransactions`, balance computation, and chart data preparation.

- **`validateForm`** — one test per validation rule; cover boundary values (0, 100, 999,999,999.99 and their neighbors).
- **`computeBalance(transactions)`** — empty array returns 0; single item returns amount; multiple items return correct sum.
- **`buildChartData(transactions)`** — categories present/absent; proportions correct; zero-total returns null/empty.
- **`loadTransactions` with mocked `localStorage`** — valid array, corrupt JSON, partial-invalid entries, unavailable storage.
- **`saveTransactions` with mocked `localStorage`** — success path, `setItem` throws.

### Integration / DOM Tests (Vitest + jsdom, or Playwright component tests)

Test component interactions through the DOM:

- Form submit with valid data → transaction appears in list, balance updates, form cleared.
- Form submit with invalid data → correct inline error messages appear, list unchanged.
- Delete button click → transaction removed, balance and chart reflect updated state.
- Empty state → correct empty-state messages shown for list and chart.
- CDN-failure guard → error banner rendered when `window.Chart` is undefined.

### Property-Based Tests (fast-check, minimum 100 iterations per property)

Each property test is annotated with a comment referencing its design property.

- **Property 1** — `fc.record({ itemName: fc.string({minLength:1,maxLength:100}).filter(s=>s.trim().length>0), amount: fc.float({min:0.01, max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun') })` → `validateForm` returns `{valid:true}`.

- **Properties 2 & 3** — `fc.string({minLength:101})` for names; `fc.oneof(fc.constant(0), fc.float({max:-0.01}), fc.float({min:999999999.991}))` for amounts → `validateForm` returns `{valid:false}`.

- **Property 4** — `fc.array(arbitraryTransaction(), {minLength:2})` → rendered list IDs match reversed insertion order.

- **Property 5** — `arbitraryTransaction()` → rendered row contains itemName, `$`+`amount.toFixed(2)`, category.

- **Property 6** — `fc.array(arbitraryTransaction(), {minLength:1})` → every row contains a `[data-id]` delete button.

- **Property 7** — `fc.array(arbitraryTransaction(), {minLength:1}).chain(…)` pick random index → after delete, length decreases by 1 and deleted item absent.

- **Property 8** — `fc.array(arbitraryTransaction())` → displayed balance equals `$` + `sum.toFixed(2)`.

- **Properties 9 & 11** — `fc.array(arbitraryTransaction(), {minLength:1})` → chart data values proportional to category sums; legend percentages sum to ≈ 100 % (float tolerance).

- **Property 10** — any two render calls → color map entries identical.

- **Property 12** — transactions containing only a subset of categories → absent categories have no chart slice.

- **Properties 13–15** — serialization / storage round-trip using `arbitraryTransaction()` and `arbitraryMixedArray()`.

**Tag format** (comment above each property test):
```js
// Feature: expense-budget-visualizer, Property N: <property title>
```

### Accessibility & Visual Checks (manual / automated audit)

- Run Lighthouse or axe on the built page to verify 4.5:1 normal-text contrast and 3:1 large-text contrast (Requirement 7.4).
- Verify visible focus indicators at 2 px minimum outline (Requirement 7.5).
- Resize viewport from 320 px to 1920 px; confirm no horizontal scroll and no element overlap (Requirement 7.3).

### Performance Check

- Load the page on a throttled connection profile (25 Mbps); verify Time-to-Interactive < 3 s (Requirement 6.4).
