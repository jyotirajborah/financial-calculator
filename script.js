
// [DEPRECATED] PDF export functions removed - use Excel export only
// The following functions are kept for backwards compatibility but are no longer used in the UI:
// - exportFromButton(elementId) - reads export settings and calls exportToPDF
// - serverExport(elementId) - server-side Puppeteer rendering (endpoint still available for legacy callers)
// - exportToPDF(elementId, options) - client-side html2pdf export
// 
// Please use exportToExcel(elementId) for data export instead.

// State Management
let currentUser = null;

// Format numbers as Indian Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(amount));
};

// Export current view data to Excel using SheetJS
function exportToExcel(elementId) {
    const rowsInputs = [];
    const rowsResults = [];
    const extraSheets = [];

    const pushRow = (label, value) => rowsInputs.push([label, value]);
    const pushRes = (label, value) => rowsResults.push([label, value]);

    if (elementId === 'sip-calculator') {
        pushRow('Monthly Investment', document.getElementById('sip-amount').value);
        pushRow('Expected Return (p.a)', document.getElementById('sip-rate').value + '%');
        pushRow('Time (yr)', document.getElementById('sip-time').value);

        pushRes('Invested Amount', document.getElementById('sip-invested').textContent);
        pushRes('Estimated Returns', document.getElementById('sip-returns').textContent);
        pushRes('Total Value', document.getElementById('sip-total').textContent);
    } else if (elementId === 'emi-calculator') {
        pushRow('Loan Amount', document.getElementById('emi-amount').value);
        pushRow('Interest Rate (p.a)', document.getElementById('emi-rate').value + '%');
        pushRow('Tenure (yr)', document.getElementById('emi-time').value);

        pushRes('Monthly EMI', document.getElementById('emi-monthly').textContent);
        pushRes('Principal Amount', document.getElementById('emi-principal').textContent);
        pushRes('Total Interest', document.getElementById('emi-interest').textContent);
        pushRes('Total Payable', document.getElementById('emi-total').textContent);
    } else if (elementId === 'ci-calculator') {
        pushRow('Principal', document.getElementById('ci-principal').value);
        pushRow('Rate (p.a)', document.getElementById('ci-rate').value + '%');
        pushRow('Time (yr)', document.getElementById('ci-time').value);
        pushRow('Compounding', document.getElementById('ci-compounding').value);

        pushRes('Principal', document.getElementById('ci-principal-res').textContent);
        pushRes('Interest', document.getElementById('ci-interest').textContent);
        pushRes('Total', document.getElementById('ci-total').textContent);
    } else if (elementId === 'budget-planner') {
        pushRow('Monthly Income', document.getElementById('budget-income').value);
        const personaEl = document.getElementById('budget-persona');
        if (personaEl) {
            const opt = personaEl.options[personaEl.selectedIndex];
            const personaText = (opt && opt.text) ? opt.text : personaEl.value;
            pushRow('Financial Persona', personaText);
            if (personaEl.value === 'custom') {
                pushRow('Percent Split', `Needs ${budgetCustomPct.needs}%, Wants ${budgetCustomPct.wants}%, Savings ${budgetCustomPct.savings}%, Investments ${budgetCustomPct.investments}%`);
                pushRow('Percent Locks', `Needs ${budgetCustomLocks.needs ? 'Locked' : 'Auto'}, Wants ${budgetCustomLocks.wants ? 'Locked' : 'Auto'}, Savings ${budgetCustomLocks.savings ? 'Locked' : 'Auto'}, Investments ${budgetCustomLocks.investments ? 'Locked' : 'Auto'}`);

                extraSheets.push({
                    name: 'Custom Percentages',
                    aoa: [
                        ['Bucket', 'Percent', 'Locked'],
                        ['Needs', budgetCustomPct.needs, budgetCustomLocks.needs ? 'Yes' : 'No'],
                        ['Wants', budgetCustomPct.wants, budgetCustomLocks.wants ? 'Yes' : 'No'],
                        ['Savings', budgetCustomPct.savings, budgetCustomLocks.savings ? 'Yes' : 'No'],
                        ['Investments', budgetCustomPct.investments, budgetCustomLocks.investments ? 'Yes' : 'No']
                    ]
                });
            }
        }

        pushRes('Needs', document.getElementById('budget-needs').textContent);
        pushRes('Wants', document.getElementById('budget-wants').textContent);
        pushRes('Savings', document.getElementById('budget-savings').textContent);
        pushRes('Investments', (document.getElementById('budget-investments') || {}).textContent || '');

        // Full line-item breakdown (reflects live allocations + user locks)
        const hasBreakdownConfig = (typeof budgetBreakdownBaseConfig !== 'undefined') && budgetBreakdownBaseConfig;
        const hasBreakdownEls = (typeof budgetBreakdownEls !== 'undefined') && budgetBreakdownEls;
        if (hasBreakdownConfig) {
            const aoa = [['Category', 'Item', 'Amount', 'Locked']];
            const cats = ['needs', 'wants', 'savings', 'investments'];
            cats.forEach((catKey) => {
                const items = getBudgetBreakdownItems(catKey);
                items.forEach((it) => {
                    const el = hasBreakdownEls && budgetBreakdownEls[catKey] ? budgetBreakdownEls[catKey][it.key] : null;
                    const rawAmount = el && el.input ? el.input.value : '';
                    const amount = rawAmount === '' ? '' : (parseFloat(rawAmount) || 0);
                    const locked = el && el.lock ? (el.lock.checked ? 'Yes' : 'No') : '';
                    const catLabel = catKey.charAt(0).toUpperCase() + catKey.slice(1);
                    aoa.push([catLabel, it.label, amount, locked]);
                });
            });

            extraSheets.push({ name: 'Line Item Breakdown', aoa });
        }
    } else if (elementId === 'tax-calculator') {
        pushRow('Annual Income', document.getElementById('tax-income').value);
        pushRow('Standard Deduction', (document.getElementById('tax-std-deduction') || {}).value || '');

        pushRes('Taxable Income', document.getElementById('tax-taxable').textContent);
        pushRes('Slab Tax (Before Cess)', (document.getElementById('tax-slab-tax') || {}).textContent || '');
        pushRes('Cess (4%)', (document.getElementById('tax-cess') || {}).textContent || '');
        pushRes('Total Tax Payable (Incl. Cess)', document.getElementById('tax-payable').textContent);
        pushRes('Effective Tax Rate', (document.getElementById('tax-effective-rate') || {}).textContent || '');
        pushRes('After-Tax Income (Annual)', document.getElementById('tax-inhand').textContent);
        pushRes('After-Tax Income (Monthly)', document.getElementById('tax-monthly').textContent);
        pushRes('Tax (Monthly Avg.)', (document.getElementById('tax-monthly-tax') || {}).textContent || '');
    } else if (elementId === 'net-worth-calculator') {
        pushRow('Savings', document.getElementById('nw-savings').value);
        pushRow('Investments', document.getElementById('nw-investments').value);
        pushRow('Property', document.getElementById('nw-property').value);
        pushRow('Vehicles', document.getElementById('nw-vehicle').value);
        pushRow('Other Assets', document.getElementById('nw-other-assets').value);
        pushRow('Home Loan', document.getElementById('nw-home-loan').value);
        pushRow('Car Loan', document.getElementById('nw-car-loan').value);
        pushRow('Personal Loan', document.getElementById('nw-personal-loan').value);
        pushRow('Credit Card Debt', document.getElementById('nw-credit-card').value);
        pushRow('Other Liabilities', document.getElementById('nw-other-liabilities').value);

        pushRes('Total Assets', document.getElementById('nw-result-assets').textContent);
        pushRes('Total Liabilities', document.getElementById('nw-result-liabilities').textContent);
        pushRes('Net Worth', document.getElementById('nw-net-worth').textContent);
    } else {
        alert('Excel export: unknown view');
        return;
    }

    // Build workbook
    const wb = XLSX.utils.book_new();
    const wsInputs = XLSX.utils.aoa_to_sheet([['Input', 'Value'], ...rowsInputs]);
    const wsResults = XLSX.utils.aoa_to_sheet([['Result', 'Value'], ...rowsResults]);
    XLSX.utils.book_append_sheet(wb, wsInputs, 'Inputs');
    XLSX.utils.book_append_sheet(wb, wsResults, 'Results');

    extraSheets.forEach((s) => {
        if (!s || !s.name || !s.aoa) return;
        const safeName = String(s.name).slice(0, 31);
        const ws = XLSX.utils.aoa_to_sheet(s.aoa);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    const filename = `FinCalc-${elementId}-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// On load, allow '?view=emi-calculator' style deep links to open a specific view
function openViewFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view) {
        const navBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('data-target') === view);
        if (navBtn) navBtn.click();
    }
}

// Global Chart Objects
let sipChartObj = null;
let emiChartObj = null;
let ciChartObj = null;
let budgetChartObj = null;
let taxChartObj = null;

// Common chart options
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: { color: '#f8fafc', font: { family: "'Outfit', sans-serif" } }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) { label += ': '; }
                    if (context.parsed !== null) {
                        label += '₹' + formatCurrency(context.parsed);
                    }
                    return label;
                }
            }
        }
    }
};

// --- Navigation Logic ---
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove active from all nav
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        // Add to clicked
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        
        // Hide all views
        document.querySelectorAll('.calculator-view').forEach(v => v.classList.remove('active'));
        
        // Show target view
        const targetId = targetBtn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        // Update Title
        document.getElementById('page-title').textContent = targetBtn.querySelector('span').textContent;
        
        // Load history if target is history
        if (targetId === 'calc-history') {
            loadHistory();
        }

        // Close sidebar on mobile
        if(window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Sync input and range sliders
const syncInputs = (inputId, rangeId, calculateFunc) => {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    
    input.addEventListener('input', () => {
        range.value = input.value;
        calculateFunc();
    });
    
    range.addEventListener('input', () => {
        input.value = range.value;
        calculateFunc();
    });
};


// --- SIP Calculator ---
const calculateSIP = () => {
    const P = parseFloat(document.getElementById('sip-amount').value) || 0;
    const rate = parseFloat(document.getElementById('sip-rate').value) || 0;
    const t = parseFloat(document.getElementById('sip-time').value) || 0;
    
    const i = (rate / 100) / 12; // monthly interest rate
    const n = t * 12; // number of months
    
    let expectedAmount = 0;
    if (i !== 0) {
        expectedAmount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    } else {
        expectedAmount = P * n;
    }
    
    const investedAmount = P * n;
    const estReturns = expectedAmount - investedAmount;
    
    document.getElementById('sip-invested').textContent = '₹' + formatCurrency(investedAmount);
    document.getElementById('sip-returns').textContent = '₹' + formatCurrency(estReturns);
    document.getElementById('sip-total').textContent = '₹' + formatCurrency(expectedAmount);
    
    updateChart('sipChart', sipChartObj, ['Invested Amount', 'Est. Returns'], [investedAmount, estReturns], ['#6366f1', '#10b981'], 'sipChartObj');
    updateDashboard();
};

syncInputs('sip-amount', 'sip-amount-range', calculateSIP);
syncInputs('sip-rate', 'sip-rate-range', calculateSIP);
syncInputs('sip-time', 'sip-time-range', calculateSIP);


// --- EMI Calculator ---
const calculateEMI = () => {
    const P = parseFloat(document.getElementById('emi-amount').value) || 0;
    const R = parseFloat(document.getElementById('emi-rate').value) || 0;
    const N = parseFloat(document.getElementById('emi-time').value) || 0;
    
    const r = (R / 12) / 100;
    const n = N * 12;
    
    let emi = 0;
    if (r !== 0) {
        emi = P * r * (Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    } else {
        emi = P / n;
    }
    
    const totalPayable = emi * n;
    const totalInterest = totalPayable - P;
    
    document.getElementById('emi-monthly').textContent = '₹' + formatCurrency(emi);
    document.getElementById('emi-principal').textContent = '₹' + formatCurrency(P);
    document.getElementById('emi-interest').textContent = '₹' + formatCurrency(totalInterest);
    document.getElementById('emi-total').textContent = '₹' + formatCurrency(totalPayable);
    
    updateChart('emiChart', emiChartObj, ['Principal Loan Amount', 'Total Interest'], [P, totalInterest], ['#6366f1', '#f59e0b'], 'emiChartObj');
    updateDashboard();
};

syncInputs('emi-amount', 'emi-amount-range', calculateEMI);
syncInputs('emi-rate', 'emi-rate-range', calculateEMI);
syncInputs('emi-time', 'emi-time-range', calculateEMI);


// --- Compound Interest Calculator ---
const calculateCI = () => {
    const P = parseFloat(document.getElementById('ci-principal').value) || 0;
    const r = parseFloat(document.getElementById('ci-rate').value) || 0;
    const t = parseFloat(document.getElementById('ci-time').value) || 0;
    const n = parseFloat(document.getElementById('ci-compounding').value) || 12;
    
    const amount = P * Math.pow(1 + (r / 100) / n, n * t);
    const interest = amount - P;
    
    document.getElementById('ci-principal-res').textContent = '₹' + formatCurrency(P);
    document.getElementById('ci-interest').textContent = '₹' + formatCurrency(interest);
    document.getElementById('ci-total').textContent = '₹' + formatCurrency(amount);
    
    updateChart('ciChart', ciChartObj, ['Principal Amount', 'Total Interest'], [P, interest], ['#6366f1', '#10b981'], 'ciChartObj');
    updateDashboard();
};

syncInputs('ci-principal', 'ci-principal-range', calculateCI);
syncInputs('ci-rate', 'ci-rate-range', calculateCI);
syncInputs('ci-time', 'ci-time-range', calculateCI);
document.getElementById('ci-compounding').addEventListener('change', calculateCI);


// --- Budget Planner ---
const budgetBreakdownBaseConfig = {
    needs: [
        { key: 'housing', label: 'Housing', weight: 1 },
        { key: 'groceries', label: 'Groceries', weight: 1 },
        { key: 'utilities', label: 'Utilities', weight: 1 },
        { key: 'transport', label: 'Transportation', weight: 1 },
        { key: 'insurance', label: 'Insurance', weight: 1 }
    ],
    wants: [
        { key: 'entertainment', label: 'Entertainment', weight: 1 },
        { key: 'dining', label: 'Dining out', weight: 1 },
        { key: 'hobbies', label: 'Hobbies', weight: 1 },
        { key: 'vacations', label: 'Vacations', weight: 1 },
        { key: 'shopping', label: 'Shopping', weight: 1 }
    ],
    savings: [
        { key: 'emergency', label: 'Emergency fund', weight: 1 },
        { key: 'short_term', label: 'Short-term goals', weight: 1 },
        { key: 'buffer', label: 'Cash buffer', weight: 1 }
    ],
    investments: [
        { key: 'sip', label: 'SIPs / Index funds', weight: 1 },
        { key: 'retirement', label: 'Retirement', weight: 1 },
        { key: 'long_term', label: 'Long-term goals', weight: 1 }
    ]
};

const budgetBreakdownMisc = { needs: [], wants: [], savings: [], investments: [] };

const budgetBreakdownState = { needs: {}, wants: {}, savings: {}, investments: {} };
const budgetBreakdownEls = { needs: {}, wants: {}, savings: {}, investments: {} };
let budgetBreakdownInitialized = false;
let budgetBreakdownInternalUpdate = false;

const getBudgetBreakdownItems = (catKey) => {
    const base = (budgetBreakdownBaseConfig[catKey] || []).map((x) => ({ ...x, isMisc: false }));
    const misc = (budgetBreakdownMisc[catKey] || []).map((x) => ({ ...x, isMisc: true }));
    return [...base, ...misc];
};

const captureBudgetLineItemBreakdown = () => {
    // Returns a stable JSON-friendly structure for history/export.
    const cats = ['needs', 'wants', 'savings', 'investments'];
    const out = {};

    cats.forEach((catKey) => {
        const items = getBudgetBreakdownItems(catKey);
        const elsByKey = budgetBreakdownEls[catKey] || {};
        const stateByKey = budgetBreakdownState[catKey] || {};

        out[catKey] = items.map((it) => {
            const el = elsByKey[it.key] || {};
            const rawAmount = el.input ? el.input.value : '';
            const amount = rawAmount === '' ? 0 : (parseFloat(rawAmount) || 0);
            const locked = el.lock ? !!el.lock.checked : !!(stateByKey[it.key] && stateByKey[it.key].locked);
            const label = it.isMisc && el.labelInput && typeof el.labelInput.value === 'string'
                ? el.labelInput.value
                : (it.label || '');

            return { key: it.key, label, amount, locked, isMisc: !!it.isMisc };
        });
    });

    return out;
};

const ensureBudgetMiscDefaults = () => {
    Object.keys(budgetBreakdownMisc).forEach((catKey) => {
        if ((budgetBreakdownMisc[catKey] || []).length > 0) return;
        // Default misc row per category (locked at 0 until user uses it)
        const key = `misc_${catKey}_0`;
        budgetBreakdownMisc[catKey].push({ key, label: 'Misc', weight: 1 });
        budgetBreakdownState[catKey][key] = { locked: true, amount: 0 };
    });
};

const ensureBudgetBreakdownState = () => {
    ensureBudgetMiscDefaults();
    Object.keys(budgetBreakdownBaseConfig).forEach((cat) => {
        getBudgetBreakdownItems(cat).forEach((it) => {
            if (!budgetBreakdownState[cat][it.key]) {
                budgetBreakdownState[cat][it.key] = { locked: false, amount: 0 };
            }
        });
    });
};

const allocateBudgetCategory = (total, catKey) => {
    const items = getBudgetBreakdownItems(catKey);
    const state = budgetBreakdownState[catKey] || {};

    const locked = [];
    const unlocked = [];
    let lockedSum = 0;

    items.forEach((it) => {
        const st = state[it.key] || { locked: false, amount: 0 };
        const amt = Math.max(0, parseFloat(st.amount) || 0);
        if (st.locked) {
            locked.push({ ...it, amount: amt });
            lockedSum += amt;
        } else {
            unlocked.push(it);
        }
    });

    const overflow = lockedSum > total;
    const remaining = Math.max(0, total - lockedSum);
    const sumW = unlocked.reduce((acc, it) => acc + (it.weight || 1), 0) || 0;

    const alloc = {};
    locked.forEach((it) => { alloc[it.key] = it.amount; });

    if (unlocked.length === 0) {
        return { alloc, lockedSum, remaining, overflow };
    }

    // Distribute remaining across unlocked items; adjust last to fix rounding drift.
    let running = 0;
    unlocked.forEach((it, idx) => {
        const w = it.weight || 1;
        let val = sumW > 0 ? (remaining * w) / sumW : 0;
        val = Math.round(val);
        if (idx === unlocked.length - 1) {
            val = Math.max(0, Math.round(remaining - running));
        } else {
            running += val;
        }
        alloc[it.key] = val;
    });

    return { alloc, lockedSum, remaining, overflow };
};

const addBudgetMiscItem = (catKey) => {
    const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const key = `misc_${catKey}_${id}`;
    budgetBreakdownMisc[catKey] = budgetBreakdownMisc[catKey] || [];
    budgetBreakdownMisc[catKey].push({ key, label: 'Misc', weight: 1 });
    budgetBreakdownState[catKey][key] = { locked: true, amount: 0 };
};

const deleteBudgetMiscItem = (catKey, key) => {
    budgetBreakdownMisc[catKey] = (budgetBreakdownMisc[catKey] || []).filter((it) => it.key !== key);
    if (budgetBreakdownState[catKey]) delete budgetBreakdownState[catKey][key];
    if (budgetBreakdownEls[catKey]) delete budgetBreakdownEls[catKey][key];
};

const renderBudgetBreakdownCategory = (catKey) => {
    const container = document.getElementById(`budget-breakdown-${catKey}`);
    if (!container) return;

    budgetBreakdownEls[catKey] = {};
    container.innerHTML = '';

    const items = getBudgetBreakdownItems(catKey);
    items.forEach((it) => {
        const row = document.createElement('div');
        row.className = 'budget-breakdown-row';

        let labelNode = null;
        if (it.isMisc) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'budget-breakdown-label-input';
            input.value = it.label || 'Misc';
            input.placeholder = 'Name';
            input.addEventListener('input', () => {
                const list = budgetBreakdownMisc[catKey] || [];
                const target = list.find((x) => x.key === it.key);
                if (target) target.label = input.value;
            });
            labelNode = input;
        } else {
            const label = document.createElement('div');
            label.className = 'budget-breakdown-label';
            label.textContent = it.label;
            labelNode = label;
        }

        const controls = document.createElement('div');
        controls.className = 'budget-breakdown-controls';

        const lockLabel = document.createElement('label');
        lockLabel.className = 'budget-breakdown-lock';

        const lock = document.createElement('input');
        lock.type = 'checkbox';

        const lockText = document.createElement('span');
        lockText.textContent = 'Lock';

        lockLabel.appendChild(lock);
        lockLabel.appendChild(lockText);

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '100';
        input.placeholder = 'Amount';
        input.inputMode = 'numeric';

        lock.addEventListener('change', () => {
            if (budgetBreakdownInternalUpdate) return;
            const st = budgetBreakdownState[catKey][it.key];
            st.locked = !!lock.checked;
            if (st.locked) {
                st.amount = parseFloat(input.value) || 0;
            }
            calculateBudget();
        });

        input.addEventListener('input', () => {
            if (budgetBreakdownInternalUpdate) return;
            const st = budgetBreakdownState[catKey][it.key];
            st.amount = parseFloat(input.value) || 0;
            st.locked = true;
            lock.checked = true;
            calculateBudget();
        });

        controls.appendChild(input);
        controls.appendChild(lockLabel);

        if (it.isMisc && it.key !== `misc_${catKey}_0`) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'budget-breakdown-delete';
            del.textContent = 'Remove';
            del.addEventListener('click', () => {
                deleteBudgetMiscItem(catKey, it.key);
                renderBudgetBreakdownCategory(catKey);
                calculateBudget();
            });
            controls.appendChild(del);
        }

        if (labelNode) row.appendChild(labelNode);
        row.appendChild(controls);
        container.appendChild(row);

        budgetBreakdownEls[catKey][it.key] = { input, lock, labelInput: labelNode };
    });

    const addRow = document.createElement('div');
    addRow.className = 'budget-breakdown-add';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'budget-breakdown-add-btn';
    btn.textContent = 'Add item';
    btn.addEventListener('click', () => {
        addBudgetMiscItem(catKey);
        renderBudgetBreakdownCategory(catKey);
        calculateBudget();
    });
    addRow.appendChild(btn);
    container.appendChild(addRow);
};

const ensureBudgetBreakdownUI = () => {
    if (budgetBreakdownInitialized) return;
    ensureBudgetBreakdownState();

    Object.keys(budgetBreakdownBaseConfig).forEach((catKey) => renderBudgetBreakdownCategory(catKey));

    budgetBreakdownInitialized = true;
};

const budgetPersonas = {
    survival: {
        label: 'Survival Persona',
        hint: 'Focus: basic stability. Prioritize essentials and a small buffer.',
        needs: 65, wants: 22.5, savings: 7.5, investments: 5
    },
    balanced: {
        label: 'Balanced Persona',
        hint: 'Focus: stable lifestyle + wealth building (50/30/10/10 split).',
        needs: 50, wants: 30, savings: 10, investments: 10
    },
    wealth_builder: {
        label: 'Wealth Builder Persona',
        hint: 'Focus: long-term accumulation. Higher investing allocation.',
        needs: 50, wants: 20, savings: 10, investments: 20
    },
    aggressive_investor: {
        label: 'Aggressive Investor Persona',
        hint: 'Focus: maximize investments (FIRE-style). Keep wants tight.',
        needs: 40, wants: 12.5, savings: 7.5, investments: 40
    },
    financial_freedom: {
        label: 'Financial Freedom Persona',
        hint: 'Focus: wealth preservation + flexibility.',
        needs: 35, wants: 25, savings: 7.5, investments: 32.5
    },
    ultra_minimalist: {
        label: 'Ultra-Minimalist Persona',
        hint: 'Focus: extreme investing rate. Lifestyle kept very lean.',
        needs: 32.5, wants: 7.5, savings: 7.5, investments: 52.5
    }
};

let budgetPrevPersonaKey = 'balanced';
let budgetCustomSeeded = false;
let budgetCustomInternalUpdate = false;
let budgetCustomListenersAttached = false;
let budgetCustomPct = { needs: 50, wants: 30, savings: 10, investments: 10 };
let budgetCustomLocks = { needs: false, wants: false, savings: false, investments: false };

const roundPct05 = (v) => Math.round(v * 2) / 2;
const clampPct = (v) => Math.max(0, Math.min(100, v));

const setBudgetCustomControlsVisible = (visible) => {
    const el = document.getElementById('budget-custom-controls');
    if (!el) return;
    el.style.display = visible ? 'block' : 'none';
};

const writeBudgetCustomInputs = (pct) => {
    const ids = {
        needs: 'budget-pct-needs',
        wants: 'budget-pct-wants',
        savings: 'budget-pct-savings',
        investments: 'budget-pct-investments'
    };

    budgetCustomInternalUpdate = true;
    Object.keys(ids).forEach((k) => {
        const inp = document.getElementById(ids[k]);
        if (inp) inp.value = String(pct[k]);
    });

    const lockIds = {
        needs: 'budget-lock-needs',
        wants: 'budget-lock-wants',
        savings: 'budget-lock-savings',
        investments: 'budget-lock-investments'
    };
    Object.keys(lockIds).forEach((k) => {
        const cb = document.getElementById(lockIds[k]);
        if (cb) cb.checked = !!budgetCustomLocks[k];
    });
    budgetCustomInternalUpdate = false;
};

const setBudgetCustomWarning = (msg) => {
    const el = document.getElementById('budget-custom-warning');
    if (!el) return;
    if (!msg) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.style.display = 'block';
    el.textContent = msg;
};

const rebalanceBudgetCustom = (changedKey, rawVal) => {
    const next = { ...budgetCustomPct };
    const newVal = roundPct05(clampPct(parseFloat(rawVal) || 0));
    next[changedKey] = newVal;

    const keys = ['needs', 'wants', 'savings', 'investments'];
    const lockedKeys = keys.filter((k) => budgetCustomLocks[k]);
    const fixedKeys = Array.from(new Set([...lockedKeys, changedKey]));
    const adjustableKeys = keys.filter((k) => !fixedKeys.includes(k));

    const fixedSum = fixedKeys.reduce((acc, k) => acc + (parseFloat(next[k]) || 0), 0);
    if (fixedSum > 100) {
        setBudgetCustomWarning('Locked + fixed percentages exceed 100%. Reduce a locked value or unlock a bucket.');
        budgetCustomPct = next;
        writeBudgetCustomInputs(budgetCustomPct);
        return;
    }

    const remaining = Math.max(0, 100 - fixedSum);
    const sumAdjustable = adjustableKeys.reduce((acc, k) => acc + (parseFloat(next[k]) || 0), 0);

    if (adjustableKeys.length === 0) {
        // Nothing to rebalance. Keep user values, but warn if not 100.
        const sum = fixedSum;
        if (Math.abs(100 - sum) > 0.001) {
            setBudgetCustomWarning('All other buckets are locked. Unlock one bucket to rebalance to 100%.');
        } else {
            setBudgetCustomWarning('');
        }
        budgetCustomPct = next;
        writeBudgetCustomInputs(budgetCustomPct);
        return;
    }

    if (sumAdjustable <= 0) {
        const even = remaining / adjustableKeys.length;
        adjustableKeys.forEach((k, idx) => {
            let v = roundPct05(even);
            if (idx === adjustableKeys.length - 1) {
                const used = adjustableKeys.slice(0, -1).reduce((acc, kk) => acc + (parseFloat(next[kk]) || 0), 0);
                v = roundPct05(Math.max(0, remaining - used));
            }
            next[k] = v;
        });
    } else {
        let running = 0;
        adjustableKeys.forEach((k, idx) => {
            let v = (remaining * (parseFloat(next[k]) || 0)) / sumAdjustable;
            v = roundPct05(v);
            if (idx === adjustableKeys.length - 1) {
                v = roundPct05(Math.max(0, remaining - running));
            } else {
                running += v;
            }
            next[k] = v;
        });
    }

    // Final correction to ensure exact 100 after rounding.
    const sum = keys.reduce((acc, k) => acc + (parseFloat(next[k]) || 0), 0);
    const delta = roundPct05(100 - sum);
    if (Math.abs(delta) > 0.0001) {
        const fixKey = adjustableKeys[adjustableKeys.length - 1];
        next[fixKey] = roundPct05(clampPct((parseFloat(next[fixKey]) || 0) + delta));
    }

    budgetCustomPct = next;
    setBudgetCustomWarning('');
    writeBudgetCustomInputs(budgetCustomPct);
};

const attachBudgetCustomPctListeners = () => {
    if (budgetCustomListenersAttached) return;
    const bindings = [
        { key: 'needs', id: 'budget-pct-needs' },
        { key: 'wants', id: 'budget-pct-wants' },
        { key: 'savings', id: 'budget-pct-savings' },
        { key: 'investments', id: 'budget-pct-investments' }
    ];

    bindings.forEach((b) => {
        const el = document.getElementById(b.id);
        if (!el) return;
        el.addEventListener('input', () => {
            if (budgetCustomInternalUpdate) return;
            rebalanceBudgetCustom(b.key, el.value);
            calculateBudget();
        });
    });

    const lockBindings = [
        { key: 'needs', id: 'budget-lock-needs' },
        { key: 'wants', id: 'budget-lock-wants' },
        { key: 'savings', id: 'budget-lock-savings' },
        { key: 'investments', id: 'budget-lock-investments' }
    ];
    lockBindings.forEach((b) => {
        const cb = document.getElementById(b.id);
        if (!cb) return;
        cb.addEventListener('change', () => {
            if (budgetCustomInternalUpdate) return;
            budgetCustomLocks[b.key] = !!cb.checked;
            // Rebalance by "nudging" an unlocked key, prefer wants.
            const pivot = (b.key !== 'wants') ? 'wants' : 'savings';
            rebalanceBudgetCustom(pivot, budgetCustomPct[pivot]);
            calculateBudget();
        });
    });

    budgetCustomListenersAttached = true;
};

const onBudgetPersonaChange = () => {
    const personaSelect = document.getElementById('budget-persona');
    const personaKey = personaSelect ? personaSelect.value : 'balanced';

    if (personaKey === 'custom') {
        setBudgetCustomControlsVisible(true);

        if (!budgetCustomSeeded) {
            const seed = budgetPersonas[budgetPrevPersonaKey] || budgetPersonas.balanced;
            budgetCustomPct = { needs: seed.needs, wants: seed.wants, savings: seed.savings, investments: seed.investments };
            budgetCustomSeeded = true;
        }

        setBudgetCustomWarning('');
        writeBudgetCustomInputs(budgetCustomPct);
        attachBudgetCustomPctListeners();
    } else {
        setBudgetCustomControlsVisible(false);
        setBudgetCustomWarning('');
    }

    calculateBudget();
    budgetPrevPersonaKey = personaKey;
};

const calculateBudget = () => {
    const RUPEE = '\u20B9';
    const income = parseFloat(document.getElementById('budget-income').value) || 0;

    const personaSelect = document.getElementById('budget-persona');
    const personaKey = personaSelect ? personaSelect.value : 'balanced';
    const p = (personaKey === 'custom')
        ? { label: 'Custom', hint: 'Custom: adjust percentages below (auto-balances to 100%).', ...budgetCustomPct }
        : (budgetPersonas[personaKey] || budgetPersonas.balanced);

    const needs = income * (p.needs / 100);
    const wants = income * (p.wants / 100);
    const savings = income * (p.savings / 100);
    const investments = income * (p.investments / 100);

    const needsTitle = document.getElementById('budget-needs-title');
    const wantsTitle = document.getElementById('budget-wants-title');
    const savingsTitle = document.getElementById('budget-savings-title');
    const investmentsTitle = document.getElementById('budget-investments-title');
    if (needsTitle) needsTitle.textContent = `Needs (${p.needs}%)`;
    if (wantsTitle) wantsTitle.textContent = `Wants (${p.wants}%)`;
    if (savingsTitle) savingsTitle.textContent = `Savings (${p.savings}%)`;
    if (investmentsTitle) investmentsTitle.textContent = `Investments (${p.investments}%)`;

    const personaHint = document.getElementById('budget-persona-hint');
    if (personaHint) personaHint.textContent = p.hint;

    document.getElementById('budget-needs').textContent = RUPEE + formatCurrency(needs);
    document.getElementById('budget-wants').textContent = RUPEE + formatCurrency(wants);
    document.getElementById('budget-savings').textContent = RUPEE + formatCurrency(savings);
    const invEl = document.getElementById('budget-investments');
    if (invEl) invEl.textContent = RUPEE + formatCurrency(investments);

    ensureBudgetBreakdownUI();

    const applyBreakdown = (catKey, total) => {
        const res = allocateBudgetCategory(total, catKey);
        const meta = document.getElementById(`budget-breakdown-meta-${catKey}`);

        budgetBreakdownInternalUpdate = true;
        getBudgetBreakdownItems(catKey).forEach((it) => {
            const el = budgetBreakdownEls[catKey][it.key];
            if (!el) return;
            const st = budgetBreakdownState[catKey][it.key];
            const val = Math.max(0, res.alloc[it.key] || 0);
            el.input.value = String(Math.round(val));
            el.lock.checked = !!st.locked;
        });
        budgetBreakdownInternalUpdate = false;

        if (meta) {
            meta.classList.toggle('warning', !!res.overflow);
            if (res.overflow) {
                meta.textContent = `Locked items exceed total: locked ${RUPEE}${formatCurrency(res.lockedSum)} > total ${RUPEE}${formatCurrency(total)}.`;
            } else {
                meta.textContent = `Locked: ${RUPEE}${formatCurrency(res.lockedSum)} | Auto-allocated: ${RUPEE}${formatCurrency(res.remaining)}`;
            }
        }
    };

    applyBreakdown('needs', needs);
    applyBreakdown('wants', wants);
    applyBreakdown('savings', savings);
    applyBreakdown('investments', investments);

    updateChart(
        'budgetChart',
        budgetChartObj,
        [`Needs (${p.needs}%)`, `Wants (${p.wants}%)`, `Savings (${p.savings}%)`, `Investments (${p.investments}%)`],
        [needs, wants, savings, investments],
        ['#6366f1', '#f59e0b', '#10b981', '#38bdf8'],
        'budgetChartObj',
        'doughnut'
    );
    updateDashboard();
};

document.getElementById('budget-income').addEventListener('input', calculateBudget);
const budgetPersonaEl = document.getElementById('budget-persona');
if (budgetPersonaEl) budgetPersonaEl.addEventListener('change', onBudgetPersonaChange);


// --- Income Tax Calculator (New Regime FY 2024-25) ---
const computeNewRegimeFY2425SlabTax = (taxableIncome) => {
    const slabs = [
        { from: 0, to: 300000, rate: 0.00, label: '0 - 3L @ 0%' },
        { from: 300000, to: 600000, rate: 0.05, label: '3L - 6L @ 5%' },
        { from: 600000, to: 900000, rate: 0.10, label: '6L - 9L @ 10%' },
        { from: 900000, to: 1200000, rate: 0.15, label: '9L - 12L @ 15%' },
        { from: 1200000, to: 1500000, rate: 0.20, label: '12L - 15L @ 20%' },
        { from: 1500000, to: Infinity, rate: 0.30, label: '15L+ @ 30%' }
    ];

    let slabTax = 0;
    const breakdown = [];

    for (const slab of slabs) {
        if (taxableIncome <= slab.from) break;
        const upper = Math.min(taxableIncome, slab.to);
        const amountInSlab = Math.max(0, upper - slab.from);
        const taxForSlab = amountInSlab * slab.rate;

        slabTax += taxForSlab;
        breakdown.push({ label: slab.label, amountInSlab, rate: slab.rate, taxForSlab });
    }

    return { slabTax, breakdown };
};

const calculateTax = () => {
    const RUPEE = '\u20B9';
    const income = parseFloat(document.getElementById('tax-income').value) || 0;
    const stdDeductionEl = document.getElementById('tax-std-deduction');
    const stdDeduction = parseFloat(stdDeductionEl ? stdDeductionEl.value : '0') || 0;
    const taxableIncome = Math.max(0, income - stdDeduction);

    // Rebate u/s 87A (new regime): taxable income <= 7L => income tax becomes 0.
    let slabTax = 0;
    let breakdown = [];
    const breakdownEl = document.getElementById('tax-slab-breakdown');

    if (taxableIncome <= 700000) {
        slabTax = 0;
        breakdown = [];
        if (breakdownEl) {
            breakdownEl.textContent = 'Rebate u/s 87A applied: taxable income <= 7,00,000 => income tax = 0.';
        }
    } else {
        const res = computeNewRegimeFY2425SlabTax(taxableIncome);
        slabTax = res.slabTax;
        breakdown = res.breakdown;

        if (breakdownEl) {
            breakdownEl.innerHTML = breakdown.map((b) => {
                const taxableInSlab = `${RUPEE}${formatCurrency(b.amountInSlab)}`;
                const taxInSlab = `${RUPEE}${formatCurrency(b.taxForSlab)}`;
                const pct = (b.rate * 100).toFixed(0);
                return `<div class="tax-breakdown-row"><span>${b.label} (Taxable: ${taxableInSlab})</span><strong>${taxInSlab} (${pct}%)</strong></div>`;
            }).join('');
        }
    }

    const cess = slabTax * 0.04;
    const totalTax = slabTax + cess;

    const annualAfterTax = Math.max(0, income - totalTax);
    const monthlyAfterTax = annualAfterTax / 12;
    const monthlyTax = totalTax / 12;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    document.getElementById('tax-payable').textContent = RUPEE + formatCurrency(totalTax);
    document.getElementById('tax-taxable').textContent = RUPEE + formatCurrency(taxableIncome);
    document.getElementById('tax-slab-tax').textContent = RUPEE + formatCurrency(slabTax);
    document.getElementById('tax-cess').textContent = RUPEE + formatCurrency(cess);
    document.getElementById('tax-effective-rate').textContent = `${effectiveRate.toFixed(1)}%`;
    document.getElementById('tax-inhand').textContent = RUPEE + formatCurrency(annualAfterTax);
    document.getElementById('tax-monthly').textContent = RUPEE + formatCurrency(monthlyAfterTax);
    document.getElementById('tax-monthly-tax').textContent = RUPEE + formatCurrency(monthlyTax);

    updateChart('taxChart', taxChartObj, ['After-Tax Income', 'Total Tax'], [annualAfterTax, totalTax], ['#10b981', '#ef4444'], 'taxChartObj', 'doughnut');
    updateDashboard();
};

syncInputs('tax-income', 'tax-income-range', calculateTax);
const stdDeductionInput = document.getElementById('tax-std-deduction');
if (stdDeductionInput) stdDeductionInput.addEventListener('input', calculateTax);


// --- Net Worth Calculator ---
const calculateNetWorth = () => {
    // Get all asset values
    const savings = parseFloat(document.getElementById('nw-savings').value) || 0;
    const investments = parseFloat(document.getElementById('nw-investments').value) || 0;
    const property = parseFloat(document.getElementById('nw-property').value) || 0;
    const vehicle = parseFloat(document.getElementById('nw-vehicle').value) || 0;
    const otherAssets = parseFloat(document.getElementById('nw-other-assets').value) || 0;
    
    const totalAssets = savings + investments + property + vehicle + otherAssets;
    
    // Get all liability values
    const homeLoan = parseFloat(document.getElementById('nw-home-loan').value) || 0;
    const carLoan = parseFloat(document.getElementById('nw-car-loan').value) || 0;
    const personalLoan = parseFloat(document.getElementById('nw-personal-loan').value) || 0;
    const creditCard = parseFloat(document.getElementById('nw-credit-card').value) || 0;
    const otherLiabilities = parseFloat(document.getElementById('nw-other-liabilities').value) || 0;
    
    const totalLiabilities = homeLoan + carLoan + personalLoan + creditCard + otherLiabilities;
    
    // Calculate net worth
    const netWorth = totalAssets - totalLiabilities;
    
    // Update display
    document.getElementById('nw-total-assets').textContent = '₹' + formatCurrency(totalAssets);
    document.getElementById('nw-total-liabilities').textContent = '₹' + formatCurrency(totalLiabilities);
    document.getElementById('nw-result-assets').textContent = '₹' + formatCurrency(totalAssets);
    document.getElementById('nw-result-liabilities').textContent = '₹' + formatCurrency(totalLiabilities);
    document.getElementById('nw-net-worth').textContent = '₹' + formatCurrency(netWorth);
};

// Attach listeners to all net worth input fields
const nwInputIds = [
    'nw-savings', 'nw-investments', 'nw-property', 'nw-vehicle', 'nw-other-assets',
    'nw-home-loan', 'nw-car-loan', 'nw-personal-loan', 'nw-credit-card', 'nw-other-liabilities'
];

nwInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', calculateNetWorth);
    }
});

// Initial calculation
calculateNetWorth();


// --- Dashboard Update Function ---
const updateDashboard = () => {
    // Update dashboard cards with current calculator values
    
    // Net Worth: Assets minus Liabilities
    const nwNetWorth = document.getElementById('nw-net-worth');
    if (nwNetWorth) {
        document.getElementById('dash-networth').textContent = nwNetWorth.textContent;
    }
    
    // SIP: Total SIP Value
    const sipTotal = document.getElementById('sip-total');
    if (sipTotal && sipTotal.textContent) {
        document.getElementById('dash-sip').textContent = sipTotal.textContent;
    } else {
        const sipAmount = document.getElementById('sip-amount');
        if (sipAmount) {
            document.getElementById('dash-sip').textContent = '₹' + formatCurrency(parseFloat(sipAmount.value) || 0);
        }
    }
    
    // Monthly Investing Goal: From budget calculator (prefer investments if available)
    const monthlyInvestments = document.getElementById('budget-investments');
    const monthlySavings = document.getElementById('budget-savings');
    if (monthlyInvestments && monthlyInvestments.textContent) {
        document.getElementById('dash-savings').textContent = monthlyInvestments.textContent;
    } else if (monthlySavings && monthlySavings.textContent) {
        document.getElementById('dash-savings').textContent = monthlySavings.textContent;
    }
    
    // Annual Tax: Tax payable amount
    const annualTax = document.getElementById('tax-payable');
    if (annualTax) {
        document.getElementById('dash-tax').textContent = annualTax.textContent;
    }
    
    // Monthly EMI: EMI monthly payment
    const monthlyEMI = document.getElementById('emi-monthly');
    if (monthlyEMI) {
        document.getElementById('dash-emi').textContent = monthlyEMI.textContent;
    }
    
    // Total Liabilities: From net worth calculator
    const nwLiabilities = document.getElementById('nw-result-liabilities');
    if (nwLiabilities) {
        document.getElementById('dash-liabilities').textContent = nwLiabilities.textContent;
    }
};

// Attach updateDashboard to calculator change events
const calculateNetWorthWithDashboard = () => {
    calculateNetWorth();
    updateDashboard();
};

// Replace the previous listeners with ones that update dashboard
nwInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.removeEventListener('input', calculateNetWorth);
        el.addEventListener('input', calculateNetWorthWithDashboard);
    }
});


// --- History Logic ---
const saveCalculation = async (type, e) => {
    if (e) e.preventDefault();
    let input_data = {};
    let result_data = {};
    
    if (type === 'SIP') {
        input_data = {
            amount: document.getElementById('sip-amount').value,
            rate: document.getElementById('sip-rate').value,
            time: document.getElementById('sip-time').value
        };
        result_data = { total: document.getElementById('sip-total').textContent };
    } else if (type === 'EMI') {
        input_data = {
            amount: document.getElementById('emi-amount').value,
            rate: document.getElementById('emi-rate').value,
            time: document.getElementById('emi-time').value
        };
        result_data = { monthly: document.getElementById('emi-monthly').textContent };
    } else if (type === 'CI') {
        input_data = {
            principal: document.getElementById('ci-principal').value,
            rate: document.getElementById('ci-rate').value,
            time: document.getElementById('ci-time').value
        };
        result_data = { total: document.getElementById('ci-total').textContent };
    } else if (type === 'TAX') {
        input_data = { income: document.getElementById('tax-income').value };
        result_data = { tax: document.getElementById('tax-payable').textContent };
    } else if (type === 'BUDGET') {
        const personaEl = document.getElementById('budget-persona');
        const personaValue = personaEl ? personaEl.value : 'balanced';
        input_data = { income: document.getElementById('budget-income').value, persona: personaValue };
        if (personaValue === 'custom') {
            input_data.percentages = { ...budgetCustomPct };
            input_data.locks = { ...budgetCustomLocks };
        }
        result_data = {
            needs: document.getElementById('budget-needs').textContent,
            wants: document.getElementById('budget-wants').textContent,
            savings: document.getElementById('budget-savings').textContent,
            investments: (document.getElementById('budget-investments') || {}).textContent || ''
        };
        if (budgetBreakdownInitialized) {
            result_data.breakdown = captureBudgetLineItemBreakdown();
        }
    } else if (type === 'NETWORTH') {
        input_data = {
            assets: document.getElementById('nw-total-assets').textContent,
            liabilities: document.getElementById('nw-total-liabilities').textContent
        };
        result_data = { networth: document.getElementById('nw-net-worth').textContent };
    }

    const token = localStorage.getItem('auth_token');
    if (!token) return alert("Please login to save calculations.");

    const btn = e ? e.target.closest('.btn-save') : null;

    try {
        const response = await fetch('/api/history', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ calc_type: type, input_data, result_data })
        });
        
        if (response.ok) {
            if (btn) {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Saved!';
                btn.style.color = 'var(--success)';
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.style.color = '';
                }, 2000);
            }
            // Save completed successfully - no auto-export
        } else {
            const errData = await response.json();
            console.error("Save failed:", errData);
            alert(`Could not save: ${errData.error || 'Server error. Please check Supabase table setup.'}`);
        }
    } catch (error) {
        console.error("Network error saving history:", error);
        alert("Network error. Make sure the server is running.");
    }
};

const loadHistory = async () => {
    const list = document.getElementById('history-list');
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    list.innerHTML = '<div class="empty-msg">Loading history...</div>';

    try {
        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.length === 0) {
            list.innerHTML = '<p class="empty-msg">No history found. Save a calculation to see it here!</p>';
            return;
        }

        list.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            let label = "";
            let subtext = "";
            let mainVal = "";
            
            if (item.calc_type === 'SIP') {
                label = "SIP Plan";
                subtext = `₹${item.input_data.amount}/mo @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
                mainVal = item.result_data.total;
            } else if (item.calc_type === 'EMI') {
                label = "Loan EMI";
                subtext = `₹${item.input_data.amount} @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
                mainVal = item.result_data.monthly;
            } else if (item.calc_type === 'TAX') {
                label = "Tax Estimate";
                subtext = `Income: ₹${formatCurrency(item.input_data.income)}`;
                mainVal = item.result_data.tax;
            } else if (item.calc_type === 'CI') {
                label = "Growth Plan";
                subtext = `Principal: ₹${item.input_data.principal} @ ${item.input_data.rate}%`;
                mainVal = item.result_data.total;
            } else if (item.calc_type === 'BUDGET') {
                label = "Budget Rule";
                const persona = item.input_data.persona ? ` | Persona: ${item.input_data.persona}` : "";
                subtext = `Monthly Income: ₹${item.input_data.income}${persona}`;
                mainVal = item.result_data.investments || item.result_data.savings;
            } else if (item.calc_type === 'NETWORTH') {
                label = "Net Worth";
                subtext = `Assets: ${item.input_data.assets} | Liabilities: ${item.input_data.liabilities}`;
                mainVal = item.result_data.networth;
            }

            const date = new Date(item.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            div.innerHTML = `
                <div class="history-info">
                    <h4>${label}</h4>
                    <p>${subtext}</p>
                </div>
                <div class="history-value">
                    <span class="main-val">${mainVal}</span>
                    <span class="date">${date}</span>
                </div>
                <button class="btn-delete-history" onclick="deleteCalculation('${item.id}')" title="Delete">
                    <ion-icon name="trash-outline"></ion-icon>
                </button>
            `;
            list.appendChild(div);
        });
    } catch (error) {
        list.innerHTML = '<p class="empty-msg">Something went wrong while loading history.</p>';
    }
};

const deleteCalculation = async (id) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadHistory(); // Refresh the list
        } else {
            const errData = await response.json();
            alert(`Could not delete: ${errData.error}`);
        }
    } catch (error) {
        console.error('Error deleting history item:', error);
    }
};

// --- Export Logic ---
const exportToPDF = async (elementId, options = {}) => {
    // options: { marginMm: number, paper: 'a4'|'letter', scale: number }
    const opts = Object.assign({ marginMm: 10, paper: 'a4', scale: 2 }, options);
    const element = document.getElementById(elementId);
    if (!element) return alert('Export failed: element not found');

    // Save original styles/visibility to restore later
    const origBodyOverflow = document.body.style.overflow;
    const origElementBg = element.style.background;
    const origElementColor = element.style.color;
    const origTransform = element.style.transform;

    // Hide interactive controls but preserve layout (use visibility:hidden)
    const interactiveNodes = Array.from(element.querySelectorAll('button, input, select, textarea'));
    interactiveNodes.forEach(n => n.style.visibility = 'hidden');

    // Ensure element is in viewport and create a visible clone to capture
    const prevScrollY = window.scrollY;
    element.scrollIntoView({ behavior: 'auto', block: 'start' });

    // Prevent page scroll while exporting
    document.body.style.overflow = 'hidden';

    // Compute printable width in px and scale to fit margins (so content doesn't overflow)
    const pxPerMm = 96 / 25.4; // CSS px per mm at 96dpi
    const paperWidthMm = opts.paper === 'letter' ? 215.9 : 210;
    const printableMm = paperWidthMm - (2 * opts.marginMm);
    const printablePx = printableMm * pxPerMm;
    const origWidth = element.getBoundingClientRect().width || element.offsetWidth || 800;
    const scaleFactor = Math.min(1, printablePx / origWidth);

    // Create a clone and position it in the viewport (visible) so html2canvas can capture reliably
    const clone = element.cloneNode(true);
    // Hide interactive controls in clone
    Array.from(clone.querySelectorAll('button, input, select, textarea')).forEach(n => n.style.visibility = 'hidden');

    // Inline styles to make clone visible and non-intrusive
    clone.style.position = 'absolute';
    clone.style.left = '0px';
    clone.style.top = `${window.scrollY}px`;
    clone.style.margin = '0';
    clone.style.zIndex = 2147483647; // bring to front
    clone.style.transformOrigin = 'top left';
    clone.style.transform = `scale(${scaleFactor})`;
    // Ensure width is the original width so scaling matches layout
    clone.style.width = `${origWidth}px`;

    document.body.appendChild(clone);

    const html2canvasOpts = {
        scale: Math.max(1, opts.scale * (window.devicePixelRatio || 1)),
        useCORS: true
    };

    const pdfOptions = {
        margin: opts.marginMm,
        filename: `FinCalc-${elementId}-${new Date().getTime()}.pdf`,
        image: { type: 'png' },
        html2canvas: html2canvasOpts,
        jsPDF: { unit: 'mm', format: opts.paper, orientation: 'portrait' }
    };

    // Lightweight fallback: if canvases are tainted/blank for html2canvas, replace those canvases in the clone
    try {
        const chartMappings = {
            sipChart: 'sipChartObj',
            emiChart: 'emiChartObj',
            ciChart: 'ciChartObj',
            budgetChart: 'budgetChartObj',
            taxChart: 'taxChartObj'
        };

        const canvases = Array.from(clone.querySelectorAll('canvas'));
        canvases.forEach(canvas => {
            const id = canvas.id;
            try {
                const orig = document.getElementById(id);
                let ok = false;
                if (orig && typeof orig.toDataURL === 'function') {
                    try {
                        const data = orig.toDataURL('image/png');
                        if (data && data.length > 1000) ok = true;
                    } catch (e) {
                        ok = false;
                    }
                }

                if (!ok) {
                    const chartVar = chartMappings[id];
                    const chartObj = chartVar && window[chartVar];
                    if (chartObj && typeof chartObj.toBase64Image === 'function') {
                        const img = document.createElement('img');
                        img.src = chartObj.toBase64Image();
                        img.style.width = canvas.style.width || (canvas.width + 'px');
                        img.style.height = canvas.style.height || (canvas.height + 'px');
                        img.className = 'pdf-canvas-replacement';
                        canvas.parentNode.insertBefore(img, canvas.nextSibling);
                        canvas.style.display = 'none';
                    }
                }
            } catch (e) {
                // ignore per-canvas fallback errors
            }
        });

        // Pre-capture test: render the clone to a canvas first so we can detect blank/tainted captures
        let captureCanvas = null;
        try {
            captureCanvas = await html2canvas(clone, html2canvasOpts);
        } catch (e) {
            console.warn('html2canvas initial capture failed, will retry without scale:', e);
        }

        // If the capture produced a very small canvas (likely blank/tainted), retry with scale=1 and without transform
        if (!captureCanvas || (captureCanvas.width < 50 || captureCanvas.height < 50)) {
            try {
                // Temporarily remove transform on clone and capture again
                const prevTransform = clone.style.transform;
                clone.style.transform = '';
                const retryOpts = Object.assign({}, html2canvasOpts, { scale: 1 });
                captureCanvas = await html2canvas(clone, retryOpts);
                clone.style.transform = prevTransform || '';
            } catch (e) {
                console.warn('html2canvas retry failed:', e);
            }
        }

        if (captureCanvas && captureCanvas.width > 10 && captureCanvas.height > 10) {
            // Pass the canvas to html2pdf which will embed it into the PDF (handles paging)
            await html2pdf().from(captureCanvas).set(pdfOptions).save();
        } else {
            // As a last-resort, attempt direct element export (original approach)
            await html2pdf().from(clone).set(pdfOptions).save();
        }
    } catch (err) {
        console.error('PDF export error:', err);
        alert('Could not export PDF. Check console for details.');
    } finally {
        // Remove the clone
        if (clone && clone.parentNode) clone.parentNode.removeChild(clone);

        // Restore interactive elements on original
        interactiveNodes.forEach(n => n.style.visibility = '');

        // Restore styles, transforms and scroll
        element.style.background = origElementBg;
        element.style.color = origElementColor;
        element.style.transform = origTransform || '';
        document.body.style.overflow = origBodyOverflow;
        window.scrollTo(0, prevScrollY || 0);
    }
};


// --- Chart Helper Function ---
function updateChart(canvasId, chartObjInstance, labels, data, colors, varName, type = 'pie') {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (chartObjInstance) {
        chartObjInstance.destroy();
    }
    
    const newChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            ...chartOptions,
            cutout: type === 'doughnut' ? '70%' : '50%'
        }
    });

    // Update global reference
    if (varName === 'sipChartObj') sipChartObj = newChart;
    if (varName === 'emiChartObj') emiChartObj = newChart;
    if (varName === 'ciChartObj') ciChartObj = newChart;
    if (varName === 'budgetChartObj') budgetChartObj = newChart;
    if (varName === 'taxChartObj') taxChartObj = newChart;
}


// --- Auth Logic (Real API calls to /api) ---
const initAuth = () => {
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            document.getElementById(`${targetBtn.dataset.form}-form`).classList.add('active');
        });
    });

    // Login Handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                login(data.user, data.token);
            } else {
                loginError.textContent = data.error || "Login failed.";
            }
        } catch (error) {
            loginError.textContent = "Unable to connect to server.";
        }
    });

    // Signup Handler
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();
            
            if (response.ok) {
                if (data.user) {
                    login(data.user, data.token);
                } else {
                    // Email confirmation is pending
                    signupError.style.color = "#10b981"; // Success green
                    signupError.textContent = "Account created! Please check your email to verify.";
                    signupForm.reset();
                }
            } else {
                signupError.style.color = "#ef4444"; // Error red
                signupError.textContent = data.error || "Signup failed.";
            }
        } catch (error) {
            signupError.textContent = "Unable to connect to server.";
        }
    });

    // Logout Handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
    });

    const login = (user, token) => {
        currentUser = user;
        if (token) localStorage.setItem('auth_token', token);
        
        // UI Updates
        document.getElementById('user-display-name').textContent = user.name;
        overlay.classList.remove('active');
        appContainer.style.display = 'flex';
        appContainer.style.opacity = '0';
        setTimeout(() => {
            appContainer.style.transition = 'opacity 0.5s ease';
            appContainer.style.opacity = '1';
        }, 50);
        
        // Cleanup errors
        loginError.textContent = "";
        signupError.textContent = "";
        loginForm.reset();
        signupForm.reset();
        
        // Refresh charts now that container is visible
        calculateSIP();
        calculateEMI();
        calculateCI();
        calculateBudget();
        calculateTax();
    };

    const logout = () => {
        currentUser = null;
        localStorage.removeItem('auth_token');
        appContainer.style.display = 'none';
        overlay.classList.add('active');
    };

    // Check existing session via token verification
    const token = localStorage.getItem('auth_token');
    if (token) {
        fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                login(data.user, null); // Token is already stored
            } else {
                logout();
            }
        })
        .catch(() => logout());
    }
};

// Initialize all calculators on load
window.addEventListener('DOMContentLoaded', () => {
    // Chart.js global defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    
    initAuth();
    openViewFromQuery();
    updateDashboard();
});
