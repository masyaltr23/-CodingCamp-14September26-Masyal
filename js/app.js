/* Expense & Budget Visualizer — application logic */

/* ==========================================================================
   STATE & CONSTANTS
   ========================================================================== */

const STORAGE_KEY          = 'expense_transactions';
const CUSTOM_CATEGORIES_KEY = 'expense_custom_categories';
const THEME_KEY            = 'expense_theme';

/** Built-in category colors */
const BUILTIN_CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56'
};

/** Runtime state */
const state = {
  transactions:     [],
  customCategories: [],  // [{ name: string, color: string }]
  sortOrder:        'newest',
  chartInstance:    null,
  theme:            'light'
};

/* ==========================================================================
   HELPERS — get full category color map (built-in + custom)
   ========================================================================== */
function getCategoryColors() {
  const map = Object.assign({}, BUILTIN_CATEGORY_COLORS);
  state.customCategories.forEach(function (c) { map[c.name] = c.color; });
  return map;
}

function getAllowedCategories() {
  const builtin = ['Food', 'Transport', 'Fun'];
  return builtin.concat(state.customCategories.map(function (c) { return c.name; }));
}

/* ==========================================================================
   STORAGE — transactions
   ========================================================================== */
function isValidTransaction(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const hasValidId        = typeof entry.id === 'string' && entry.id.trim().length > 0;
  const hasValidItemName  = typeof entry.itemName === 'string'
                            && entry.itemName.trim().length > 0
                            && entry.itemName.length <= 100;
  const hasValidAmount    = typeof entry.amount === 'number'
                            && isFinite(entry.amount)
                            && entry.amount > 0
                            && entry.amount <= 999999999.99;
  const hasValidCategory  = typeof entry.category === 'string' && entry.category.length > 0;
  const hasValidTimestamp = typeof entry.timestamp === 'number'
                            && isFinite(entry.timestamp)
                            && entry.timestamp > 0;
  return hasValidId && hasValidItemName && hasValidAmount && hasValidCategory && hasValidTimestamp;
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransaction);
  } catch (_err) { return []; }
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (_err) { return false; }
}

/* ==========================================================================
   STORAGE — custom categories
   ========================================================================== */
function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (c) {
      return c && typeof c.name === 'string' && c.name.trim().length > 0
             && typeof c.color === 'string';
    });
  } catch (_err) { return []; }
}

function saveCustomCategories(cats) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
    return true;
  } catch (_err) { return false; }
}

/* ==========================================================================
   THEME
   ========================================================================== */
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; }
  catch (_err) { return 'light'; }
}

function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (_err) {}
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  state.theme = theme;
}

function toggleTheme() {
  const next = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  saveTheme(next);
}

/* ==========================================================================
   VALIDATOR
   ========================================================================== */
const ERROR_SPAN_IDS = {
  itemName: 'item-name-error',
  amount:   'amount-error',
  category: 'category-error'
};

function validateForm(fields) {
  const errors = {};
  const trimmedName = (fields.itemName || '').trim();
  if (trimmedName.length === 0) {
    errors.itemName = 'Item name is required.';
  } else if (trimmedName.length > 100) {
    errors.itemName = 'Item name must be 100 characters or fewer.';
  }

  const trimmedAmount = (fields.amount || '').trim();
  if (trimmedAmount.length === 0) {
    errors.amount = 'Amount is required.';
  } else {
    const parsed = parseFloat(trimmedAmount);
    if (isNaN(parsed) || parsed <= 0) {
      errors.amount = 'Amount must be a positive number.';
    } else if (parsed > 999999999.99) {
      errors.amount = 'Amount must not exceed 999,999,999.99.';
    }
  }

  if (!getAllowedCategories().includes(fields.category)) {
    errors.category = 'Please select a category.';
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

function showFormErrors(errors) {
  Object.keys(ERROR_SPAN_IDS).forEach(function (field) {
    const span = document.getElementById(ERROR_SPAN_IDS[field]);
    if (span) span.textContent = errors[field] || '';
  });
}

function clearFormErrors() {
  Object.values(ERROR_SPAN_IDS).forEach(function (spanId) {
    const span = document.getElementById(spanId);
    if (span) span.textContent = '';
  });
}

function resetForm() {
  const form = document.getElementById('transaction-form');
  if (form) form.reset();
  clearFormErrors();
}

/* ==========================================================================
   SORT HELPER
   ========================================================================== */
function getSortedTransactions() {
  const arr = state.transactions.slice();
  switch (state.sortOrder) {
    case 'oldest':
      return arr.sort(function (a, b) { return a.timestamp - b.timestamp; });
    case 'amount-desc':
      return arr.sort(function (a, b) { return b.amount - a.amount; });
    case 'amount-asc':
      return arr.sort(function (a, b) { return a.amount - b.amount; });
    case 'category-az':
      return arr.sort(function (a, b) { return a.category.localeCompare(b.category); });
    case 'newest':
    default:
      return arr.sort(function (a, b) { return b.timestamp - a.timestamp; });
  }
}

/* ==========================================================================
   RENDERERS
   ========================================================================== */

/** Populate the category <select> with built-in + custom categories */
function renderCategorySelect() {
  const sel = document.getElementById('category');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Select a category --</option>';
  getAllowedCategories().forEach(function (cat) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  if (getAllowedCategories().includes(currentVal)) sel.value = currentVal;
}

/** Render chips for custom categories with delete button */
function renderCustomCategoryChips() {
  const container = document.getElementById('custom-category-list');
  if (!container) return;
  if (state.customCategories.length === 0) {
    container.innerHTML = '<span class="no-custom">No custom categories yet.</span>';
    return;
  }
  container.innerHTML = state.customCategories.map(function (c) {
    const safeName = c.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    return '<span class="category-chip" style="--chip-color:' + c.color + '">'
      + '<span class="chip-dot"></span>'
      + safeName
      + '<button class="chip-delete" data-cat="' + safeName + '" aria-label="Remove ' + safeName + '">x</button>'
      + '</span>';
  }).join('');
}

function renderBalance(transactions) {
  const total = transactions.reduce(function (sum, tx) { return sum + tx.amount; }, 0);
  const el = document.getElementById('balance-display');
  if (el) el.textContent = '$' + total.toFixed(2);
}

function renderTransactionList(transactions) {
  const ul       = document.getElementById('transaction-list');
  const emptyMsg = document.getElementById('empty-list-message');
  if (!ul || !emptyMsg) return;

  const sorted = getSortedTransactions();

  if (!sorted || sorted.length === 0) {
    ul.hidden = true;
    emptyMsg.hidden = false;
    ul.innerHTML = '';
    return;
  }

  emptyMsg.hidden = true;
  ul.hidden = false;

  const colors = getCategoryColors();

  ul.innerHTML = sorted.map(function (tx) {
    const safeName     = tx.itemName
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const safeCategory = tx.category
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeId       = String(tx.id).replace(/"/g, '&quot;');
    const dotColor     = colors[tx.category] || '#94a3b8';

    return '<li data-id="' + safeId + '">'
      + '<span class="tx-cat-dot" style="background:' + dotColor + '"></span>'
      + '<span class="tx-name">' + safeName + '</span>'
      + '<span class="tx-amount">$' + tx.amount.toFixed(2) + '</span>'
      + '<span class="tx-category">' + safeCategory + '</span>'
      + '<button class="delete-btn" data-id="' + safeId + '" aria-label="Delete ' + safeName + '">Delete</button>'
      + '</li>';
  }).join('');
}

function buildChartData(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return null;

  const colors  = getCategoryColors();
  const allCats = getAllowedCategories();
  const totals  = {};
  allCats.forEach(function (c) { totals[c] = 0; });

  transactions.forEach(function (tx) {
    if (totals.hasOwnProperty(tx.category)) totals[tx.category] += tx.amount;
    else totals[tx.category] = tx.amount; // unknown but saved category
  });

  const labels = [], data = [], chartColors = [];
  allCats.forEach(function (cat) {
    if (totals[cat] > 0) {
      labels.push(cat);
      data.push(Math.round(totals[cat] * 100) / 100);
      chartColors.push(colors[cat] || '#94a3b8');
    }
  });

  if (data.length === 0) return null;
  return { labels: labels, data: data, colors: chartColors };
}

function renderChart(transactions) {
  const canvas      = document.getElementById('expense-chart');
  const placeholder = document.getElementById('chart-placeholder');
  const errorBanner = document.getElementById('chart-error-banner');

  if (typeof window.Chart === 'undefined') {
    if (errorBanner) errorBanner.hidden = false;
    if (canvas) canvas.hidden = true;
    if (placeholder) placeholder.hidden = true;
    return;
  }

  const chartData = buildChartData(transactions);

  if (chartData === null) {
    if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }
    if (canvas)      canvas.hidden      = true;
    if (placeholder) placeholder.hidden = false;
    return;
  }

  if (canvas)      canvas.hidden      = false;
  if (placeholder) placeholder.hidden = true;
  if (errorBanner) errorBanner.hidden = true;

  if (state.chartInstance) { state.chartInstance.destroy(); state.chartInstance = null; }

  const total = chartData.data.reduce(function (s, v) { return s + v; }, 0);

  state.chartInstance = new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{ data: chartData.data, backgroundColor: chartData.colors }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: function (chart) {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map(function (label, i) {
                const pct = total > 0 ? ((ds.data[i] / total) * 100).toFixed(1) : '0.0';
                return {
                  text:        label + ' - ' + pct + '%',
                  fillStyle:   ds.backgroundColor[i],
                  strokeStyle: ds.backgroundColor[i],
                  hidden:      false,
                  index:       i
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
              return ctx.label + ': $' + ctx.parsed.toFixed(2) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

/* ==========================================================================
   CUSTOM CATEGORY — add / remove
   ========================================================================== */
function handleAddCategory() {
  const nameInput  = document.getElementById('new-category-name');
  const colorInput = document.getElementById('new-category-color');
  const errEl      = document.getElementById('category-add-error');

  const name  = (nameInput.value || '').trim();
  const color = colorInput.value;

  // Validation
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

  if (name.length === 0) {
    if (errEl) { errEl.textContent = 'Category name is required.'; errEl.style.display = 'block'; }
    nameInput.focus();
    return;
  }
  if (name.length > 30) {
    if (errEl) { errEl.textContent = 'Name must be 30 characters or fewer.'; errEl.style.display = 'block'; }
    return;
  }
  const exists = getAllowedCategories().some(function (c) {
    return c.toLowerCase() === name.toLowerCase();
  });
  if (exists) {
    if (errEl) { errEl.textContent = '"' + name + '" already exists.'; errEl.style.display = 'block'; }
    return;
  }

  state.customCategories.push({ name: name, color: color });
  saveCustomCategories(state.customCategories);
  nameInput.value = '';
  colorInput.value = '#a78bfa';

  renderCategorySelect();
  renderCustomCategoryChips();
}

function handleDeleteCategory(catName) {
  state.customCategories = state.customCategories.filter(function (c) {
    return c.name !== catName;
  });
  saveCustomCategories(state.customCategories);
  renderCategorySelect();
  renderCustomCategoryChips();
}

/* ==========================================================================
   FORM SUBMIT
   ========================================================================== */
function handleFormSubmit(event) {
  event.preventDefault();

  const rawItemName = (document.getElementById('item-name') || {}).value || '';
  const rawAmount   = (document.getElementById('amount')    || {}).value || '';
  const rawCategory = (document.getElementById('category')  || {}).value || '';

  const result = validateForm({ itemName: rawItemName, amount: rawAmount, category: rawCategory });
  if (!result.valid) { showFormErrors(result.errors); return; }

  const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID() : Date.now().toString();

  state.transactions.push({
    id:        id,
    itemName:  rawItemName.trim(),
    amount:    parseFloat(rawAmount),
    category:  rawCategory,
    timestamp: Date.now()
  });

  saveTransactions(state.transactions);
  resetForm();
  renderTransactionList(state.transactions);
  renderBalance(state.transactions);
  renderChart(state.transactions);

  // Scroll ke chart section setelah transaksi ditambahkan
  var chartSection = document.querySelector('.chart-section');
  if (chartSection) {
    chartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ==========================================================================
   INIT & BIND
   ========================================================================== */
function initApp() {
  // Theme
  state.theme = loadTheme();
  applyTheme(state.theme);

  // Custom categories
  state.customCategories = loadCustomCategories();
  renderCategorySelect();
  renderCustomCategoryChips();

  // Transactions
  state.transactions = loadTransactions();
  renderTransactionList(state.transactions);
  renderBalance(state.transactions);
  renderChart(state.transactions);
}

function bindEvents() {
  // Form submit
  const form = document.getElementById('transaction-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Add custom category
  const addCatBtn = document.getElementById('add-category-btn');
  if (addCatBtn) addCatBtn.addEventListener('click', handleAddCategory);

  // Enter key on category name input
  const catNameInput = document.getElementById('new-category-name');
  if (catNameInput) catNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
  });

  // Delete custom category (delegated)
  const chipsContainer = document.getElementById('custom-category-list');
  if (chipsContainer) {
    chipsContainer.addEventListener('click', function (e) {
      if (e.target.matches('.chip-delete')) {
        handleDeleteCategory(e.target.dataset.cat);
      }
    });
  }

  // Sort order change
  const sortSel = document.getElementById('sort-select');
  if (sortSel) {
    sortSel.addEventListener('change', function () {
      state.sortOrder = sortSel.value;
      renderTransactionList(state.transactions);
    });
  }

  // Delete transaction (delegated)
  const listSection = document.querySelector('.transaction-list-section');
  if (listSection) {
    listSection.addEventListener('click', function (event) {
      if (!event.target.matches('.delete-btn')) return;

      const id              = event.target.dataset.id;
      const newTransactions = state.transactions.filter(function (tx) { return tx.id !== id; });
      const saved           = saveTransactions(newTransactions);

      if (!saved) {
        const banner = document.getElementById('delete-error-banner');
        if (banner) banner.hidden = false;
        return;
      }

      state.transactions = newTransactions;
      const banner = document.getElementById('delete-error-banner');
      if (banner) banner.hidden = true;

      renderTransactionList(state.transactions);
      renderBalance(state.transactions);
      renderChart(state.transactions);
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initApp();
  bindEvents();
});