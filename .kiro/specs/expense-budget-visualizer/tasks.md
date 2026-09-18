# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript with Chart.js (CDN). The app records transactions, displays a running balance, and visualizes spending by category in a pie chart. All data is persisted in `localStorage`. No build step, no framework.

## Tasks

- [x] 1. Project scaffolding — create file structure
  - Create `index.html` at project root
  - Create `css/styles.css`
  - Create `js/app.js`
  - Add Chart.js CDN `<script>` tag to `index.html`: `https://cdn.jsdelivr.net/npm/chart.js`
  - Link `css/styles.css` in `<head>` and `js/app.js` as a deferred script at end of `<body>`
  - _Requirements: 6.1, 6.2_

- [x] 2. HTML structure
  - [x] 2.1 Build the Balance Display section
    - Add a `<header>` or `<section>` at the top of `<body>` containing a labelled element for the total balance (e.g., `<span id="balance-display">$0.00</span>`)
    - Add a visually prominent heading or label above the balance value
    - _Requirements: 3.1, 3.2, 7.1_

  - [x] 2.2 Build the Transaction Input Form
    - Add a `<form id="transaction-form">` with:
      - `<input type="text" id="item-name">` + associated `<label>` + `<span class="error" id="item-name-error">` for inline errors
      - `<input type="number" id="amount">` + associated `<label>` + `<span class="error" id="amount-error">`
      - `<select id="category">` with `<option>` values `Food`, `Transport`, `Fun` + `<label>` + `<span class="error" id="category-error">`
      - `<button type="submit">` Submit button
    - _Requirements: 1.1, 7.1_

  - [x] 2.3 Build the Transaction List section
    - Add a `<section>` containing `<ul id="transaction-list">` for rendered rows
    - Add a `<p id="empty-list-message">` element (initially visible) with "No transactions have been added yet."
    - Add a `<p id="delete-error-banner" hidden>` for delete-failure error messages
    - _Requirements: 2.3, 2.6, 2.7, 7.1_

  - [x] 2.4 Build the Pie Chart section
    - Add a `<section>` containing `<canvas id="expense-chart">`
    - Add a `<p id="chart-placeholder">` sibling element (initially visible) with "No spending data available."
    - Add a `<p id="chart-error-banner" hidden>` for CDN failure message
    - _Requirements: 4.6, 4.7, 6.5, 7.1_

- [x] 3. CSS styling
  - [x] 3.1 Set up base styles and visual hierarchy
    - Apply CSS reset/box-sizing; set `font-family`, `font-size` (body ≥ 14px, headings ≥ 18px)
    - Stack sections vertically with a minimum `gap` / `margin-bottom` of 16px between each section
    - Keep `#balance-display` visually prominent (larger font, high contrast)
    - _Requirements: 7.1, 7.2_

  - [x] 3.2 Implement responsive layout (320px – 1920px)
    - Use `max-width` container centered with `margin: 0 auto`; set `width: 100%` with padding so content stays readable at 320px
    - Ensure transaction list has `overflow-y: auto` and a `max-height` so it scrolls without overflowing the page
    - Use `@media` queries or fluid units so no horizontal scroll appears from 320px to 1920px
    - Add single-column reflow rule for narrow viewports (Requirement 7.6)
    - _Requirements: 2.3, 7.3, 7.6_

  - [x] 3.3 Apply color scheme, contrast, and focus indicators
    - Choose and document background/text/accent colors; verify ≥ 4.5:1 contrast for normal text and ≥ 3:1 for large text
    - Style inline error `<span>` elements in a visually distinct color (e.g., red) that also meets 4.5:1 contrast
    - Add visible focus styles: `outline: 2px solid <focus-color>` on `:focus-visible` for all interactive elements; confirm ≥ 3:1 contrast between focus color and adjacent background
    - Style the delete button, submit button, form inputs, and select consistently
    - _Requirements: 7.2, 7.4, 7.5_

- [x] 4. State module and Storage Manager
  - [x] 4.1 Implement the State module
    - In `app.js`, declare `const state = { transactions: [], chartInstance: null }`
    - Declare `const STORAGE_KEY = 'expense_transactions'`
    - Declare the `CATEGORY_COLORS` constant map: `{ Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }`
    - _Requirements: 5.1, 4.2_

  - [x] 4.2 Implement `loadTransactions()`
    - Read `localStorage.getItem(STORAGE_KEY)` inside a `try/catch`
    - On any error (parse failure, unavailable storage) return `[]`
    - Parse the JSON array and filter entries through per-entry validation: each entry must have a truthy string `id`, non-empty string `itemName` ≤ 100 chars, finite `amount` > 0 and ≤ 999,999,999.99, `category` in `["Food","Transport","Fun"]`, and finite positive `timestamp`
    - Return only the valid entries
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 4.3 Implement `saveTransactions(transactions)`
    - Serialize the array with `JSON.stringify` inside a `try/catch`
    - Call `localStorage.setItem(STORAGE_KEY, …)`
    - Return `true` on success, `false` on any caught error
    - _Requirements: 5.1, 5.2_

  - [ ]* 4.4 Write property tests for Storage Manager (Properties 13–15)
    - **Property 13: Transaction serialization round-trip preserves data**
    - **Property 14: Storage round-trip — saved transactions are fully restored on load**
    - **Property 15: Invalid entries in stored data are discarded; valid entries are preserved**
    - **Validates: Requirements 5.1, 5.3, 5.5**
    - Use `fast-check` with `arbitraryTransaction()` and `arbitraryMixedArray()` generators; mock `localStorage` with an in-memory object
    - Tag each test: `// Feature: expense-budget-visualizer, Property N: <title>`

- [x] 5. Validator
  - [x] 5.1 Implement `validateForm(fields)`
    - Accept `{ itemName, amount, category }` as raw string inputs
    - Apply all six rules in order (trim `itemName`, check emptiness, check length ≤ 100; parse `amount`, check non-empty, check > 0, check ≤ 999,999,999.99; check `category` in allowed set)
    - Return `{ valid: boolean, errors: { itemName?, amount?, category? } }` — pure function, no DOM access
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 5.2 Write property tests for Validator (Properties 1–3)
    - **Property 1: Valid inputs are always accepted by the Validator**
    - **Property 2: Item_Name exceeding 100 characters is always rejected**
    - **Property 3: Non-positive and out-of-range Amounts are always rejected**
    - **Validates: Requirements 1.2, 1.4, 1.6, 1.7**
    - Use `fast-check` generators as specified in the design Testing Strategy section
    - Tag each test: `// Feature: expense-budget-visualizer, Property N: <title>`

- [x] 6. Form handling — submit event
  - [x] 6.1 Implement `showFormErrors(errors)`, `clearFormErrors()`, and `resetForm()`
    - `showFormErrors`: write error text into the named `<span class="error">` elements by field key
    - `clearFormErrors`: clear all three error spans
    - `resetForm`: call `form.reset()` then `clearFormErrors()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 6.2 Implement the form submit handler
    - Prevent default form submission
    - Read `itemName`, `amount`, `category` from DOM inputs
    - Call `validateForm`; if invalid call `showFormErrors(errors)` and return
    - If valid: create a `Transaction` object with `id` (`crypto.randomUUID()` or `Date.now().toString()`), `itemName` (trimmed), `amount` (parsed float), `category`, `timestamp` (`Date.now()`)
    - Push to `state.transactions`; call `saveTransactions`; call `resetForm`
    - Call `renderTransactionList`, `renderBalance`, `renderChart`
    - _Requirements: 1.2, 1.9, 5.1_

- [x] 7. Transaction List Renderer
  - [x] 7.1 Implement `renderTransactionList(transactions)`
    - If `transactions` is empty: hide `<ul>`, show `#empty-list-message`; return
    - Otherwise: hide `#empty-list-message`, show `<ul>`
    - Build list HTML by iterating `[...transactions].reverse()` (newest-first); each `<li>` contains `data-id`, item name text, `$amount.toFixed(2)`, category label, and a `<button class="delete-btn" data-id="…">` delete button
    - Assign to `ul.innerHTML`
    - _Requirements: 2.1, 2.2, 2.4, 2.7_

  - [ ]* 7.2 Write property tests for Transaction List Renderer (Properties 4–7)
    - **Property 4: Transaction list is always displayed newest-first**
    - **Property 5: Every rendered transaction row contains all required fields correctly formatted**
    - **Property 6: Every rendered transaction row contains a delete control**
    - **Property 7: Deleting a transaction removes it from the list**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**
    - Use `fast-check` with `arbitraryTransaction()`; run assertions against rendered `innerHTML` via `jsdom`
    - Tag each test: `// Feature: expense-budget-visualizer, Property N: <title>`

- [x] 8. Balance Renderer
  - [x] 8.1 Implement `renderBalance(transactions)`
    - Compute `total` as the sum of all `transaction.amount` values (use `Array.reduce`; default to `0` for empty array)
    - Format as `'$' + total.toFixed(2)`
    - Update `#balance-display` text content
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 8.2 Write property test for Balance Renderer (Property 8)
    - **Property 8: Balance display always equals the sum of all transaction amounts, correctly formatted**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Use `fast-check` with `fc.array(arbitraryTransaction())`; compare rendered text against `'$' + sum.toFixed(2)`
    - Tag test: `// Feature: expense-budget-visualizer, Property 8: Balance display always equals the sum...`

- [x] 9. Chart Renderer
  - [x] 9.1 Implement `buildChartData(transactions)`
    - Pure helper: aggregate `amount` totals per category from `transactions`
    - Omit categories with zero total (do not include them in output arrays)
    - Return `{ labels, data, colors }` arrays aligned by index — or `null` if all totals are zero / array is empty
    - _Requirements: 4.1, 4.8_

  - [x] 9.2 Implement `renderChart(transactions)`
    - Guard: if `!window.Chart`, show `#chart-error-banner` with the CDN failure message and return
    - Call `buildChartData`; if result is `null`, hide `<canvas>`, show `#chart-placeholder`; destroy any existing `state.chartInstance`; return
    - Otherwise: show `<canvas>`, hide `#chart-placeholder`
    - If `state.chartInstance` exists, call `.destroy()` before creating a new one
    - Create a new `Chart` on `#expense-chart` of type `'pie'` with `data.datasets[0]` using the aggregated values and `CATEGORY_COLORS`; enable legend displaying label + percentage (one decimal place)
    - Store the new instance in `state.chartInstance`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.5_

  - [ ]* 9.3 Write property tests for Chart Renderer (Properties 9–12)
    - **Property 9: Pie chart slice proportions are mathematically correct**
    - **Property 10: Category colors are consistent across every render**
    - **Property 11: Legend percentages match category share of Total_Expenses**
    - **Property 12: Categories with zero transactions are omitted from the chart**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.8**
    - Test `buildChartData` (pure function, no DOM needed) with `fast-check`; mock `window.Chart` where needed
    - Tag each test: `// Feature: expense-budget-visualizer, Property N: <title>`

- [x] 10. Checkpoint — core renderers complete
  - Ensure all non-optional tests pass. Manually verify: add a transaction → list updates, balance updates, chart updates; delete a transaction → all three update. Ask the user if any questions arise.

- [x] 11. Event Controller — wiring and deletion
  - [x] 11.1 Implement `initApp()`
    - Call `loadTransactions()`, assign result to `state.transactions`
    - Call `renderTransactionList`, `renderBalance`, `renderChart` with `state.transactions`
    - _Requirements: 5.3, 5.4_

  - [x] 11.2 Implement `bindEvents()`
    - Attach `submit` listener to `#transaction-form` → calls the form submit handler from Task 6.2
    - Attach a delegated `click` listener on `#transaction-list` container; check `event.target.matches('.delete-btn')`:
      - Read `id` from `event.target.dataset.id`
      - Filter `state.transactions` to remove the matching entry into a `newTransactions` array
      - Call `saveTransactions(newTransactions)`; if it returns `false`, show `#delete-error-banner` and return (do NOT update state or re-render)
      - Otherwise assign `state.transactions = newTransactions`; hide `#delete-error-banner`; call `renderTransactionList`, `renderBalance`, `renderChart`
    - _Requirements: 2.5, 2.6, 5.2_

  - [x] 11.3 Wire `DOMContentLoaded`
    - Add `document.addEventListener('DOMContentLoaded', () => { initApp(); bindEvents(); })`
    - _Requirements: 5.3_

- [x] 12. Edge cases and error states
  - [x] 12.1 Validate CDN failure path end-to-end
    - In `renderChart`, confirm the `if (!window.Chart)` guard writes the correct user-facing message into `#chart-error-banner` and that the form, list, and balance all remain functional
    - Write a unit test that sets `window.Chart = undefined`, calls `renderChart`, and asserts the banner is visible and canvas is hidden
    - _Requirements: 6.5_

  - [x] 12.2 Validate corrupt / unavailable `localStorage` fallback
    - Confirm `loadTransactions` returns `[]` and the app initializes to empty state (balance `$0.00`, empty-list message, chart placeholder) when `localStorage.getItem` throws or returns invalid JSON
    - Write a unit test mocking `localStorage.getItem` to throw and another returning `"not-json"`, asserting app renders empty state
    - _Requirements: 5.4, 3.7_

  - [x] 12.3 Validate delete-failure retention
    - Confirm that when `saveTransactions` returns `false` during a delete, the transaction remains in `state.transactions`, the list DOM is unchanged, and `#delete-error-banner` is visible
    - Write a unit test mocking `localStorage.setItem` to throw during a delete, asserting the above
    - _Requirements: 2.6_

- [x] 13. Final checkpoint — full integration
  - Ensure all non-optional tests pass. Verify responsive layout at 320px, 768px, and 1920px. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (minimum 100 iterations per property) as documented in the design Testing Strategy
- Unit and DOM tests use Vitest + jsdom (or plain Jest); no build step is required for the app itself — the test runner is a dev-only dependency
- The `app.js` file contains all modules (State, Validator, Storage Manager, all renderers, Event Controller) as plain functions/constants — no ES module syntax required unless the developer prefers it
- Checkpoints ensure incremental validation before wiring more components

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["4.4", "5.2", "6.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["6.2", "7.1", "8.2", "9.2"] },
    { "id": 6, "tasks": ["7.2", "9.3", "11.1"] },
    { "id": 7, "tasks": ["11.2"] },
    { "id": 8, "tasks": ["11.3"] },
    { "id": 9, "tasks": ["12.1", "12.2", "12.3"] }
  ]
}
```
