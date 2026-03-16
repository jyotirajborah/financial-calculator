
// [DEPRECATED] PDF export functions removed - use Excel export only
// The following functions are kept for backwards compatibility but are no longer used in the UI:
// - exportFromButton(elementId) - reads export settings and calls exportToPDF
// - serverExport(elementId) - server-side Puppeteer rendering (endpoint still available for legacy callers)
// - exportToPDF(elementId, options) - client-side html2pdf export
// 
// Please use exportToExcel(elementId) for data export instead.

// State Management
let currentUser = null;
let isGuestMode = false;

// Toast Notification System
function showToast(message, type = 'success') {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global auth tab switcher as backup
window.switchAuthTab = function(button, formType) {
    console.log('Backup switchAuthTab called:', formType);
    
    // Remove active from all tabs and forms
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    // Add active to clicked tab
    button.classList.add('active');
    
    // Show corresponding form
    const targetForm = formType === 'guest' 
        ? document.getElementById('guest-form')
        : document.getElementById(formType + '-form');
        
    if (targetForm) {
        targetForm.classList.add('active');
        console.log('Successfully switched to:', formType);
    } else {
        console.error('Target form not found:', formType);
    }
};

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
        showAlertModal('Excel export: unknown view', 'error');
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
    
    // Show success toast
    showToast('Excel file exported successfully!', 'success');
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

// Function to programmatically open a view
function openView(viewId) {
    const navBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.getAttribute('data-target') === viewId);
    if (navBtn) {
        navBtn.click();
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
        
        // Load timeline if target is timeline
        if (targetId === 'calc-timeline') {
            loadTimeline();
        }
        
        // Load finance news if target is finance news
        if (targetId === 'finance-news') {
            initNewsTab();
            loadFinanceNews();
        }
        
        // Initialize world clocks if target is world-clocks
        if (targetId === 'world-clocks') {
            initWorldClocks();
        }
        
        // Initialize whiteboard if target is whiteboard
        if (targetId === 'whiteboard') {
            // Delay initialization to ensure canvas is rendered
            setTimeout(() => {
                if (!whiteboardCanvas) {
                    initWhiteboard();
                }
            }, 100);
        }
        
        // Initialize market indices if target is market-indices
        if (targetId === 'market-indices') {
            initMarketIndices();
        }
        
        // Initialize country financial if target is country-financial
        if (targetId === 'country-financial') {
            initCountryFinancial();
        }
        
        // Initialize richest people if target is richest-people
        if (targetId === 'richest-people') {
            initRichestPeople();
        }
        
        // Initialize global poverty if target is global-poverty
        if (targetId === 'global-poverty') {
            initPovertyData();
        }
        
        // Initialize global crime if target is global-crime
        if (targetId === 'global-crime') {
            initCrimeData();
        }
        
        // Initialize media narrative if target is media-narrative
        if (targetId === 'media-narrative') {
            initMediaData();
        }
        
        // Initialize wealth transfer if target is wealth-transfer
        if (targetId === 'wealth-transfer') {
            initWealthTransferData();
        }
        
        // Initialize monopoly game if target is monopoly-game
        if (targetId === 'monopoly-game') {
            initGameTab();
        }
        
        // Initialize death clock if target is death-clock
        if (targetId === 'death-clock') {
            initDeathClock();
        }
        
        // Initialize notes if target is my notes
        if (targetId === 'my-notes') {
            initNotesSection();
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
    
    // Add subtle animation to results
    const resultElements = ['sip-invested', 'sip-returns', 'sip-total'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });
    
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
    
    // Add subtle animation to results
    const resultElements = ['emi-monthly', 'emi-principal', 'emi-interest', 'emi-total'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });
    
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
    
    // Add subtle animation to results
    const resultElements = ['ci-principal-res', 'ci-interest', 'ci-total'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });
    
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

    // Add subtle animation to results
    const resultElements = ['budget-needs', 'budget-wants', 'budget-savings', 'budget-investments'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });

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

    // Add subtle animation to results
    const resultElements = ['tax-payable', 'tax-taxable', 'tax-slab-tax', 'tax-cess', 'tax-effective-rate', 'tax-inhand', 'tax-monthly', 'tax-monthly-tax'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });

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
    
    // Add subtle animation to results
    const resultElements = ['nw-total-assets', 'nw-total-liabilities', 'nw-result-assets', 'nw-result-liabilities', 'nw-net-worth'];
    resultElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('result-updated');
            setTimeout(() => element.classList.remove('result-updated'), 600);
        }
    });
    
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
    const dashNetWorth = document.getElementById('dash-networth');
    if (nwNetWorth && dashNetWorth) dashNetWorth.textContent = nwNetWorth.textContent;

    const nwAssets = document.getElementById('nw-total-assets');
    const dashNwAssets = document.getElementById('dash-networth-assets');
    if (nwAssets && dashNwAssets) dashNwAssets.textContent = nwAssets.textContent;

    const nwLiabilities = document.getElementById('nw-total-liabilities');
    const dashNwLiabilities = document.getElementById('dash-networth-liabilities');
    if (nwLiabilities && dashNwLiabilities) dashNwLiabilities.textContent = nwLiabilities.textContent;
    
    // SIP: Total SIP Value
    const sipTotal = document.getElementById('sip-total');
    const dashSip = document.getElementById('dash-sip');
    if (dashSip) {
        if (sipTotal && sipTotal.textContent) {
            dashSip.textContent = sipTotal.textContent;
        } else {
            const sipAmount = document.getElementById('sip-amount');
            if (sipAmount) dashSip.textContent = '₹' + formatCurrency(parseFloat(sipAmount.value) || 0);
        }
    }

    const sipInvested = document.getElementById('sip-invested');
    const dashSipInvested = document.getElementById('dash-sip-invested');
    if (sipInvested && dashSipInvested) dashSipInvested.textContent = sipInvested.textContent;

    const sipReturns = document.getElementById('sip-returns');
    const dashSipReturns = document.getElementById('dash-sip-returns');
    if (sipReturns && dashSipReturns) dashSipReturns.textContent = sipReturns.textContent;

    // Compound Interest: Total Value
    const ciTotal = document.getElementById('ci-total');
    const dashCi = document.getElementById('dash-ci');
    if (ciTotal && dashCi) dashCi.textContent = ciTotal.textContent;
    
    const ciPrincipalRes = document.getElementById('ci-principal-res');
    const dashCiPrincipal = document.getElementById('dash-ci-principal');
    if (ciPrincipalRes && dashCiPrincipal) dashCiPrincipal.textContent = ciPrincipalRes.textContent;

    const ciInterest = document.getElementById('ci-interest');
    const dashCiInterest = document.getElementById('dash-ci-interest');
    if (ciInterest && dashCiInterest) dashCiInterest.textContent = ciInterest.textContent;

    // Budget: show income as the main number (so the card feels consistent with the split below)
    const dashBudget = document.getElementById('dash-budget');
    const budgetIncome = document.getElementById('budget-income');
    if (dashBudget && budgetIncome) {
        dashBudget.textContent = '\u20B9' + formatCurrency(parseFloat(budgetIncome.value) || 0);
    }
    
    const budgetNeeds = document.getElementById('budget-needs');
    const dashBudgetNeeds = document.getElementById('dash-budget-needs');
    if (budgetNeeds && dashBudgetNeeds) dashBudgetNeeds.textContent = budgetNeeds.textContent;

    const budgetWants = document.getElementById('budget-wants');
    const dashBudgetWants = document.getElementById('dash-budget-wants');
    if (budgetWants && dashBudgetWants) dashBudgetWants.textContent = budgetWants.textContent;

    const budgetSavings = document.getElementById('budget-savings');
    const dashBudgetSavings = document.getElementById('dash-budget-savings');
    if (budgetSavings && dashBudgetSavings) dashBudgetSavings.textContent = budgetSavings.textContent;

    const budgetInvestments = document.getElementById('budget-investments');
    const dashBudgetInvestments = document.getElementById('dash-budget-investments');
    if (budgetInvestments && dashBudgetInvestments) dashBudgetInvestments.textContent = budgetInvestments.textContent;

    const budgetPersona = document.getElementById('budget-persona');
    const dashBudgetPersona = document.getElementById('dash-budget-persona');
    if (dashBudgetPersona) {
        dashBudgetPersona.textContent = budgetPersona && budgetPersona.selectedOptions && budgetPersona.selectedOptions[0]
            ? budgetPersona.selectedOptions[0].textContent.trim()
            : '—';
    }

    // Annual Tax: Tax payable amount
    const annualTax = document.getElementById('tax-payable');
    const dashTax = document.getElementById('dash-tax');
    if (annualTax && dashTax) dashTax.textContent = annualTax.textContent;
    
    const taxTaxable = document.getElementById('tax-taxable');
    const dashTaxTaxable = document.getElementById('dash-tax-taxable');
    if (taxTaxable && dashTaxTaxable) dashTaxTaxable.textContent = taxTaxable.textContent;

    const taxSlab = document.getElementById('tax-slab-tax');
    const dashTaxSlab = document.getElementById('dash-tax-slab');
    if (taxSlab && dashTaxSlab) dashTaxSlab.textContent = taxSlab.textContent;

    const taxCess = document.getElementById('tax-cess');
    const dashTaxCess = document.getElementById('dash-tax-cess');
    if (taxCess && dashTaxCess) dashTaxCess.textContent = taxCess.textContent;

    const taxEffective = document.getElementById('tax-effective-rate');
    const dashTaxEffective = document.getElementById('dash-tax-effective');
    if (taxEffective && dashTaxEffective) dashTaxEffective.textContent = taxEffective.textContent;

    // Monthly EMI: EMI monthly payment
    const monthlyEMI = document.getElementById('emi-monthly');
    const dashEmi = document.getElementById('dash-emi');
    if (monthlyEMI && dashEmi) dashEmi.textContent = monthlyEMI.textContent;

    const emiInterest = document.getElementById('emi-interest');
    const dashEmiInterest = document.getElementById('dash-emi-interest');
    if (emiInterest && dashEmiInterest) dashEmiInterest.textContent = emiInterest.textContent;

    const emiTotal = document.getElementById('emi-total');
    const dashEmiTotal = document.getElementById('dash-emi-total');
    if (emiTotal && dashEmiTotal) dashEmiTotal.textContent = emiTotal.textContent;

    if (Array.isArray(window.__historyCache) && typeof updateDashboardHistory === 'function') {
        updateDashboardHistory(window.__historyCache);
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
function updateDashboardHistory(items) {
    const dashCount = document.getElementById('dash-history');
    const dashLast = document.getElementById('dash-history-last');
    const dashType = document.getElementById('dash-history-type');
    if (!dashCount && !dashLast && !dashType) return;

    const data = Array.isArray(items) ? items : [];
    if (dashCount) dashCount.textContent = String(data.length || 0);

    if (!data.length) {
        if (dashLast) dashLast.textContent = '—';
        if (dashType) dashType.textContent = '—';
        return;
    }

    const latest = data.reduce((acc, cur) => {
        if (!acc) return cur;
        const a = new Date(acc.created_at).getTime();
        const b = new Date(cur.created_at).getTime();
        return (b > a) ? cur : acc;
    }, null);

    const typeMap = {
        SIP: 'SIP Calculator',
        EMI: 'EMI Calculator',
        CI: 'Compound Interest',
        TAX: 'Tax Calculator',
        BUDGET: 'Budget Planner',
        NETWORTH: 'Net Worth'
    };

    if (dashType) {
        dashType.textContent = latest && latest.calc_type ? (typeMap[latest.calc_type] || latest.calc_type) : '—';
    }

    if (dashLast) {
        const ts = latest && latest.created_at ? new Date(latest.created_at) : null;
        if (ts && !isNaN(ts.getTime())) {
            dashLast.textContent = ts.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else {
            dashLast.textContent = '—';
        }
    }
}

function updateHistoryStats(items) {
    const totalCalcElement = document.getElementById('total-calculations');
    const mostUsedElement = document.getElementById('most-used-calc');
    const monthCalcElement = document.getElementById('month-calculations');

    if (!totalCalcElement || !mostUsedElement || !monthCalcElement) return;

    if (!Array.isArray(items) || items.length === 0) {
        totalCalcElement.textContent = '0';
        mostUsedElement.textContent = 'None';
        monthCalcElement.textContent = '0';
        return;
    }

    // Total calculations
    totalCalcElement.textContent = items.length;

    // Most used calculator
    const calcCounts = {};
    items.forEach(item => {
        calcCounts[item.calc_type] = (calcCounts[item.calc_type] || 0) + 1;
    });

    const mostUsed = Object.keys(calcCounts).reduce((a, b) => 
        calcCounts[a] > calcCounts[b] ? a : b
    );

    const typeMap = {
        'SIP': 'SIP Calculator',
        'EMI': 'EMI Calculator',
        'CI': 'Compound Interest',
        'BUDGET': 'Budget Planner',
        'TAX': 'Tax Calculator',
        'NETWORTH': 'Net Worth'
    };
    mostUsedElement.textContent = typeMap[mostUsed] || mostUsed;

    // This month's calculations
    const now = new Date();
    const thisMonth = items.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.getMonth() === now.getMonth() && 
               itemDate.getFullYear() === now.getFullYear();
    });
    monthCalcElement.textContent = thisMonth.length;
}

const saveCalculation = async (type, e) => {
    if (e) e.preventDefault();
    
    // Check if user is in guest mode
    if (isGuestMode) {
        if (confirm('You need to create an account or login to save calculations. Would you like to go to the login page?')) {
            logout();
        }
        return;
    }
    
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
    if (!token) {
        showAlertModal("Please login to save calculations.", 'warning');
        return;
    }

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
            loadHistory(); // refresh dashboard history summary
            updateDashboard();
        } else {
            const errData = await response.json();
            console.error("Save failed:", errData);
            showAlertModal(`Could not save: ${errData.error || 'Server error. Please check Supabase table setup.'}`, 'error');
        }
    } catch (error) {
        console.error("Network error saving history:", error);
        showAlertModal("Network error. Make sure the server is running.", 'error');
    }
};

const loadHistory = async () => {
    const timeline = document.getElementById('history-timeline');
    const token = localStorage.getItem('auth_token');
    
    console.log('Loading history timeline...', { timeline: !!timeline, token: !!token, isGuestMode });
    
    // Handle guest users
    if (isGuestMode || !token) {
        timeline.innerHTML = `
            <div class="guest-timeline-message">
                <ion-icon name="lock-closed-outline"></ion-icon>
                <h3>Timeline Locked</h3>
                <p>Create an account or login to save and view your financial planning timeline.</p>
                <button class="btn-primary" onclick="logout()">
                    <ion-icon name="log-in-outline"></ion-icon>
                    <span>Login / Sign Up</span>
                </button>
            </div>
        `;
        return;
    }

    timeline.innerHTML = '<div class="empty-timeline-msg">Loading your financial timeline...</div>';

    try {
        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        console.log('History data received:', data);

        window.__historyCache = Array.isArray(data) ? data : [];
        updateDashboardHistory(window.__historyCache);
        updateHistoryStats(window.__historyCache);
        
        if (!Array.isArray(data) || data.length === 0) {
            timeline.innerHTML = `
                <div class="empty-timeline-msg">
                    <ion-icon name="calculator" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></ion-icon>
                    <h3>No calculations found</h3>
                    <p>Start your financial planning journey by trying our calculators</p>
                    <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap;">
                        <button class="btn-primary" onclick="openView('sip-calculator')" style="display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="repeat"></ion-icon> Try SIP Calculator
                        </button>
                        <button class="btn-secondary" onclick="openView('emi-calculator')" style="display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="card"></ion-icon> Try EMI Calculator
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Create timeline line
        timeline.innerHTML = '<div class="timeline-line"></div>';
        
        console.log('Creating timeline items for', data.length, 'calculations');
        
        data.forEach((item, index) => {
            console.log('Processing item:', item);
            
            const div = document.createElement('div');
            div.className = 'timeline-item';
            
            let label = "";
            let subtext = "";
            let mainVal = "";
            let icon = "calculator";
            let description = "";
            
            if (item.calc_type === 'SIP') {
                label = "SIP Investment Plan";
                subtext = `₹${item.input_data.amount}/mo @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
                mainVal = item.result_data.total;
                icon = "repeat";
                description = `Systematic Investment Plan with ${item.input_data.rate}% annual return`;
            } else if (item.calc_type === 'EMI') {
                label = "EMI Calculation";
                subtext = `₹${item.input_data.amount} @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
                mainVal = item.result_data.monthly;
                icon = "card";
                description = `Monthly EMI at ${item.input_data.rate}% interest rate`;
            } else if (item.calc_type === 'CI') {
                label = "Compound Interest";
                subtext = `Principal: ₹${item.input_data.principal} @ ${item.input_data.rate}%`;
                mainVal = item.result_data.total;
                icon = "analytics";
                description = `Compound growth at ${item.input_data.rate}% annual return`;
            } else if (item.calc_type === 'BUDGET') {
                label = "Budget Planning";
                const persona = item.input_data.persona ? ` | Persona: ${item.input_data.persona}` : "";
                subtext = `Monthly Income: ₹${item.input_data.income}${persona}`;
                mainVal = item.result_data.investments || item.result_data.savings;
                icon = "wallet";
                description = "Personal budget allocation and savings plan";
            } else if (item.calc_type === 'TAX') {
                label = "Tax Calculation";
                subtext = `Income: ₹${item.input_data.income}`;
                mainVal = item.result_data.tax;
                icon = "receipt";
                description = `Tax liability calculation for the financial year`;
            } else if (item.calc_type === 'NETWORTH') {
                label = "Net Worth Assessment";
                subtext = `Assets: ${item.input_data.assets} | Liabilities: ${item.input_data.liabilities}`;
                mainVal = item.result_data.networth;
                icon = "diamond";
                description = "Complete financial portfolio analysis";
            }

            const date = new Date(item.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            
            const time = new Date(item.created_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            div.innerHTML = `
                <div class="timeline-marker">
                    <ion-icon name="${icon}"></ion-icon>
                </div>
                <div class="timeline-content">
                    <div class="timeline-item-header">
                        <h4 class="timeline-item-title">${label}</h4>
                        <span class="timeline-item-type">${item.calc_type}</span>
                    </div>
                    <div class="timeline-item-details">
                        <div class="timeline-item-info">
                            <p class="timeline-item-description">${description}</p>
                            <div class="timeline-item-meta">
                                <span><ion-icon name="calendar"></ion-icon> ${date}</span>
                                <span><ion-icon name="time"></ion-icon> ${time}</span>
                            </div>
                        </div>
                        <div class="timeline-item-value">
                            <span class="timeline-main-value">${mainVal}</span>
                            <div class="timeline-sub-value">${subtext}</div>
                        </div>
                    </div>
                    <div class="timeline-actions">
                        <button class="timeline-action-btn" onclick="deleteCalculation('${item.id}')" title="Delete calculation">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            `;
            
            timeline.appendChild(div);
        });
        
        console.log('Timeline created with', timeline.children.length, 'items');
    } catch (error) {
        window.__historyCache = [];
        updateDashboardHistory(window.__historyCache);
        updateHistoryStats(window.__historyCache);
        timeline.innerHTML = '<p class="empty-timeline-msg">Something went wrong while loading your timeline.</p>';
        console.error('Error loading history:', error);
    }
};

// --- Timeline (Detailed View) Logic ---
const loadTimeline = async () => {
    const timelineFeed = document.getElementById('timeline-feed');
    const token = localStorage.getItem('auth_token');
    
    console.log('Loading detailed timeline...', { timelineFeed: !!timelineFeed, token: !!token, isGuestMode });
    
    // Handle guest users
    if (isGuestMode || !token) {
        timelineFeed.innerHTML = `
            <div class="tl-empty-state">
                <ion-icon name="lock-closed-outline"></ion-icon>
                <h3>Timeline Locked</h3>
                <p>Create an account or login to save and view your detailed financial timeline.</p>
                <button class="btn-primary" onclick="logout()">
                    <ion-icon name="log-in-outline"></ion-icon>
                    <span>Login / Sign Up</span>
                </button>
            </div>
        `;
        return;
    }

    timelineFeed.innerHTML = '<div class="tl-empty-state"><p>Loading your detailed timeline...</p></div>';

    try {
        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        console.log('Timeline data received:', data);

        window.__timelineCache = Array.isArray(data) ? data : [];
        updateTimelineStats(window.__timelineCache);
        
        if (!Array.isArray(data) || data.length === 0) {
            timelineFeed.innerHTML = `
                <div class="tl-empty-state">
                    <ion-icon name="git-branch-outline"></ion-icon>
                    <h3>No calculations saved yet</h3>
                    <p>Save a calculation from any tool and it will appear here as a timeline entry.</p>
                    <button class="btn-primary" onclick="openView('sip-calculator')" style="margin-top: 1rem;">
                        <ion-icon name="repeat-outline"></ion-icon> Try SIP Calculator
                    </button>
                </div>
            `;
            return;
        }

        renderTimelineItems(data);
        setupTimelineFilters(data);
        
    } catch (error) {
        window.__timelineCache = [];
        updateTimelineStats(window.__timelineCache);
        timelineFeed.innerHTML = '<div class="tl-empty-state"><p>Something went wrong while loading your timeline.</p></div>';
        console.error('Error loading timeline:', error);
    }
};

const updateTimelineStats = (items) => {
    const totalCountElement = document.getElementById('tl-total-count');
    
    if (!Array.isArray(items) || items.length === 0) {
        if (totalCountElement) totalCountElement.textContent = '0 entries';
        
        // Reset all individual counters
        ['sip', 'emi', 'ci', 'budget', 'tax', 'networth'].forEach(type => {
            const element = document.getElementById(`tl-count-${type}`);
            if (element) element.textContent = '0';
        });
        return;
    }

    // Update total count
    if (totalCountElement) {
        totalCountElement.textContent = `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`;
    }

    // Count by calculator type
    const counts = {
        sip: 0, emi: 0, ci: 0, budget: 0, tax: 0, networth: 0
    };

    items.forEach(item => {
        const type = item.calc_type.toLowerCase();
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        }
    });

    // Update individual counters
    Object.keys(counts).forEach(type => {
        const element = document.getElementById(`tl-count-${type}`);
        if (element) element.textContent = counts[type].toString();
    });
};

const renderTimelineItems = (items, filter = 'all') => {
    const timelineFeed = document.getElementById('timeline-feed');
    
    // Filter items if needed
    const filteredItems = filter === 'all' ? items : items.filter(item => item.calc_type === filter);
    
    if (filteredItems.length === 0) {
        timelineFeed.innerHTML = `
            <div class="tl-empty-state">
                <ion-icon name="filter-outline"></ion-icon>
                <h3>No ${filter === 'all' ? '' : filter + ' '}calculations found</h3>
                <p>Try a different filter or save more calculations.</p>
            </div>
        `;
        return;
    }

    timelineFeed.innerHTML = '';
    
    filteredItems.forEach((item, index) => {
        const timelineItem = createTimelineItem(item, index);
        timelineFeed.appendChild(timelineItem);
    });
};

const createTimelineItem = (item, index) => {
    const div = document.createElement('div');
    div.className = 'tl-item';
    
    let label = "";
    let subtext = "";
    let mainVal = "";
    let icon = "calculator";
    let description = "";
    let color = "#3b82f6";
    
    if (item.calc_type === 'SIP') {
        label = "SIP Investment Plan";
        subtext = `₹${item.input_data.amount}/mo @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
        mainVal = item.result_data.total;
        icon = "repeat";
        description = `Systematic Investment Plan with ${item.input_data.rate}% annual return`;
        color = "#3b82f6";
    } else if (item.calc_type === 'EMI') {
        label = "EMI Calculation";
        subtext = `₹${item.input_data.amount} @ ${item.input_data.rate}% for ${item.input_data.time}yr`;
        mainVal = item.result_data.monthly;
        icon = "card";
        description = `Monthly EMI at ${item.input_data.rate}% interest rate`;
        color = "#8b5cf6";
    } else if (item.calc_type === 'CI') {
        label = "Compound Interest";
        subtext = `Principal: ₹${item.input_data.principal} @ ${item.input_data.rate}%`;
        mainVal = item.result_data.total;
        icon = "analytics";
        description = `Compound growth at ${item.input_data.rate}% annual return`;
        color = "#10b981";
    } else if (item.calc_type === 'BUDGET') {
        label = "Budget Planning";
        const persona = item.input_data.persona ? ` | ${item.input_data.persona}` : "";
        subtext = `Monthly Income: ₹${item.input_data.income}${persona}`;
        mainVal = item.result_data.investments || item.result_data.savings;
        icon = "wallet";
        description = "Personal budget allocation and savings plan";
        color = "#f59e0b";
    } else if (item.calc_type === 'TAX') {
        label = "Tax Calculation";
        subtext = `Income: ₹${item.input_data.income}`;
        mainVal = item.result_data.tax;
        icon = "receipt";
        description = `Tax liability calculation for the financial year`;
        color = "#ef4444";
    } else if (item.calc_type === 'NETWORTH') {
        label = "Net Worth Assessment";
        subtext = `Assets: ${item.input_data.assets} | Liabilities: ${item.input_data.liabilities}`;
        mainVal = item.result_data.networth;
        icon = "diamond";
        description = "Complete financial portfolio analysis";
        color = "#10b981";
    }

    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    const time = new Date(item.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    div.innerHTML = `
        <div class="tl-item-marker" style="background: ${color};">
            <ion-icon name="${icon}"></ion-icon>
        </div>
        <div class="tl-item-content">
            <div class="tl-item-header">
                <div class="tl-item-title-section">
                    <h4 class="tl-item-title">${label}</h4>
                    <p class="tl-item-description">${description}</p>
                </div>
                <div class="tl-item-meta">
                    <span class="tl-item-type" style="background: ${color}20; color: ${color};">${item.calc_type}</span>
                    <span class="tl-item-time">${date} • ${time}</span>
                </div>
            </div>
            <div class="tl-item-details">
                <div class="tl-item-params">
                    <p>${subtext}</p>
                </div>
                <div class="tl-item-result">
                    <span class="tl-result-value">${mainVal}</span>
                </div>
            </div>
            <div class="tl-item-actions">
                <button class="tl-action-btn" onclick="deleteCalculation('${item.id}')" title="Delete calculation">
                    <ion-icon name="trash-outline"></ion-icon>
                </button>
            </div>
        </div>
    `;
    
    return div;
};

const setupTimelineFilters = (items) => {
    const filterButtons = document.querySelectorAll('.tl-filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Add active to clicked button
            e.target.classList.add('active');
            
            // Get filter value and render filtered items
            const filter = e.target.getAttribute('data-filter');
            renderTimelineItems(items, filter);
        });
    });
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
            loadHistory(); // Refresh the history list
            if (document.getElementById('timeline-feed')) {
                loadTimeline(); // Refresh the timeline if it's loaded
            }
            updateDashboard(); // Refresh dashboard stats
            showAlertModal('Calculation deleted successfully!', 'success');
        } else {
            const errData = await response.json();
            showAlertModal(`Could not delete: ${errData.error}`, 'error');
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
    if (!element) {
        showAlertModal('Export failed: element not found', 'error');
        return;
    }

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
        showAlertModal('Could not export PDF. Check console for details.', 'error');
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

// Global authentication functions
const loginAsGuest = () => {
    isGuestMode = true;
    currentUser = { name: 'Guest', email: null };
    
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    
    // Update profile avatar for guest
    const guestIcon = document.getElementById('guest-icon');
    const userInitials = document.getElementById('user-initials');
    guestIcon.style.display = 'block';
    userInitials.style.display = 'none';
    overlay.classList.remove('active');
    appContainer.style.display = 'flex';
    appContainer.style.opacity = '0';
    setTimeout(() => {
        appContainer.style.transition = 'opacity 0.5s ease';
        appContainer.style.opacity = '1';
    }, 50);
    
    // Lock history section for guests
    const historySection = document.getElementById('calc-history');
    if (historySection) {
        historySection.classList.add('history-locked');
    }
    
    // Update save buttons to show login prompt for guests
    updateSaveButtonsForGuest();
    
    // Refresh charts now that container is visible
    calculateSIP();
    calculateEMI();
    calculateCI();
    calculateBudget();
    calculateTax();
};

const login = (user, token) => {
    console.log('🔐 LOGIN FUNCTION CALLED:', { user, token: !!token });
    
    if (!token) {
        console.error('❌ LOGIN FAILED: No token provided!');
        showAlertModal('Login failed: No authentication token received', 'error');
        return;
    }
    
    if (!user) {
        console.error('❌ LOGIN FAILED: No user data provided!');
        showAlertModal('Login failed: No user data received', 'error');
        return;
    }
    
    isGuestMode = false;
    currentUser = user;
    localStorage.setItem('auth_token', token);
    
    console.log('✅ Set isGuestMode to false, currentUser:', currentUser);
    console.log('✅ Stored auth_token in localStorage');
    
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    console.log('🔍 LOGIN ELEMENTS CHECK:', {
        overlay: !!overlay,
        appContainer: !!appContainer,
        overlayHasActive: overlay?.classList.contains('active'),
        appContainerDisplay: appContainer?.style.display
    });
    
    // Update profile avatar for logged-in user
    const guestIcon = document.getElementById('guest-icon');
    const userInitials = document.getElementById('user-initials');
    
    if (user && user.user_metadata?.name) {
        // Extract initials from user name
        const initials = user.user_metadata.name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2);
        if (userInitials) {
            userInitials.textContent = initials;
            console.log('👤 SET USER INITIALS:', initials);
        }
        
        if (guestIcon) guestIcon.style.display = 'none';
        if (userInitials) userInitials.style.display = 'block';
    } else if (user && user.email) {
        // Fallback to email initial
        const initial = user.email.charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initial;
            console.log('👤 SET USER INITIAL FROM EMAIL:', initial);
        }
        
        if (guestIcon) guestIcon.style.display = 'none';
        if (userInitials) userInitials.style.display = 'block';
    }
    
    // Hide auth overlay and show app
    if (overlay) {
        overlay.classList.remove('active');
        console.log('✅ REMOVED ACTIVE CLASS FROM OVERLAY');
    }
    
    if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.style.opacity = '0';
        console.log('✅ SET APP CONTAINER TO FLEX');
        
        setTimeout(() => {
            appContainer.style.transition = 'opacity 0.5s ease';
            appContainer.style.opacity = '1';
            console.log('✅ SET APP CONTAINER OPACITY TO 1');
        }, 50);
    }
    
    // Unlock history section
    const historySection = document.getElementById('calc-history');
    if (historySection) {
        historySection.classList.remove('history-locked');
        console.log('✅ UNLOCKED HISTORY SECTION');
    }
    
    // Restore normal save buttons
    updateSaveButtonsForUser();
    
    // Cleanup errors
    if (loginError) loginError.textContent = "";
    if (signupError) signupError.textContent = "";
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    
    console.log('🎉 LOGIN FUNCTION COMPLETED SUCCESSFULLY');
    console.log('📊 Final state - isGuestMode:', isGuestMode, 'currentUser:', currentUser);
    
    // Show success message
    setTimeout(() => {
        showToast('Login successful! Welcome to FinCalc', 'success');
    }, 500);
    
    // Refresh charts now that container is visible
    calculateSIP();
    calculateEMI();
    calculateCI();
    calculateBudget();
    calculateTax();
};

const logout = () => {
    console.log('🚪 Logout initiated');
    
    isGuestMode = false;
    currentUser = null;
    localStorage.removeItem('auth_token');
    
    console.log('✅ Cleared auth state and token');
    
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    
    if (!overlay || !appContainer) {
        console.error('❌ Auth elements not found');
        // Force page reload as fallback
        window.location.reload();
        return;
    }
    
    // Hide app container
    appContainer.style.display = 'none';
    appContainer.style.opacity = '0';
    
    // Show auth overlay
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    
    console.log('✅ Toggled overlay and app container');
    
    // Reset profile to guest icon
    const guestIcon = document.getElementById('guest-icon');
    const userInitials = document.getElementById('user-initials');
    if (guestIcon) guestIcon.style.display = 'block';
    if (userInitials) userInitials.style.display = 'none';
    
    // Reset to login tab
    const loginTab = document.querySelector('.auth-tab[data-form="login"]');
    const loginForm = document.getElementById('login-form');
    
    if (loginTab && loginForm) {
        document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        loginTab.classList.add('active');
        loginForm.classList.add('active');
        console.log('✅ Reset to login tab');
    } else {
        console.error('❌ Login tab/form not found');
    }
    
    // Clear any form data
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    if (loginEmailInput) loginEmailInput.value = '';
    if (loginPasswordInput) loginPasswordInput.value = '';
    
    console.log('🎉 Logout complete');
};

// Update save buttons for guest users
const updateSaveButtonsForGuest = () => {
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.innerHTML = '<ion-icon name="log-in-outline"></ion-icon> Login to Save';
        btn.onclick = (e) => {
            e.preventDefault();
            showLoginPrompt();
        };
    });
};

// Restore save buttons for logged-in users
const updateSaveButtonsForUser = () => {
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.innerHTML = '<ion-icon name="bookmark-outline"></ion-icon> Save to History';
        // Restore original onclick handlers
        const calcType = btn.closest('.calculator-view').id;
        if (calcType.includes('sip')) {
            btn.onclick = (e) => saveCalculation('SIP', e);
        } else if (calcType.includes('emi')) {
            btn.onclick = (e) => saveCalculation('EMI', e);
        } else if (calcType.includes('ci')) {
            btn.onclick = (e) => saveCalculation('CI', e);
        } else if (calcType.includes('budget')) {
            btn.onclick = (e) => saveCalculation('BUDGET', e);
        } else if (calcType.includes('tax')) {
            btn.onclick = (e) => saveCalculation('TAX', e);
        } else if (calcType.includes('net-worth')) {
            btn.onclick = (e) => saveCalculation('NETWORTH', e);
        }
    });
};

// Show login prompt for guest users
const showLoginPrompt = () => {
    showLoginPromptModal(
        'You need to create an account or login to save calculations. Would you like to go to the login page?',
        () => {
            logout();
        }
    );
};

// Make functions globally accessible for HTML onclick handlers
window.loginAsGuest = loginAsGuest;
window.login = login;
window.logout = logout;
window.showLoginPrompt = showLoginPrompt;

// Custom confirmation modal functions
let confirmationCallback = null;

window.showConfirmationModal = (message, callback) => {
    const modal = document.getElementById('confirmation-modal');
    const messageElement = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    messageElement.textContent = message;
    confirmationCallback = callback;
    
    // Remove existing event listener and add new one
    confirmBtn.onclick = () => {
        if (confirmationCallback) {
            confirmationCallback();
            confirmationCallback = null;
        }
        closeConfirmationModal();
    };
    
    modal.classList.add('active');
    
    // Close on escape key
    document.addEventListener('keydown', handleConfirmationEscape);
};

window.closeConfirmationModal = () => {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('active');
    confirmationCallback = null;
    document.removeEventListener('keydown', handleConfirmationEscape);
};

const handleConfirmationEscape = (e) => {
    if (e.key === 'Escape') {
        closeConfirmationModal();
    }
};

// Custom alert modal functions
window.showAlertModal = (message, type = 'info', title = null) => {
    const modal = document.getElementById('alert-modal');
    const messageElement = document.getElementById('alert-message');
    const titleElement = document.getElementById('alert-title');
    const iconElement = document.getElementById('alert-icon');
    
    messageElement.textContent = message;
    
    // Set icon and title based on type
    switch (type) {
        case 'error':
            iconElement.name = 'alert-circle';
            iconElement.className = 'error-icon';
            titleElement.textContent = title || 'Error';
            break;
        case 'success':
            iconElement.name = 'checkmark-circle';
            iconElement.className = 'success-icon';
            titleElement.textContent = title || 'Success';
            break;
        case 'warning':
            iconElement.name = 'warning';
            iconElement.className = 'warning-icon';
            titleElement.textContent = title || 'Warning';
            break;
        default:
            iconElement.name = 'information-circle';
            iconElement.className = 'info-icon';
            titleElement.textContent = title || 'Information';
    }
    
    modal.classList.add('active');
    
    // Close on escape key
    document.addEventListener('keydown', handleAlertEscape);
};

window.closeAlertModal = () => {
    const modal = document.getElementById('alert-modal');
    modal.classList.remove('active');
    document.removeEventListener('keydown', handleAlertEscape);
};

const handleAlertEscape = (e) => {
    if (e.key === 'Escape') {
        closeAlertModal();
    }
};

// Custom login prompt modal functions
let loginPromptCallback = null;

window.showLoginPromptModal = (message, callback) => {
    const modal = document.getElementById('login-prompt-modal');
    const messageElement = document.getElementById('login-prompt-message');
    const loginBtn = document.getElementById('login-prompt-btn');
    
    messageElement.textContent = message;
    loginPromptCallback = callback;
    
    // Remove existing event listener and add new one
    loginBtn.onclick = () => {
        if (loginPromptCallback) {
            loginPromptCallback();
            loginPromptCallback = null;
        }
        closeLoginPromptModal();
    };
    
    modal.classList.add('active');
    
    // Close on escape key
    document.addEventListener('keydown', handleLoginPromptEscape);
};

window.closeLoginPromptModal = () => {
    const modal = document.getElementById('login-prompt-modal');
    modal.classList.remove('active');
    loginPromptCallback = null;
    document.removeEventListener('keydown', handleLoginPromptEscape);
};

const handleLoginPromptEscape = (e) => {
    if (e.key === 'Escape') {
        closeLoginPromptModal();
    }
};

// Forgot Password Modal Functions
window.showForgotPasswordModal = () => {
    const modal = document.getElementById('forgot-password-modal');
    const emailInput = document.getElementById('forgot-email');
    const errorElement = document.getElementById('forgot-error');
    
    // Clear previous values
    emailInput.value = '';
    errorElement.textContent = '';
    
    modal.classList.add('active');
    
    // Focus on email input
    setTimeout(() => emailInput.focus(), 100);
    
    // Close on escape key
    document.addEventListener('keydown', handleForgotPasswordEscape);
};

window.closeForgotPasswordModal = () => {
    const modal = document.getElementById('forgot-password-modal');
    modal.classList.remove('active');
    document.removeEventListener('keydown', handleForgotPasswordEscape);
};

const handleForgotPasswordEscape = (e) => {
    if (e.key === 'Escape') {
        closeForgotPasswordModal();
    }
};

window.sendPasswordReset = async () => {
    const emailInput = document.getElementById('forgot-email');
    const errorElement = document.getElementById('forgot-error');
    const sendBtn = document.getElementById('send-reset-btn');
    
    const email = emailInput.value.trim();
    
    if (!email) {
        errorElement.textContent = 'Please enter your email address.';
        return;
    }
    
    // Show loading state
    const originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<ion-icon name="sync"></ion-icon> Sending...';
    sendBtn.disabled = true;
    errorElement.textContent = '';
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeForgotPasswordModal();
            showAlertModal(
                'Password reset link has been sent to your email. Please check your inbox (and spam folder).',
                'success',
                'Reset Link Sent'
            );
        } else {
            errorElement.textContent = data.error || 'Failed to send reset link.';
        }
    } catch (error) {
        console.error('Password reset error:', error);
        errorElement.textContent = 'Network error. Please try again.';
    } finally {
        // Restore button state
        sendBtn.innerHTML = originalText;
        sendBtn.disabled = false;
    }
};

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const confirmationModal = document.getElementById('confirmation-modal');
    const alertModal = document.getElementById('alert-modal');
    const loginPromptModal = document.getElementById('login-prompt-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    
    if (e.target === confirmationModal) {
        closeConfirmationModal();
    } else if (e.target === alertModal) {
        closeAlertModal();
    } else if (e.target === loginPromptModal) {
        closeLoginPromptModal();
    } else if (e.target === forgotPasswordModal) {
        closeForgotPasswordModal();
    }
});

// Custom dropdown functions for sticky notes
window.toggleStickyDropdown = () => {
    const dropdown = document.getElementById('sticky-category-dropdown');
    dropdown.classList.toggle('open');
    
    // Close dropdown when clicking outside
    if (dropdown.classList.contains('open')) {
        document.addEventListener('click', closeStickyDropdownOutside);
    } else {
        document.removeEventListener('click', closeStickyDropdownOutside);
    }
};

window.selectStickyCategory = (value, text) => {
    document.getElementById('sticky-selected-text').textContent = text;
    document.getElementById('sticky-category-dropdown').classList.remove('open');
    document.removeEventListener('click', closeStickyDropdownOutside);
    
    // Re-render sticky notes with the new filter
    renderStickyNotes();
};

const closeStickyDropdownOutside = (event) => {
    const dropdown = document.getElementById('sticky-category-dropdown');
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
        document.removeEventListener('click', closeStickyDropdownOutside);
    }
};

initAuth = () => {
    console.log('Initializing authentication...'); // Debug log
    
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const guestForm = document.getElementById('guest-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    
    console.log('Auth elements found:', {
        overlay: !!overlay,
        appContainer: !!appContainer,
        loginForm: !!loginForm,
        signupForm: !!signupForm,
        guestForm: !!guestForm,
        loginError: !!loginError,
        signupError: !!signupError
    }); // Debug log
    
    if (!overlay || !appContainer || !loginForm || !signupForm) {
        console.error('Critical auth elements missing!');
        return;
    }
    
    // Tab switching - only set up if not already handled by fallback
    const authTabs = document.querySelectorAll('.auth-tab');
    console.log('Found auth tabs:', authTabs.length); // Debug log
    
    // Check if tabs already have event listeners (from fallback)
    let hasExistingListeners = false;
    authTabs.forEach(tab => {
        if (tab._hasAuthListener) {
            hasExistingListeners = true;
        }
    });
    
    if (!hasExistingListeners) {
        console.log('Setting up main auth tab handlers...');
        authTabs.forEach((btn, index) => {
            console.log(`Setting up main tab ${index}:`, btn.dataset.form); // Debug log
            btn.addEventListener('click', (e) => {
                console.log('Main tab clicked:', e.currentTarget.dataset.form); // Debug log
                
                document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                const targetBtn = e.currentTarget;
                targetBtn.classList.add('active');
                const targetForm = targetBtn.dataset.form;
                
                console.log('Switching to form:', targetForm); // Debug log
                
                if (targetForm === 'guest') {
                    if (guestForm) {
                        guestForm.classList.add('active');
                    } else {
                        console.error('Guest form not found!');
                    }
                } else {
                    const formElement = document.getElementById(`${targetForm}-form`);
                    if (formElement) {
                        formElement.classList.add('active');
                    } else {
                        console.error(`Form ${targetForm}-form not found!`);
                    }
                }
            });
            btn._hasAuthListener = true; // Mark as having listener
        });
    } else {
        console.log('Auth tabs already have listeners from fallback');
    }

    // Guest Continue Handler
    const guestContinueBtn = document.getElementById('guest-continue-btn');
    if (guestContinueBtn) {
        guestContinueBtn.addEventListener('click', () => {
            console.log('Guest continue clicked'); // Debug log
            loginAsGuest();
        });
    } else {
        console.error('Guest continue button not found!');
    }

    // Login Handler
    if (loginForm) {
        console.log('Setting up login form handler'); // Debug log
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted'); // Debug log
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            console.log('Login attempt for email:', email); // Debug log
            
            // Clear previous errors
            if (loginError) loginError.textContent = "";
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<ion-icon name="sync"></ion-icon> Signing In...';
            submitBtn.disabled = true;
            
            try {
                console.log('Sending login request to /api/login'); // Debug log
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                console.log('Login response status:', response.status); // Debug log
                const data = await response.json();
                console.log('Login response data:', data); // Debug log
                
                if (response.ok) {
                    console.log('Login successful, calling login function'); // Debug log
                    // Extract token from session
                    const token = data.session?.access_token;
                    login(data.user, token);
                } else {
                    console.error('Login failed:', data.error); // Debug log
                    if (loginError) loginError.textContent = data.error || "Login failed.";
                }
            } catch (error) {
                console.error('Login network error:', error); // Debug log
                if (loginError) loginError.textContent = "Unable to connect to server. Make sure the server is running.";
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    } else {
        console.error('Login form not found!');
    }

    // Signup Handler
    if (signupForm) {
        console.log('Setting up signup form handler'); // Debug log
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Signup form submitted'); // Debug log
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            
            console.log('Signup attempt for:', { name, email }); // Debug log
            
            // Clear previous errors
            if (signupError) {
                signupError.textContent = "";
                signupError.style.color = "#ef4444"; // Reset to error color
            }
            
            // Show loading state
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<ion-icon name="sync"></ion-icon> Creating Account...';
            submitBtn.disabled = true;
            
            try {
                console.log('Sending signup request to /api/signup'); // Debug log
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                
                console.log('Signup response status:', response.status); // Debug log
                const data = await response.json();
                console.log('Signup response data:', data); // Debug log
                
                if (response.ok) {
                    if (data.user) {
                        console.log('Signup successful with auto-login'); // Debug log
                        // Extract token from session
                        const token = data.session?.access_token;
                        login(data.user, token);
                    } else {
                        console.log('Signup successful, email verification required'); // Debug log
                        // Email confirmation is pending
                        if (signupError) {
                            signupError.style.color = "#10b981"; // Success green
                            signupError.textContent = "Account created! Please check your email to verify.";
                        }
                        signupForm.reset();
                    }
                } else {
                    console.error('Signup failed:', data.error); // Debug log
                    if (signupError) {
                        signupError.style.color = "#ef4444"; // Error red
                        signupError.textContent = data.error || "Signup failed.";
                    }
                }
            } catch (error) {
                console.error('Signup network error:', error); // Debug log
                if (signupError) signupError.textContent = "Unable to connect to server. Make sure the server is running.";
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    } else {
        console.error('Signup form not found!');
    }

    // Logout Handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
    });

    // Check existing session via token verification
    const token = localStorage.getItem('auth_token');
    if (token) {
        console.log('Found existing token, verifying...'); // Debug log
        fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            console.log('Token verification response status:', res.status); // Debug log
            return res.json();
        })
        .then(data => {
            console.log('Token verification data:', data); // Debug log
            if (data.user) {
                console.log('Token valid, logging in user'); // Debug log
                login(data.user, null); // Token is already stored
            } else {
                console.log('Token invalid, logging out'); // Debug log
                logout();
            }
        })
        .catch((error) => {
            console.error('Token verification error:', error); // Debug log
            logout();
        });
    } else {
        console.log('No existing token found'); // Debug log
    }
    
    // Test server connectivity
    fetch('/api/verify', { method: 'GET' })
        .then(res => {
            console.log('Server connectivity test - status:', res.status);
            if (res.status === 401) {
                console.log('Server is running and responding (401 expected without token)');
            }
        })
        .catch(error => {
            console.error('Server connectivity test failed:', error);
            console.error('Make sure the server is running on the correct port');
        });
};

// ---- PROJECTION CALCULATOR ----

let projRisk = 'moderate';

const RISK_RATES = {
    conservative: { rate: 0.08, label: 'Conservative · 8% p.a.', alloc: 0.10 },
    moderate:     { rate: 0.12, label: 'Moderate · 12% p.a.',    alloc: 0.20 },
    aggressive:   { rate: 0.15, label: 'Aggressive · 15% p.a.',  alloc: 0.30 },
};

function calculateProjection() {
    const income     = parseFloat(document.getElementById('proj-income').value)   || 0;
    const expenses   = parseFloat(document.getElementById('proj-expenses').value) || 0;
    const existingEMI = parseFloat(document.getElementById('proj-emi').value)     || 0;
    const debt       = parseFloat(document.getElementById('proj-debt').value)     || 0;
    const horizon    = parseFloat(document.getElementById('proj-horizon').value)  || 10;
    const riskCfg    = RISK_RATES[projRisk];

    const disposable = income - expenses - existingEMI;
    const n = horizon * 12;

    // SIP projection
    const sipAmt = Math.max(0, Math.round(disposable * riskCfg.alloc));
    const r      = riskCfg.rate / 12;
    const sipCorpus   = sipAmt > 0 ? sipAmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : 0;
    const sipInvested = sipAmt * n;
    const sipReturns  = sipCorpus - sipInvested;

    // EMI capacity (max 40% of income minus existing EMIs)
    const maxEMI   = Math.max(0, income * 0.4 - existingEMI);
    const emiRate  = 0.085 / 12;
    const emiMonths = 20 * 12;
    const maxLoan  = maxEMI > 0 ? maxEMI * (1 - Math.pow(1 + emiRate, -emiMonths)) / emiRate : 0;
    const emiRatioPct = income > 0 ? (existingEMI / income) * 100 : 0;

    // Savings growth (20% of income at 7% compounded monthly)
    const monthlySavings = income * 0.20;
    const ciRate = 0.07 / 12;
    const ciCorpus = monthlySavings > 0
        ? monthlySavings * ((Math.pow(1 + ciRate, n) - 1) / ciRate) * (1 + ciRate)
        : 0;
    const emergencyFund = expenses * 6;

    // Budget 50/30/20
    const needs50   = income * 0.50;
    const wants30   = income * 0.30;
    const savings20 = income * 0.20;

    // Debt payoff (30% of disposable income toward debt at 10% p.a.)
    let debtPayment = 0, debtMonths = 0, totalDebtInterest = 0;
    if (debt > 0) {
        const dRate = 0.10 / 12;
        debtPayment = Math.round(Math.max(disposable * 0.3, debt * dRate * 1.05));
        const minPmt = debt * dRate;
        if (debtPayment > minPmt) {
            const monthsCalc = Math.log(debtPayment / (debtPayment - debt * dRate)) / Math.log(1 + dRate);
            debtMonths = Math.ceil(monthsCalc);
            // Cap at 600 months (50 years) for display purposes
            if (debtMonths > 600 || !isFinite(debtMonths)) {
                debtMonths = -1;
            } else {
                totalDebtInterest = debtPayment * debtMonths - debt;
            }
        } else {
            debtMonths = -1;
        }
    }

    const R = '₹';
    const fc = formatCurrency;

    // Key metrics row
    setText('proj-res-disposable', (disposable >= 0 ? R : '-' + R) + fc(Math.abs(Math.round(disposable))));
    setText('proj-res-sip',        R + fc(sipAmt));
    setText('proj-res-corpus',     R + fc(Math.round(sipCorpus)));

    // SIP card
    setText('proj-sip-tag',      riskCfg.label);
    setText('proj-sip-amount',   R + fc(sipAmt));
    setText('proj-sip-invested', R + fc(Math.round(sipInvested)));
    setText('proj-sip-returns',  R + fc(Math.round(sipReturns)));
    setText('proj-sip-corpus',   R + fc(Math.round(sipCorpus)));
    setText('proj-sip-tip', sipAmt > 0
        ? `Investing ${R}${fc(sipAmt)}/month at ${riskCfg.rate * 100}% p.a. can grow your wealth to ${R}${fc(Math.round(sipCorpus))} in ${horizon} years.`
        : 'Reduce expenses or EMIs to free up income for SIP investments.');

    // EMI card
    setText('proj-emi-max',    R + fc(Math.round(maxEMI)));
    setText('proj-emi-loan',   R + fc(Math.round(maxLoan)));
    setText('proj-emi-burden', R + fc(existingEMI));
    const ratioEl = document.getElementById('proj-emi-ratio');
    if (ratioEl) {
        ratioEl.textContent = emiRatioPct.toFixed(1) + '%';
        ratioEl.style.color = emiRatioPct > 40 ? '#ef4444' : emiRatioPct > 25 ? '#f59e0b' : '#10b981';
    }
    setText('proj-emi-tip', emiRatioPct > 40
        ? 'Your EMI burden exceeds 40% of income. Prioritise paying down existing debt before taking new loans.'
        : emiRatioPct > 25
        ? 'EMI burden is moderate. You can take new loans cautiously.'
        : 'Healthy EMI ratio — good capacity for additional loans if needed.');

    // Savings / CI card
    setText('proj-ci-monthly',   R + fc(Math.round(monthlySavings)));
    setText('proj-ci-annual',    R + fc(Math.round(monthlySavings * 12)));
    setText('proj-ci-corpus',    R + fc(Math.round(ciCorpus)));
    setText('proj-ci-emergency', R + fc(Math.round(emergencyFund)));
    const emMonths = monthlySavings > 0 ? Math.ceil(emergencyFund / monthlySavings) : 0;
    setText('proj-ci-tip', emMonths > 0
        ? `Build your emergency fund of ${R}${fc(Math.round(emergencyFund))} first. At a 20% savings rate you'll reach it in ~${emMonths} months.`
        : 'Start saving to build a 6-month emergency fund.');

    // Budget card
    setText('proj-budget-needs',   R + fc(Math.round(needs50)));
    setText('proj-budget-wants',   R + fc(Math.round(wants30)));
    setText('proj-budget-savings', R + fc(Math.round(savings20)));
    const actualEl = document.getElementById('proj-budget-actual');
    if (actualEl) {
        actualEl.textContent = (disposable >= 0 ? R : '-' + R) + fc(Math.abs(Math.round(disposable)));
        actualEl.style.color = disposable >= savings20 ? '#10b981' : disposable < 0 ? '#ef4444' : '#f59e0b';
    }
    setText('proj-budget-tip', disposable < 0
        ? 'Your expenses exceed your income. Review fixed costs and cut spending urgently.'
        : disposable >= savings20
        ? `You save ${R}${fc(Math.round(disposable))}/month — exceeding the 20% savings goal.`
        : `Try to reach the 20% savings target of ${R}${fc(Math.round(savings20))}/month.`);

    // Debt card
    const debtCard = document.getElementById('proj-debt-card');
    if (debtCard) {
        debtCard.style.display = debt > 0 ? '' : 'none';
        if (debt > 0) {
            setText('proj-debt-total',    R + fc(debt));
            setText('proj-debt-payment',  R + fc(debtPayment));
            setText('proj-debt-interest', totalDebtInterest > 0 ? R + fc(Math.round(totalDebtInterest)) : '—');
            setText('proj-debt-months',   debtMonths === -1 ? 'Cannot pay off at this rate' : debtMonths > 0 ? `${debtMonths} months` : '—');
            setText('proj-debt-tip', debtMonths === -1
                ? 'Payment is too low to cover interest. Increase EMI allocation to eliminate debt.'
                : `Paying ${R}${fc(debtPayment)}/month clears your debt in ${debtMonths} months.`);
        }
    }

    // Update dashboard projection card
    updateProjectionDashCard(income, disposable, sipAmt, sipCorpus, maxEMI);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateProjectionDashCard(income, disposable, sipAmt, sipCorpus, maxEMI) {
    const card = document.getElementById('dash-projection-card');
    if (!card) return;
    if (income > 0) {
        card.style.display = '';
        setText('dash-projection-disposable', '₹' + formatCurrency(Math.max(0, Math.round(disposable))));
        setText('dash-proj-sip',    '₹' + formatCurrency(sipAmt));
        setText('dash-proj-corpus', '₹' + formatCurrency(Math.round(sipCorpus)));
        setText('dash-proj-emi',    '₹' + formatCurrency(Math.round(maxEMI)));
    } else {
        card.style.display = 'none';
    }
}

function initProjection() {
    // Sync range inputs with number inputs
    ['proj-income', 'proj-expenses', 'proj-emi', 'proj-debt', 'proj-horizon'].forEach(id => {
        const input = document.getElementById(id);
        const range = document.getElementById(id + '-range');
        if (!input || !range) return;
        input.addEventListener('input', () => { range.value = input.value; calculateProjection(); });
        range.addEventListener('input', () => { input.value = range.value; calculateProjection(); });
    });

    // Risk profile buttons
    document.querySelectorAll('.risk-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            projRisk = btn.getAttribute('data-risk');
            calculateProjection();
        });
    });

    calculateProjection();
}

// Initialize all calculators on load
window.addEventListener('DOMContentLoaded', () => {
    console.log('=== FinCalc App Starting ===');
    
    // Check URL parameters for login redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.toString() === '' && window.location.pathname === '/') {
        // This might be a redirect after login, check for auth token
        const authToken = localStorage.getItem('auth_token');
        if (authToken) {
            console.log('🔄 Detected potential login redirect, checking token...');
        }
    }
    
    // Check if user is already logged in
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        console.log('🔑 Found existing auth token, attempting auto-login...');
        // Try to verify the token and auto-login
        fetch('/api/verify', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(response => {
            if (!response.ok) {
                console.log('❌ Token verification failed with status:', response.status);
                localStorage.removeItem('auth_token');
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.user) {
                console.log('✅ Auto-login successful:', data.user);
                login(data.user, authToken);
            } else if (data) {
                console.log('❌ Token invalid, clearing...');
                localStorage.removeItem('auth_token');
            }
        })
        .catch(err => {
            console.log('❌ Auto-login failed:', err);
            localStorage.removeItem('auth_token');
        });
    }
    
    // Initialize profile avatar for guest state (default)
    const guestIcon = document.getElementById('guest-icon');
    const userInitials = document.getElementById('user-initials');
    console.log('Profile elements found:', { guestIcon: !!guestIcon, userInitials: !!userInitials });
    
    if (guestIcon && userInitials) {
        guestIcon.style.display = 'block';
        userInitials.style.display = 'none';
    }
    
    // Chart.js global defaults (guarded so auth still works if Chart fails to load)
    try {
        if (window.Chart && Chart.defaults) {
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.font.family = "'Outfit', sans-serif";
            console.log('Chart.js defaults set successfully');
        } else {
            console.warn('Chart.js not available');
        }
    } catch (err) {
        console.error('Chart.js not available, continuing without chart defaults:', err);
    }
    
    console.log('Initializing components...');
    try {
        initAuth();
        console.log('Auth initialized');
    } catch (err) {
        console.error('Auth initialization failed:', err);
    }
    
    try {
        initProjection();
        console.log('Projection initialized');
    } catch (err) {
        console.error('Projection initialization failed:', err);
    }
    
    try {
        openViewFromQuery();
        console.log('View from query opened');
    } catch (err) {
        console.error('View from query failed:', err);
    }
    
    try {
        updateDashboard();
        console.log('Dashboard updated');
    } catch (err) {
        console.error('Dashboard update failed:', err);
    }
    
    console.log('=== FinCalc App Initialization Complete ===');
    
    // Welcome toast will be shown after successful login/guest access
    // (moved to login() and loginAsGuest() functions)
    
    // Add keyboard shortcuts for better UX
    document.addEventListener('keydown', (e) => {
        // Alt + 1-9 for quick navigation
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const navItems = document.querySelectorAll('.nav-item');
            const index = parseInt(e.key) - 1;
            if (navItems[index]) {
                navItems[index].click();
                showToast(`Switched to ${navItems[index].querySelector('span').textContent}`, 'success');
            }
        }
        
        // Ctrl/Cmd + S to save current calculation (if logged in)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const activeView = document.querySelector('.calculator-view.active');
            if (activeView && !isGuestMode) {
                const saveBtn = activeView.querySelector('.btn-save');
                if (saveBtn) {
                    saveBtn.click();
                    showToast('Calculation saved using keyboard shortcut!', 'success');
                }
            } else if (isGuestMode) {
                showToast('Please login to save calculations', 'error');
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal();
            }
        }
    });
    
    // Add event listener for news category change
    const categorySelect = document.getElementById('news-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', loadFinanceNews);
    }
});

// --- World Clocks Functions ---
let clockInterval = null;

const worldClocks = [
    { city: 'New York', timezone: 'America/New_York', icon: 'business', market: 'NYSE' },
    { city: 'London', timezone: 'Europe/London', icon: 'business', market: 'LSE' },
    { city: 'Tokyo', timezone: 'Asia/Tokyo', icon: 'business', market: 'TSE' },
    { city: 'Hong Kong', timezone: 'Asia/Hong_Kong', icon: 'business', market: 'HKEX' },
    { city: 'Mumbai', timezone: 'Asia/Kolkata', icon: 'business', market: 'NSE' },
    { city: 'Singapore', timezone: 'Asia/Singapore', icon: 'business', market: 'SGX' },
    { city: 'Sydney', timezone: 'Australia/Sydney', icon: 'business', market: 'ASX' },
    { city: 'Dubai', timezone: 'Asia/Dubai', icon: 'business', market: 'DFM' }
];

const initWorldClocks = () => {
    const clocksGrid = document.getElementById('clocks-grid');
    const calendarsGrid = document.getElementById('calendars-grid');
    
    if (!clocksGrid || !calendarsGrid) return;
    
    // Clear any existing interval
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    
    // Create clock cards (only world clocks)
    clocksGrid.innerHTML = worldClocks.map(clock => `
        <div class="clock-card glass-card">
            <div class="clock-city">
                <ion-icon name="${clock.icon}"></ion-icon>
                <span>${clock.city}</span>
            </div>
            <div class="clock-timezone">${clock.timezone.replace('_', ' ')}</div>
            <div class="clock-time" data-timezone="${clock.timezone}">--:--:--</div>
            <div class="clock-date" data-timezone="${clock.timezone}">---</div>
            <div class="clock-day" data-timezone="${clock.timezone}">---</div>
        </div>
    `).join('');
    
    // Create calendar cards (ethnic calendars)
    calendarsGrid.innerHTML = `
        <div class="clock-card glass-card calendar-card hindu-calendar" data-calendar="hindu">
            <button class="calendar-compare-btn" onclick="toggleCompareView('hindu')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('hindu')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="moon"></ion-icon>
                    <span>Hindu Calendar</span>
                </div>
                <div class="clock-timezone">Vikram Samvat</div>
                <div class="calendar-year" id="hindu-year">----</div>
                <div class="calendar-month" id="hindu-month">---</div>
                <div class="calendar-detail" id="hindu-tithi">---</div>
                <div class="calendar-detail" id="hindu-paksha">---</div>
            </div>
            <div class="calendar-expanded" id="hindu-expanded">
                <div class="calendar-year-view" id="hindu-year-view"></div>
            </div>
            <div class="calendar-compare" id="hindu-compare">
                <div class="compare-view-container" id="hindu-compare-view"></div>
            </div>
        </div>
        <div class="clock-card glass-card calendar-card islamic-calendar" data-calendar="islamic">
            <button class="calendar-compare-btn" onclick="toggleCompareView('islamic')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('islamic')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="moon-outline"></ion-icon>
                    <span>Islamic Calendar</span>
                </div>
                <div class="clock-timezone">Hijri</div>
                <div class="calendar-year" id="islamic-year">----</div>
                <div class="calendar-month" id="islamic-month">---</div>
                <div class="calendar-detail" id="islamic-day">---</div>
                <div class="calendar-detail" id="islamic-weekday">---</div>
            </div>
            <div class="calendar-expanded" id="islamic-expanded">
                <div class="calendar-year-view" id="islamic-year-view"></div>
            </div>
            <div class="calendar-compare" id="islamic-compare">
                <div class="compare-view-container" id="islamic-compare-view"></div>
            </div>
        </div>
        <div class="clock-card glass-card calendar-card hebrew-calendar" data-calendar="hebrew">
            <button class="calendar-compare-btn" onclick="toggleCompareView('hebrew')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('hebrew')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="star-outline"></ion-icon>
                    <span>Hebrew Calendar</span>
                </div>
                <div class="clock-timezone">Jewish Calendar</div>
                <div class="calendar-year" id="hebrew-year">----</div>
                <div class="calendar-month" id="hebrew-month">---</div>
                <div class="calendar-detail" id="hebrew-day">---</div>
                <div class="calendar-detail" id="hebrew-weekday">---</div>
            </div>
            <div class="calendar-expanded" id="hebrew-expanded">
                <div class="calendar-year-view" id="hebrew-year-view"></div>
            </div>
            <div class="calendar-compare" id="hebrew-compare">
                <div class="compare-view-container" id="hebrew-compare-view"></div>
            </div>
        </div>
        <div class="clock-card glass-card calendar-card chinese-calendar" data-calendar="chinese">
            <button class="calendar-compare-btn" onclick="toggleCompareView('chinese')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('chinese')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="planet-outline"></ion-icon>
                    <span>Chinese Calendar</span>
                </div>
                <div class="clock-timezone">Lunar Calendar</div>
                <div class="calendar-year" id="chinese-year">----</div>
                <div class="calendar-month" id="chinese-month">---</div>
                <div class="calendar-detail" id="chinese-zodiac">---</div>
                <div class="calendar-detail" id="chinese-element">---</div>
            </div>
            <div class="calendar-expanded" id="chinese-expanded">
                <div class="calendar-year-view" id="chinese-year-view"></div>
            </div>
            <div class="calendar-compare" id="chinese-compare">
                <div class="compare-view-container" id="chinese-compare-view"></div>
            </div>
        </div>
        <div class="clock-card glass-card calendar-card persian-calendar" data-calendar="persian">
            <button class="calendar-compare-btn" onclick="toggleCompareView('persian')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('persian')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="sunny-outline"></ion-icon>
                    <span>Persian Calendar</span>
                </div>
                <div class="clock-timezone">Solar Hijri</div>
                <div class="calendar-year" id="persian-year">----</div>
                <div class="calendar-month" id="persian-month">---</div>
                <div class="calendar-detail" id="persian-day">---</div>
                <div class="calendar-detail" id="persian-season">---</div>
            </div>
            <div class="calendar-expanded" id="persian-expanded">
                <div class="calendar-year-view" id="persian-year-view"></div>
            </div>
            <div class="calendar-compare" id="persian-compare">
                <div class="compare-view-container" id="persian-compare-view"></div>
            </div>
        </div>
        <div class="clock-card glass-card calendar-card ethiopian-calendar" data-calendar="ethiopian">
            <button class="calendar-compare-btn" onclick="toggleCompareView('ethiopian')" title="Compare with Gregorian">
                <ion-icon name="git-compare-outline"></ion-icon>
            </button>
            <button class="calendar-expand-btn" onclick="toggleCalendarView('ethiopian')" title="View full year">
                <ion-icon name="expand-outline"></ion-icon>
            </button>
            <div class="calendar-summary">
                <div class="clock-city">
                    <ion-icon name="earth-outline"></ion-icon>
                    <span>Ethiopian Calendar</span>
                </div>
                <div class="clock-timezone">Ge'ez Calendar</div>
                <div class="calendar-year" id="ethiopian-year">----</div>
                <div class="calendar-month" id="ethiopian-month">---</div>
                <div class="calendar-detail" id="ethiopian-day">---</div>
                <div class="calendar-detail" id="ethiopian-era">---</div>
            </div>
            <div class="calendar-expanded" id="ethiopian-expanded">
                <div class="calendar-year-view" id="ethiopian-year-view"></div>
            </div>
            <div class="calendar-compare" id="ethiopian-compare">
                <div class="compare-view-container" id="ethiopian-compare-view"></div>
            </div>
        </div>
    `;
    
    // Setup tab switching
    setupGlobalTimeTabs();
    
    // Update clocks immediately
    updateWorldClocks();
    updateAllCalendars();
    
    // Update every second
    clockInterval = setInterval(() => {
        updateWorldClocks();
        updateAllCalendars();
    }, 1000);
};

// Setup tab switching for Global Time section
const setupGlobalTimeTabs = () => {
    const tabs = document.querySelectorAll('.global-time-tab');
    const contents = document.querySelectorAll('.global-time-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
};

// Toggle calendar year view
window.toggleCalendarView = (calendarType) => {
    const card = document.querySelector(`[data-calendar="${calendarType}"]`);
    const expandedSection = document.getElementById(`${calendarType}-expanded`);
    const compareSection = document.getElementById(`${calendarType}-compare`);
    const expandBtn = card.querySelector('.calendar-expand-btn ion-icon');
    
    if (!card || !expandedSection) return;
    
    const isExpanded = card.classList.contains('expanded');
    
    // Close compare view if open
    if (card.classList.contains('comparing')) {
        card.classList.remove('comparing');
        const compareBtn = card.querySelector('.calendar-compare-btn ion-icon');
        if (compareBtn) compareBtn.setAttribute('name', 'git-compare-outline');
    }
    
    if (isExpanded) {
        // Collapse
        card.classList.remove('expanded');
        expandBtn.setAttribute('name', 'expand-outline');
    } else {
        // Expand
        card.classList.add('expanded');
        expandBtn.setAttribute('name', 'contract-outline');
        
        // Generate year view if not already generated
        if (!expandedSection.querySelector('.calendar-months')) {
            generateYearView(calendarType);
        }
    }
};

// Toggle compare view with Gregorian calendar
window.toggleCompareView = (calendarType) => {
    const card = document.querySelector(`[data-calendar="${calendarType}"]`);
    const compareSection = document.getElementById(`${calendarType}-compare`);
    const expandedSection = document.getElementById(`${calendarType}-expanded`);
    const compareBtn = card.querySelector('.calendar-compare-btn ion-icon');
    
    if (!card || !compareSection) return;
    
    const isComparing = card.classList.contains('comparing');
    
    // Close expanded view if open
    if (card.classList.contains('expanded')) {
        card.classList.remove('expanded');
        const expandBtn = card.querySelector('.calendar-expand-btn ion-icon');
        if (expandBtn) expandBtn.setAttribute('name', 'expand-outline');
    }
    
    if (isComparing) {
        // Close compare view
        card.classList.remove('comparing');
        compareBtn.setAttribute('name', 'git-compare-outline');
    } else {
        // Open compare view
        card.classList.add('comparing');
        compareBtn.setAttribute('name', 'close-outline');
        
        // Generate compare view if not already generated
        if (!compareSection.querySelector('.compare-calendars')) {
            generateCompareView(calendarType);
        }
    }
};

// Generate yearly calendar view
const generateYearView = (calendarType) => {
    const yearViewContainer = document.getElementById(`${calendarType}-year-view`);
    if (!yearViewContainer) return;
    
    const monthsData = getMonthsForCalendar(calendarType);
    
    let html = '<div class="calendar-months">';
    
    monthsData.forEach((month, index) => {
        html += `
            <div class="calendar-month-card">
                <div class="month-header">${month.name}</div>
                <div class="month-info">${month.info}</div>
            </div>
        `;
    });
    
    html += '</div>';
    yearViewContainer.innerHTML = html;
};

// Generate parallel comparison view with Gregorian calendar
const generateCompareView = (calendarType) => {
    const compareContainer = document.getElementById(`${calendarType}-compare-view`);
    if (!compareContainer) return;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const gregorianMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthsData = getMonthsForCalendar(calendarType);
    const calendarName = getCalendarDisplayName(calendarType);
    
    let html = `
        <div class="compare-calendars">
            <div class="compare-header">
                <h3>${calendarName} ⇄ Gregorian Calendar</h3>
                <p class="compare-subtitle">Side-by-side month comparison for ${currentYear}</p>
            </div>
            <div class="compare-grid">
    `;
    
    // Generate comparison for all months
    monthsData.forEach((ethnicMonth, index) => {
        // Map ethnic month to approximate Gregorian month
        const gregorianIndex = getGregorianMapping(calendarType, index);
        const gregorianMonth = gregorianMonths[gregorianIndex % 12];
        const gregorianYear = gregorianIndex >= 12 ? currentYear + 1 : currentYear;
        
        const isCurrentMonth = (calendarType === 'hindu' && index === currentMonth) ||
                               (calendarType === 'islamic' && Math.abs(index - currentMonth) <= 1) ||
                               (calendarType === 'hebrew' && Math.abs(index - currentMonth) <= 1) ||
                               (calendarType === 'chinese' && index === currentMonth) ||
                               (calendarType === 'persian' && Math.abs(index - currentMonth) <= 1) ||
                               (calendarType === 'ethiopian' && Math.abs(index - currentMonth) <= 1);
        
        html += `
            <div class="compare-row ${isCurrentMonth ? 'current-month' : ''}">
                <div class="compare-ethnic">
                    <div class="compare-month-name">${ethnicMonth.name}</div>
                    <div class="compare-month-info">${ethnicMonth.info}</div>
                </div>
                <div class="compare-arrow">
                    <ion-icon name="swap-horizontal"></ion-icon>
                </div>
                <div class="compare-gregorian">
                    <div class="compare-month-name">${gregorianMonth}</div>
                    <div class="compare-month-info">${gregorianYear}</div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="compare-note">
                <ion-icon name="information-circle"></ion-icon>
                <span>Approximate correspondence - exact dates may vary based on lunar cycles and regional variations</span>
            </div>
        </div>
    `;
    
    compareContainer.innerHTML = html;
};

// Get calendar display name
const getCalendarDisplayName = (calendarType) => {
    const names = {
        hindu: 'Hindu Calendar (Vikram Samvat)',
        islamic: 'Islamic Calendar (Hijri)',
        hebrew: 'Hebrew Calendar (Jewish)',
        chinese: 'Chinese Calendar (Lunar)',
        persian: 'Persian Calendar (Solar Hijri)',
        ethiopian: 'Ethiopian Calendar (Ge\'ez)'
    };
    return names[calendarType] || calendarType;
};

// Map ethnic calendar months to Gregorian months
const getGregorianMapping = (calendarType, monthIndex) => {
    // These mappings show approximate start months
    const mappings = {
        hindu: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1], // Chaitra starts ~March
        islamic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Shifts ~11 days each year
        hebrew: [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2], // Nisan starts ~March-April
        chinese: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0], // Lunar New Year ~Jan-Feb
        persian: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1], // Farvardin starts ~March 21
        ethiopian: [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8] // Meskerem starts ~Sept 11
    };
    
    return mappings[calendarType] ? mappings[calendarType][monthIndex] : monthIndex;
};

// Get months data for each calendar type
const getMonthsForCalendar = (calendarType) => {
    const calendars = {
        hindu: [
            { name: 'Chaitra', info: 'Mar-Apr' },
            { name: 'Vaishakha', info: 'Apr-May' },
            { name: 'Jyeshtha', info: 'May-Jun' },
            { name: 'Ashadha', info: 'Jun-Jul' },
            { name: 'Shravana', info: 'Jul-Aug' },
            { name: 'Bhadrapada', info: 'Aug-Sep' },
            { name: 'Ashwin', info: 'Sep-Oct' },
            { name: 'Kartika', info: 'Oct-Nov' },
            { name: 'Margashirsha', info: 'Nov-Dec' },
            { name: 'Pausha', info: 'Dec-Jan' },
            { name: 'Magha', info: 'Jan-Feb' },
            { name: 'Phalguna', info: 'Feb-Mar' }
        ],
        islamic: [
            { name: 'Muharram', info: '29-30 days' },
            { name: 'Safar', info: '29-30 days' },
            { name: 'Rabi al-Awwal', info: '29-30 days' },
            { name: 'Rabi al-Thani', info: '29-30 days' },
            { name: 'Jumada al-Awwal', info: '29-30 days' },
            { name: 'Jumada al-Thani', info: '29-30 days' },
            { name: 'Rajab', info: '29-30 days' },
            { name: 'Sha\'ban', info: '29-30 days' },
            { name: 'Ramadan', info: '29-30 days' },
            { name: 'Shawwal', info: '29-30 days' },
            { name: 'Dhu al-Qi\'dah', info: '29-30 days' },
            { name: 'Dhu al-Hijjah', info: '29-30 days' }
        ],
        hebrew: [
            { name: 'Nisan', info: '30 days' },
            { name: 'Iyar', info: '29 days' },
            { name: 'Sivan', info: '30 days' },
            { name: 'Tammuz', info: '29 days' },
            { name: 'Av', info: '30 days' },
            { name: 'Elul', info: '29 days' },
            { name: 'Tishrei', info: '30 days' },
            { name: 'Cheshvan', info: '29-30 days' },
            { name: 'Kislev', info: '29-30 days' },
            { name: 'Tevet', info: '29 days' },
            { name: 'Shevat', info: '30 days' },
            { name: 'Adar', info: '29 days' }
        ],
        chinese: [
            { name: 'First Month', info: 'Tiger' },
            { name: 'Second Month', info: 'Rabbit' },
            { name: 'Third Month', info: 'Dragon' },
            { name: 'Fourth Month', info: 'Snake' },
            { name: 'Fifth Month', info: 'Horse' },
            { name: 'Sixth Month', info: 'Goat' },
            { name: 'Seventh Month', info: 'Monkey' },
            { name: 'Eighth Month', info: 'Rooster' },
            { name: 'Ninth Month', info: 'Dog' },
            { name: 'Tenth Month', info: 'Pig' },
            { name: 'Eleventh Month', info: 'Rat' },
            { name: 'Twelfth Month', info: 'Ox' }
        ],
        persian: [
            { name: 'Farvardin', info: '31 days' },
            { name: 'Ordibehesht', info: '31 days' },
            { name: 'Khordad', info: '31 days' },
            { name: 'Tir', info: '31 days' },
            { name: 'Mordad', info: '31 days' },
            { name: 'Shahrivar', info: '31 days' },
            { name: 'Mehr', info: '30 days' },
            { name: 'Aban', info: '30 days' },
            { name: 'Azar', info: '30 days' },
            { name: 'Dey', info: '30 days' },
            { name: 'Bahman', info: '30 days' },
            { name: 'Esfand', info: '29-30 days' }
        ],
        ethiopian: [
            { name: 'Meskerem', info: '30 days' },
            { name: 'Tikimt', info: '30 days' },
            { name: 'Hidar', info: '30 days' },
            { name: 'Tahsas', info: '30 days' },
            { name: 'Tir', info: '30 days' },
            { name: 'Yekatit', info: '30 days' },
            { name: 'Megabit', info: '30 days' },
            { name: 'Miazia', info: '30 days' },
            { name: 'Ginbot', info: '30 days' },
            { name: 'Sene', info: '30 days' },
            { name: 'Hamle', info: '30 days' },
            { name: 'Nehase', info: '30 days' },
            { name: 'Pagumen', info: '5-6 days' }
        ]
    };
    
    return calendars[calendarType] || [];
};

const updateWorldClocks = () => {
    worldClocks.forEach(clock => {
        try {
            const now = new Date();
            
            // Format time
            const timeElement = document.querySelector(`[data-timezone="${clock.timezone}"].clock-time`);
            if (timeElement) {
                const timeStr = now.toLocaleTimeString('en-US', {
                    timeZone: clock.timezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                timeElement.textContent = timeStr;
            }
            
            // Format date
            const dateElement = document.querySelector(`[data-timezone="${clock.timezone}"].clock-date`);
            if (dateElement) {
                const dateStr = now.toLocaleDateString('en-US', {
                    timeZone: clock.timezone,
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                dateElement.textContent = dateStr;
            }
            
            // Format day
            const dayElement = document.querySelector(`[data-timezone="${clock.timezone}"].clock-day`);
            if (dayElement) {
                const dayStr = now.toLocaleDateString('en-US', {
                    timeZone: clock.timezone,
                    weekday: 'long'
                });
                dayElement.textContent = dayStr;
            }
            
        } catch (error) {
            console.error(`Error updating clock for ${clock.city}:`, error);
        }
    });
};

const updateMarketStatus = (market, timezone) => {
    const statusElement = document.querySelector(`[data-market="${market}"]`);
    if (!statusElement) return;
    
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const day = localTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    
    // Weekend check
    if (day === 0 || day === 6) {
        statusElement.className = 'market-status weekend';
        statusElement.innerHTML = '<ion-icon name="calendar"></ion-icon> <span>Weekend</span>';
        return;
    }
    
    // Market hours (approximate)
    let marketOpen = false;
    let openTime = '';
    let closeTime = '';
    
    switch (market) {
        case 'NYSE': // 9:30 AM - 4:00 PM EST
            marketOpen = timeInMinutes >= 570 && timeInMinutes < 960;
            openTime = '9:30 AM';
            closeTime = '4:00 PM';
            break;
        case 'LSE': // 8:00 AM - 4:30 PM GMT
            marketOpen = timeInMinutes >= 480 && timeInMinutes < 1020;
            openTime = '8:00 AM';
            closeTime = '4:30 PM';
            break;
        case 'TSE': // 9:00 AM - 3:00 PM JST
            marketOpen = timeInMinutes >= 540 && timeInMinutes < 900;
            openTime = '9:00 AM';
            closeTime = '3:00 PM';
            break;
        case 'HKEX': // 9:30 AM - 4:00 PM HKT
            marketOpen = timeInMinutes >= 570 && timeInMinutes < 960;
            openTime = '9:30 AM';
            closeTime = '4:00 PM';
            break;
        case 'NSE': // 9:15 AM - 3:30 PM IST
            marketOpen = timeInMinutes >= 555 && timeInMinutes < 930;
            openTime = '9:15 AM';
            closeTime = '3:30 PM';
            break;
        case 'SGX': // 9:00 AM - 5:00 PM SGT
            marketOpen = timeInMinutes >= 540 && timeInMinutes < 1020;
            openTime = '9:00 AM';
            closeTime = '5:00 PM';
            break;
        case 'ASX': // 10:00 AM - 4:00 PM AEST
            marketOpen = timeInMinutes >= 600 && timeInMinutes < 960;
            openTime = '10:00 AM';
            closeTime = '4:00 PM';
            break;
        case 'DFM': // 10:00 AM - 2:00 PM GST
            marketOpen = timeInMinutes >= 600 && timeInMinutes < 840;
            openTime = '10:00 AM';
            closeTime = '2:00 PM';
            break;
    }
    
    if (marketOpen) {
        statusElement.className = 'market-status open';
        statusElement.innerHTML = '<ion-icon name="pulse"></ion-icon> <span>Market Open</span>';
    } else {
        statusElement.className = 'market-status closed';
        statusElement.innerHTML = '<ion-icon name="moon"></ion-icon> <span>Market Closed</span>';
    }
};

// Update all calendars
const updateAllCalendars = () => {
    updateHinduCalendar();
    updateIslamicCalendar();
    updateHebrewCalendar();
    updateChineseCalendar();
    updatePersianCalendar();
    updateEthiopianCalendar();
};

// Hindu Calendar calculation
const updateHinduCalendar = () => {
    try {
        const now = new Date();
        
        // Hindu months (Chaitra to Phalguna)
        const hinduMonths = [
            'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
            'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika',
            'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
        ];
        
        // Calculate Vikram Samvat year (approximately Gregorian year + 57)
        // Vikram Samvat starts around mid-April
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth(); // 0-11
        const gregorianDay = now.getDate();
        
        // If before mid-April, use previous Vikram Samvat year
        let vikramYear = gregorianYear + 57;
        if (gregorianMonth < 3 || (gregorianMonth === 3 && gregorianDay < 15)) {
            vikramYear = gregorianYear + 56;
        }
        
        // Approximate Hindu month based on Gregorian month
        // This is a simplified calculation
        let hinduMonthIndex = gregorianMonth;
        if (gregorianDay >= 15) {
            hinduMonthIndex = (gregorianMonth + 1) % 12;
        }
        
        // Calculate Tithi (lunar day) - simplified approximation
        // Full lunar cycle is approximately 29.5 days
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
        const lunarCycle = 29.53;
        const tithi = Math.floor((dayOfYear % lunarCycle) + 1);
        
        // Determine Paksha (fortnight)
        const paksha = tithi <= 15 ? 'Shukla Paksha' : 'Krishna Paksha';
        const tithiInPaksha = tithi <= 15 ? tithi : tithi - 15;
        
        // Tithi names
        const tithiNames = [
            'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
            'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
            'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya'
        ];
        
        const tithiName = tithiNames[Math.min(tithiInPaksha - 1, 14)];
        
        // Update Hindu Calendar display
        const yearElement = document.getElementById('hindu-year');
        const monthElement = document.getElementById('hindu-month');
        const tithiElement = document.getElementById('hindu-tithi');
        const pakshaElement = document.getElementById('hindu-paksha');
        
        if (yearElement) yearElement.textContent = `${vikramYear} VS`;
        if (monthElement) monthElement.textContent = hinduMonths[hinduMonthIndex];
        if (tithiElement) tithiElement.textContent = tithiName;
        if (pakshaElement) pakshaElement.textContent = paksha;
        if (gregorianElement) {
            const gregorianDate = now.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            gregorianElement.textContent = gregorianDate;
        }
        
    } catch (error) {
        console.error('Error updating Hindu calendar:', error);
    }
};

// Islamic (Hijri) Calendar calculation
const updateIslamicCalendar = () => {
    try {
        const now = new Date();
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth();
        const gregorianDay = now.getDate();
        
        // Islamic months
        const islamicMonths = [
            'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
            'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];
        
        // Approximate Hijri year (Islamic calendar started in 622 CE)
        // Islamic year is about 354 days (lunar)
        const daysSince622 = Math.floor((now - new Date(622, 6, 16)) / 86400000);
        const hijriYear = Math.floor(daysSince622 / 354.36) + 1;
        
        // Approximate month (simplified)
        const islamicMonthIndex = Math.floor((daysSince622 % 354) / 29.5) % 12;
        const islamicDay = Math.floor((daysSince622 % 354) % 29.5) + 1;
        
        document.getElementById('islamic-year').textContent = `${hijriYear} AH`;
        document.getElementById('islamic-month').textContent = islamicMonths[islamicMonthIndex];
        document.getElementById('islamic-day').textContent = `Day ${islamicDay}`;
        document.getElementById('islamic-weekday').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (error) {
        console.error('Error updating Islamic calendar:', error);
    }
};

// Hebrew Calendar calculation
const updateHebrewCalendar = () => {
    try {
        const now = new Date();
        
        const hebrewMonths = [
            'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
            'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar'
        ];
        
        // Hebrew calendar started in 3761 BCE
        const gregorianYear = now.getFullYear();
        const hebrewYear = gregorianYear + 3760; // Simplified
        
        // Approximate month
        const gregorianMonth = now.getMonth();
        const hebrewMonthIndex = (gregorianMonth + 6) % 12;
        const hebrewDay = now.getDate();
        
        document.getElementById('hebrew-year').textContent = `${hebrewYear} AM`;
        document.getElementById('hebrew-month').textContent = hebrewMonths[hebrewMonthIndex];
        document.getElementById('hebrew-day').textContent = `Day ${hebrewDay}`;
        document.getElementById('hebrew-weekday').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (error) {
        console.error('Error updating Hebrew calendar:', error);
    }
};

// Chinese Calendar calculation
const updateChineseCalendar = () => {
    try {
        const now = new Date();
        const gregorianYear = now.getFullYear();
        
        const zodiacAnimals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 
                               'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
        const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        
        // Chinese calendar year (approximate)
        const chineseYear = gregorianYear + 2697; // Traditional start
        const zodiacIndex = (gregorianYear - 4) % 12;
        const elementIndex = Math.floor(((gregorianYear - 4) % 10) / 2);
        
        const chineseMonths = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth',
                               'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];
        const monthIndex = now.getMonth();
        
        document.getElementById('chinese-year').textContent = `Year ${chineseYear}`;
        document.getElementById('chinese-month').textContent = `${chineseMonths[monthIndex]} Month`;
        document.getElementById('chinese-zodiac').textContent = `Year of the ${zodiacAnimals[zodiacIndex]}`;
        document.getElementById('chinese-element').textContent = `${elements[elementIndex]} Element`;
    } catch (error) {
        console.error('Error updating Chinese calendar:', error);
    }
};

// Persian (Solar Hijri) Calendar calculation
const updatePersianCalendar = () => {
    try {
        const now = new Date();
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth();
        
        const persianMonths = [
            'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
            'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'
        ];
        
        const seasons = ['Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer',
                        'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter'];
        
        // Persian calendar year (starts around March 21)
        let persianYear = gregorianYear - 621;
        if (gregorianMonth < 2 || (gregorianMonth === 2 && now.getDate() < 21)) {
            persianYear--;
        }
        
        // Approximate month
        let persianMonthIndex = gregorianMonth;
        if (gregorianMonth >= 2) {
            persianMonthIndex = gregorianMonth - 2;
        } else {
            persianMonthIndex = gregorianMonth + 10;
        }
        
        document.getElementById('persian-year').textContent = `${persianYear} SH`;
        document.getElementById('persian-month').textContent = persianMonths[persianMonthIndex];
        document.getElementById('persian-day').textContent = `Day ${now.getDate()}`;
        document.getElementById('persian-season').textContent = seasons[persianMonthIndex];
    } catch (error) {
        console.error('Error updating Persian calendar:', error);
    }
};

// Ethiopian Calendar calculation
const updateEthiopianCalendar = () => {
    try {
        const now = new Date();
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth();
        
        const ethiopianMonths = [
            'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
            'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagumen'
        ];
        
        // Ethiopian calendar is about 7-8 years behind Gregorian
        let ethiopianYear = gregorianYear - 7;
        if (gregorianMonth < 8) {
            ethiopianYear--;
        }
        
        // Approximate month (Ethiopian new year is around Sept 11)
        let ethiopianMonthIndex = gregorianMonth;
        if (gregorianMonth >= 8) {
            ethiopianMonthIndex = gregorianMonth - 8;
        } else {
            ethiopianMonthIndex = gregorianMonth + 4;
        }
        
        document.getElementById('ethiopian-year').textContent = `${ethiopianYear} EC`;
        document.getElementById('ethiopian-month').textContent = ethiopianMonths[ethiopianMonthIndex];
        document.getElementById('ethiopian-day').textContent = `Day ${now.getDate()}`;
        document.getElementById('ethiopian-era').textContent = 'Era of Mercy';
    } catch (error) {
        console.error('Error updating Ethiopian calendar:', error);
    }
};

// Cleanup interval when leaving the page
window.addEventListener('beforeunload', () => {
    if (clockInterval) {
        clearInterval(clockInterval);
    }
});

// --- Whiteboard Functions ---
let whiteboardCanvas = null;
let whiteboardCtx = null;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#6366f1';
let currentSize = 3;
let lastX = 0;
let lastY = 0;
let zoomLevel = 1;
let panOffsetX = 0;
let panOffsetY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let currentPage = 1;
let whiteboardPages = {}; // Store pages: { 1: { paths: [], panX: 0, panY: 0, zoom: 1 }, ... }
let drawingPaths = []; // Current page drawing paths

// Function to draw dotted grid background
const drawDottedBackground = () => {
    if (!whiteboardCtx || !whiteboardCanvas) return;
    
    // Clear and fill with white background
    whiteboardCtx.fillStyle = 'white';
    whiteboardCtx.fillRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
    
    // Draw dots at fixed size (not affected by zoom)
    const dotSpacing = 20;
    const dotRadius = 1.5;
    whiteboardCtx.fillStyle = '#e0e0e0';
    
    // Calculate visible area based on pan offset
    const startX = Math.floor(-panOffsetX / dotSpacing) * dotSpacing;
    const startY = Math.floor(-panOffsetY / dotSpacing) * dotSpacing;
    
    for (let x = startX; x < whiteboardCanvas.width - panOffsetX; x += dotSpacing) {
        for (let y = startY; y < whiteboardCanvas.height - panOffsetY; y += dotSpacing) {
            const screenX = x + panOffsetX;
            const screenY = y + panOffsetY;
            
            if (screenX >= 0 && screenX <= whiteboardCanvas.width && 
                screenY >= 0 && screenY <= whiteboardCanvas.height) {
                whiteboardCtx.beginPath();
                whiteboardCtx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
                whiteboardCtx.fill();
            }
        }
    }
};

// Update eraser cursor based on size
const updateEraserCursor = () => {
    if (!whiteboardCanvas) return;
    
    // Calculate eraser size (3x the pen size)
    const eraserSize = currentSize * 3;
    const cursorSize = Math.max(20, Math.min(eraserSize * 2, 60)); // Between 20-60px
    
    // Create SVG cursor with square eraser
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}">
            <rect x="2" y="2" width="${cursorSize - 4}" height="${cursorSize - 4}" 
                  fill="rgba(255, 255, 255, 0.8)" 
                  stroke="#ef4444" 
                  stroke-width="2" 
                  rx="2"/>
            <line x1="0" y1="0" x2="${cursorSize}" y2="${cursorSize}" stroke="#ef4444" stroke-width="1" opacity="0.5"/>
            <line x1="${cursorSize}" y1="0" x2="0" y2="${cursorSize}" stroke="#ef4444" stroke-width="1" opacity="0.5"/>
        </svg>
    `;
    
    const encodedSvg = encodeURIComponent(svg);
    const center = Math.floor(cursorSize / 2);
    whiteboardCanvas.style.cursor = `url('data:image/svg+xml;utf8,${encodedSvg}') ${center} ${center}, auto`;
};

// Initialize page if it doesn't exist
const initPage = (pageNum) => {
    if (!whiteboardPages[pageNum]) {
        whiteboardPages[pageNum] = {
            paths: [],
            panX: 0,
            panY: 0,
            zoom: 1
        };
    }
};

// Save current page state
const saveCurrentPage = () => {
    if (!whiteboardPages[currentPage]) {
        whiteboardPages[currentPage] = {};
    }
    whiteboardPages[currentPage].paths = JSON.parse(JSON.stringify(getCurrentPaths()));
    whiteboardPages[currentPage].panX = panOffsetX;
    whiteboardPages[currentPage].panY = panOffsetY;
    whiteboardPages[currentPage].zoom = zoomLevel;
};

// Load page state
const loadPage = (pageNum) => {
    initPage(pageNum);
    const page = whiteboardPages[pageNum];
    
    // Restore page state
    setCurrentPaths(JSON.parse(JSON.stringify(page.paths)));
    panOffsetX = page.panX;
    panOffsetY = page.panY;
    zoomLevel = page.zoom;
    
    // Update UI
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
    }
    
    // Redraw
    redrawCanvas();
};

// Switch to a specific page
const switchToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > 50) return;
    
    // Save current page
    saveCurrentPage();
    
    // Load new page
    currentPage = pageNum;
    loadPage(pageNum);
    
    // Update page number input
    const pageInput = document.getElementById('page-number');
    if (pageInput) {
        pageInput.value = pageNum;
    }
    
    console.log('Switched to page:', pageNum);
};

// Navigation functions
window.nextWhiteboardPage = () => {
    if (currentPage < 50) {
        switchToPage(currentPage + 1);
    }
};

window.previousWhiteboardPage = () => {
    if (currentPage > 1) {
        switchToPage(currentPage - 1);
    }
};

// Helper functions to get/set paths (will be defined with drawingPaths)
const getCurrentPaths = () => {
    return typeof drawingPaths !== 'undefined' ? drawingPaths : [];
};

const setCurrentPaths = (paths) => {
    if (typeof drawingPaths !== 'undefined') {
        drawingPaths = paths;
    }
};

// Redraw everything (background + all paths)
const redrawCanvas = () => {
    if (!whiteboardCtx || !whiteboardCanvas) return;
    
    // Draw background
    drawDottedBackground();
    
    // Apply transformations
    whiteboardCtx.save();
    whiteboardCtx.translate(panOffsetX, panOffsetY);
    whiteboardCtx.scale(zoomLevel, zoomLevel);
    
    // Redraw all paths
    drawingPaths.forEach(path => {
        whiteboardCtx.beginPath();
        whiteboardCtx.strokeStyle = path.color;
        whiteboardCtx.lineWidth = path.size;
        whiteboardCtx.lineCap = 'round';
        whiteboardCtx.lineJoin = 'round';
        
        if (path.points.length > 0) {
            whiteboardCtx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                whiteboardCtx.lineTo(path.points[i].x, path.points[i].y);
            }
            whiteboardCtx.stroke();
        }
    });
    
    whiteboardCtx.restore();
};

const initWhiteboard = () => {
    console.log('Initializing whiteboard...');
    whiteboardCanvas = document.getElementById('whiteboard-canvas');
    if (!whiteboardCanvas) {
        console.error('Whiteboard canvas not found!');
        return;
    }
    
    console.log('Canvas found:', whiteboardCanvas);
    whiteboardCtx = whiteboardCanvas.getContext('2d');
    
    // Set canvas size to match container
    const resizeCanvas = () => {
        const wrapper = whiteboardCanvas.parentElement;
        const width = wrapper.clientWidth;
        const height = wrapper.clientHeight;
        console.log('Resizing canvas to:', width, 'x', height);
        
        whiteboardCanvas.width = width;
        whiteboardCanvas.height = height;
        
        // Redraw everything
        redrawCanvas();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    console.log('Canvas initialized with size:', whiteboardCanvas.width, 'x', whiteboardCanvas.height);
    
    // Tool selection
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.getAttribute('data-tool');
            console.log('Tool changed to:', currentTool);
            
            // Update cursor
            if (currentTool === 'eraser') {
                whiteboardCanvas.classList.add('eraser-mode');
                updateEraserCursor();
            } else if (currentTool === 'pan') {
                whiteboardCanvas.classList.remove('eraser-mode');
                whiteboardCanvas.style.cursor = 'grab';
            } else {
                whiteboardCanvas.classList.remove('eraser-mode');
                whiteboardCanvas.style.cursor = 'crosshair';
            }
        });
    });
    
    // Color picker
    const colorPicker = document.getElementById('pen-color');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            currentColor = e.target.value;
            console.log('Color changed to:', currentColor);
        });
    }
    
    // Size picker
    const sizePicker = document.getElementById('pen-size');
    const sizeDisplay = document.getElementById('size-display');
    if (sizePicker && sizeDisplay) {
        sizePicker.addEventListener('input', (e) => {
            currentSize = parseInt(e.target.value);
            sizeDisplay.textContent = `${currentSize}px`;
            
            // Update eraser cursor if eraser is active
            if (currentTool === 'eraser') {
                updateEraserCursor();
            }
        });
    }
    
    // Zoom input
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        // Select all text when clicked
        zoomDisplay.addEventListener('click', () => {
            zoomDisplay.select();
        });
        
        // Handle Enter key
        zoomDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = zoomDisplay.value.replace('%', '').trim();
                const newZoom = parseFloat(value);
                
                if (!isNaN(newZoom) && newZoom >= 10 && newZoom <= 500) {
                    zoomLevel = newZoom / 100;
                    applyZoom();
                    zoomDisplay.blur();
                } else {
                    showToast('Please enter a zoom level between 10% and 500%', 'error');
                    zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
                }
            } else if (e.key === 'Escape') {
                zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
                zoomDisplay.blur();
            }
        });
        
        // Handle blur (when clicking away)
        zoomDisplay.addEventListener('blur', () => {
            zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
        });
    }
    
    // Page number input
    const pageInput = document.getElementById('page-number');
    if (pageInput) {
        pageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const pageNum = parseInt(pageInput.value);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 50) {
                    switchToPage(pageNum);
                    pageInput.blur();
                } else {
                    showToast('Please enter a page number between 1 and 50', 'error');
                    pageInput.value = currentPage;
                }
            } else if (e.key === 'Escape') {
                pageInput.value = currentPage;
                pageInput.blur();
            }
        });
        
        pageInput.addEventListener('blur', () => {
            pageInput.value = currentPage;
        });
    }
    
    // Keyboard navigation for pages (Arrow keys)
    document.addEventListener('keydown', (e) => {
        // Only handle if whiteboard is active and not typing in an input
        if (!document.querySelector('#whiteboard.active')) return;
        if (e.target.tagName === 'INPUT') return;
        
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            previousWhiteboardPage();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextWhiteboardPage();
        }
    });
    
    // Initialize first page
    initPage(1);
    
    // Keyboard support for panning with Space key
    let spacePressed = false;
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !spacePressed && document.querySelector('#whiteboard.active')) {
            e.preventDefault();
            spacePressed = true;
            if (whiteboardCanvas) {
                whiteboardCanvas.style.cursor = 'grab';
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            spacePressed = false;
            if (whiteboardCanvas && !isPanning) {
                if (currentTool === 'eraser') {
                    updateEraserCursor();
                } else if (currentTool === 'pan') {
                    whiteboardCanvas.style.cursor = 'grab';
                } else {
                    whiteboardCanvas.style.cursor = 'crosshair';
                }
            }
        }
    });
    
    // Unified mousedown handler
    whiteboardCanvas.addEventListener('mousedown', (e) => {
        // Add spaceKey flag if space is pressed
        if (spacePressed && e.button === 0) {
            e.spaceKey = true;
        }
        startDrawing(e);
    });
    
    // Prevent context menu on middle click
    whiteboardCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Drawing events
    whiteboardCanvas.addEventListener('mousemove', draw);
    whiteboardCanvas.addEventListener('mouseup', stopDrawing);
    whiteboardCanvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch events for mobile
    whiteboardCanvas.addEventListener('touchstart', handleTouchStart);
    whiteboardCanvas.addEventListener('touchmove', handleTouchMove);
    whiteboardCanvas.addEventListener('touchend', stopDrawing);
    
    // Mouse wheel zoom
    whiteboardCanvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            if (e.deltaY < 0) {
                // Zoom in
                zoomLevel = Math.min(zoomLevel + 0.1, 3);
            } else {
                // Zoom out
                zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
            }
            
            applyZoom();
        }
    }, { passive: false });
    
    console.log('Whiteboard initialization complete');
};

const startDrawing = (e) => {
    console.log('Mouse down - button:', e.button, 'tool:', currentTool, 'spaceKey:', e.spaceKey);
    
    // Middle mouse button (button 1) or Space key or Pan tool for panning
    if (e.button === 1 || e.spaceKey || currentTool === 'pan') {
        console.log('Starting pan mode');
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        whiteboardCanvas.style.cursor = 'grabbing';
        return;
    }
    
    // Left mouse button for drawing
    if (e.button === 0 && !isPanning && currentTool !== 'pan') {
        console.log('Starting drawing');
        isDrawing = true;
        const rect = whiteboardCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - panOffsetX) / zoomLevel;
        const y = (e.clientY - rect.top - panOffsetY) / zoomLevel;
        lastX = x;
        lastY = y;
        
        // Start a new path
        drawingPaths.push({
            color: currentTool === 'eraser' ? 'white' : currentColor,
            size: currentTool === 'eraser' ? currentSize * 3 : currentSize,
            points: [{ x, y }]
        });
    }
};

const draw = (e) => {
    // Handle panning
    if (isPanning) {
        e.preventDefault();
        const deltaX = e.clientX - panStartX;
        const deltaY = e.clientY - panStartY;
        panOffsetX += deltaX;
        panOffsetY += deltaY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        redrawCanvas();
        return;
    }
    
    // Handle drawing
    if (!isDrawing || currentTool === 'pan') return;
    
    const rect = whiteboardCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffsetX) / zoomLevel;
    const y = (e.clientY - rect.top - panOffsetY) / zoomLevel;
    
    // Add point to current path
    const currentPath = drawingPaths[drawingPaths.length - 1];
    if (currentPath) {
        currentPath.points.push({ x, y });
        
        // Draw the new segment
        whiteboardCtx.save();
        whiteboardCtx.translate(panOffsetX, panOffsetY);
        whiteboardCtx.scale(zoomLevel, zoomLevel);
        
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(lastX, lastY);
        whiteboardCtx.lineTo(x, y);
        whiteboardCtx.strokeStyle = currentPath.color;
        whiteboardCtx.lineWidth = currentPath.size;
        whiteboardCtx.lineCap = 'round';
        whiteboardCtx.lineJoin = 'round';
        whiteboardCtx.stroke();
        
        whiteboardCtx.restore();
    }
    
    lastX = x;
    lastY = y;
};

const stopDrawing = () => {
    isDrawing = false;
    isPanning = false;
    if (whiteboardCanvas) {
        if (currentTool === 'eraser') {
            updateEraserCursor();
        } else if (currentTool === 'pan') {
            whiteboardCanvas.style.cursor = 'grab';
        } else {
            whiteboardCanvas.style.cursor = 'crosshair';
        }
    }
};

const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = whiteboardCanvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - panOffsetX) / zoomLevel;
    const y = (touch.clientY - rect.top - panOffsetY) / zoomLevel;
    lastX = x;
    lastY = y;
    isDrawing = true;
    
    // Start a new path
    drawingPaths.push({
        color: currentTool === 'eraser' ? 'white' : currentColor,
        size: currentTool === 'eraser' ? currentSize * 3 : currentSize,
        points: [{ x, y }]
    });
};

const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = whiteboardCanvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - panOffsetX) / zoomLevel;
    const y = (touch.clientY - rect.top - panOffsetY) / zoomLevel;
    
    // Add point to current path
    const currentPath = drawingPaths[drawingPaths.length - 1];
    if (currentPath) {
        currentPath.points.push({ x, y });
        
        // Draw the new segment
        whiteboardCtx.save();
        whiteboardCtx.translate(panOffsetX, panOffsetY);
        whiteboardCtx.scale(zoomLevel, zoomLevel);
        
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(lastX, lastY);
        whiteboardCtx.lineTo(x, y);
        whiteboardCtx.strokeStyle = currentPath.color;
        whiteboardCtx.lineWidth = currentPath.size;
        whiteboardCtx.lineCap = 'round';
        whiteboardCtx.lineJoin = 'round';
        whiteboardCtx.stroke();
        
        whiteboardCtx.restore();
    }
    
    lastX = x;
    lastY = y;
};

window.clearWhiteboard = () => {
    if (!whiteboardCtx || !whiteboardCanvas) return;
    
    // Clear all paths
    drawingPaths = [];
    
    // Redraw background
    redrawCanvas();
    showToast('Whiteboard cleared', 'success');
};

window.saveWhiteboard = () => {
    if (!whiteboardCanvas) return;
    
    try {
        // Convert canvas to blob and download
        whiteboardCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `whiteboard-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Whiteboard saved as image', 'success');
        });
    } catch (error) {
        console.error('Error saving whiteboard:', error);
        showToast('Failed to save whiteboard', 'error');
    }
};

// Zoom functions
window.zoomIn = () => {
    if (!whiteboardCanvas) return;
    
    zoomLevel = Math.min(zoomLevel + 0.25, 3); // Max 300%
    applyZoom();
};

window.zoomOut = () => {
    if (!whiteboardCanvas) return;
    
    zoomLevel = Math.max(zoomLevel - 0.25, 0.5); // Min 50%
    applyZoom();
};

window.resetZoom = () => {
    if (!whiteboardCanvas) return;
    
    zoomLevel = 1;
    applyZoom();
};

const applyZoom = () => {
    // Redraw everything with new zoom level
    redrawCanvas();
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        zoomDisplay.value = `${Math.round(zoomLevel * 100)}%`;
    }
    
    console.log('Zoom level:', zoomLevel);
};

// --- Market Indices Functions ---
let marketsInterval = null;

const majorIndices = [
    { symbol: '^NSEI', name: 'NIFTY 50', country: 'India', timezone: 'Asia/Kolkata' },
    { symbol: '^BSESN', name: 'SENSEX', country: 'India', timezone: 'Asia/Kolkata' },
    { symbol: '^GSPC', name: 'S&P 500', country: 'USA', timezone: 'America/New_York' },
    { symbol: '^DJI', name: 'Dow Jones', country: 'USA', timezone: 'America/New_York' },
    { symbol: '^IXIC', name: 'NASDAQ', country: 'USA', timezone: 'America/New_York' },
    { symbol: '^FTSE', name: 'FTSE 100', country: 'UK', timezone: 'Europe/London' },
    { symbol: '^N225', name: 'Nikkei 225', country: 'Japan', timezone: 'Asia/Tokyo' },
    { symbol: '^HSI', name: 'Hang Seng', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
    { symbol: '^GDAXI', name: 'DAX', country: 'Germany', timezone: 'Europe/Berlin' },
    { symbol: '^AXJO', name: 'ASX 200', country: 'Australia', timezone: 'Australia/Sydney' }
];

const initMarketIndices = () => {
    const indicesGrid = document.getElementById('indices-grid');
    if (!indicesGrid) return;
    
    // Show loading state
    indicesGrid.innerHTML = `
        <div class="index-loading">
            <ion-icon name="sync"></ion-icon>
            <p>Loading market data...</p>
        </div>
    `;
    
    // Generate mock data for demonstration
    generateMockMarketData();
    
    // Update every 30 seconds
    if (marketsInterval) clearInterval(marketsInterval);
    marketsInterval = setInterval(generateMockMarketData, 30000);
    
    // Update last updated time
    updateLastUpdatedTime();
    setInterval(updateLastUpdatedTime, 1000);
};

const fetchRealMarketData = async () => {
    try {
        const response = await fetch('/api/market-data');
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error('No market data available');
    } catch (error) {
        console.error('Failed to fetch real market data:', error);
        return null;
    }
};

const generateMockMarketData = async () => {
    const indicesGrid = document.getElementById('indices-grid');
    if (!indicesGrid) return;
    
    const selectedTimezone = document.getElementById('market-timezone')?.value || 'Asia/Kolkata';
    
    // Try to fetch real data first
    const realData = await fetchRealMarketData();
    
    let marketData;
    if (realData) {
        marketData = realData;
        // Update last updated time to show live data
        const lastUpdated = document.getElementById('markets-last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()} • Live data`;
            lastUpdated.style.color = '#10b981';
        }
    } else {
        // Fallback to mock data
        marketData = majorIndices.map(index => {
            const baseValue = getBaseValue(index.symbol);
            const changePercent = (Math.random() - 0.5) * 4;
            const changeValue = (baseValue * changePercent) / 100;
            
            return {
                symbol: index.symbol,
                name: index.name,
                country: index.country,
                timezone: index.timezone,
                value: baseValue + changeValue,
                change: changeValue,
                changePercent: changePercent
            };
        });
        
        const lastUpdated = document.getElementById('markets-last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()} • Simulated data`;
            lastUpdated.style.color = '#f59e0b';
        }
    }
    
    indicesGrid.innerHTML = marketData.map(index => {
        const isPositive = index.changePercent >= 0;
        const isOpen = isMarketOpen(index.timezone);
        const timeInfo = isOpen 
            ? getMarketCloseTime(index.timezone, selectedTimezone)
            : getMarketReopenTime(index.timezone, selectedTimezone);
        
        return `
            <div class="index-card ${isPositive ? 'positive' : 'negative'}">
                <div class="index-header">
                    <div>
                        <div class="index-name">${index.name}</div>
                        <div class="index-country">${index.country}</div>
                    </div>
                    <div class="index-status ${isOpen ? 'open' : 'closed'}">
                        <ion-icon name="${isOpen ? 'radio-button-on' : 'radio-button-off'}"></ion-icon>
                        ${isOpen ? 'OPEN' : 'CLOSED'}
                    </div>
                </div>
                <div class="index-value">${formatIndexValue(index.value)}</div>
                <div class="index-change ${isPositive ? 'positive' : 'negative'}">
                    <ion-icon name="${isPositive ? 'trending-up' : 'trending-down'}"></ion-icon>
                    <span>${isPositive ? '+' : ''}${index.change.toFixed(2)}</span>
                    <span class="index-percent">(${isPositive ? '+' : ''}${index.changePercent.toFixed(2)}%)</span>
                </div>
                <div class="index-time-info ${isOpen ? 'open' : 'closed'}">${timeInfo}</div>
            </div>
        `;
    }).join('');
};

const getBaseValue = (symbol) => {
    const baseValues = {
        '^NSEI': 21500,
        '^BSESN': 71000,
        '^GSPC': 5800,
        '^DJI': 42000,
        '^IXIC': 18500,
        '^FTSE': 8200,
        '^N225': 38000,
        '^HSI': 19500,
        '^GDAXI': 18500,
        '^AXJO': 7800
    };
    return baseValues[symbol] || 10000;
};

const formatIndexValue = (value) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

const isMarketOpen = (timezone) => {
    try {
        const now = new Date();
        const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const day = localTime.getDay();
        const hours = localTime.getHours();
        const minutes = localTime.getMinutes();
        const timeInMinutes = hours * 60 + minutes;
        
        // Weekend check
        if (day === 0 || day === 6) return false;
        
        // Simplified market hours (9:00 AM - 4:00 PM local time)
        return timeInMinutes >= 540 && timeInMinutes < 960;
    } catch (error) {
        return false;
    }
};

const getMarketReopenTime = (marketTimezone, displayTimezone) => {
    try {
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketTimezone }));
        const day = marketTime.getDay();
        const hours = marketTime.getHours();
        const minutes = marketTime.getMinutes();
        
        let nextOpenDate = new Date(marketTime);
        
        // If weekend, move to Monday
        if (day === 0) { // Sunday
            nextOpenDate.setDate(nextOpenDate.getDate() + 1);
        } else if (day === 6) { // Saturday
            nextOpenDate.setDate(nextOpenDate.getDate() + 2);
        } else if (hours >= 16 || (hours === 16 && minutes > 0)) {
            // After market close, next day
            nextOpenDate.setDate(nextOpenDate.getDate() + 1);
            // Check if next day is weekend
            if (nextOpenDate.getDay() === 6) {
                nextOpenDate.setDate(nextOpenDate.getDate() + 2);
            } else if (nextOpenDate.getDay() === 0) {
                nextOpenDate.setDate(nextOpenDate.getDate() + 1);
            }
        }
        
        // Set to 9:00 AM market time
        nextOpenDate.setHours(9, 0, 0, 0);
        
        // Convert to display timezone
        const openTimeStr = nextOpenDate.toLocaleString('en-US', { 
            timeZone: displayTimezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        // Calculate hours until open
        const nowInMarket = new Date(now.toLocaleString('en-US', { timeZone: marketTimezone }));
        const hoursUntil = Math.round((nextOpenDate - nowInMarket) / (1000 * 60 * 60));
        
        if (hoursUntil < 24) {
            return `Opens in ${hoursUntil}h`;
        } else {
            return `Opens ${openTimeStr}`;
        }
    } catch (error) {
        return 'Market closed';
    }
};

const getMarketCloseTime = (marketTimezone, displayTimezone) => {
    try {
        const now = new Date();
        const marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketTimezone }));
        
        // Set to 4:00 PM market time today
        const closeDate = new Date(marketTime);
        closeDate.setHours(16, 0, 0, 0);
        
        // Convert to display timezone
        const closeTimeStr = closeDate.toLocaleString('en-US', { 
            timeZone: displayTimezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        // Calculate hours until close
        const nowInMarket = new Date(now.toLocaleString('en-US', { timeZone: marketTimezone }));
        const minutesUntil = Math.round((closeDate - nowInMarket) / (1000 * 60));
        const hoursUntil = Math.floor(minutesUntil / 60);
        const remainingMinutes = minutesUntil % 60;
        
        if (minutesUntil < 60) {
            return `Closes in ${minutesUntil}m`;
        } else if (hoursUntil < 2) {
            return `Closes in ${hoursUntil}h ${remainingMinutes}m`;
        } else {
            return `Closes at ${closeTimeStr}`;
        }
    } catch (error) {
        return 'Open';
    }
};

const changeMarketTimezone = () => {
    // Regenerate market data with new timezone
    generateMockMarketData();
    updateLastUpdatedTime();
};

const updateLastUpdatedTime = () => {
    const lastUpdated = document.getElementById('markets-last-updated');
    if (!lastUpdated) return;
    
    const selectedTimezone = document.getElementById('market-timezone')?.value || 'Asia/Kolkata';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        timeZone: selectedTimezone,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    lastUpdated.textContent = `Updated: ${timeStr}`;
};

// --- Country Financial Functions ---
let countriesData = [];
let expandedCountries = new Set();

const countryFinancialData = [
    { name: 'Afghanistan', code: 'AF', gdp: 0.02, growth: -6.2, debt: 7, inflation: 2.3, unemployment: 13.3, currency: 'AFN', rating: 'N/A' },
    { name: 'Albania', code: 'AL', gdp: 0.02, growth: 3.5, debt: 74, inflation: 6.7, unemployment: 11.6, currency: 'ALL', rating: 'B+' },
    { name: 'Algeria', code: 'DZ', gdp: 0.19, growth: 3.2, debt: 58, inflation: 9.3, unemployment: 12.7, currency: 'DZD', rating: 'N/A' },
    { name: 'Argentina', code: 'AR', gdp: 0.63, growth: -1.6, debt: 90, inflation: 133.5, unemployment: 6.2, currency: 'ARS', rating: 'CCC' },
    { name: 'Australia', code: 'AU', gdp: 1.55, growth: 1.8, debt: 57, inflation: 5.4, unemployment: 3.7, currency: 'AUD', rating: 'AAA' },
    { name: 'Austria', code: 'AT', gdp: 0.48, growth: 0.4, debt: 78, inflation: 7.7, unemployment: 5.3, currency: 'EUR', rating: 'AA+' },
    { name: 'Bangladesh', code: 'BD', gdp: 0.46, growth: 6.0, debt: 39, inflation: 9.0, unemployment: 5.1, currency: 'BDT', rating: 'BB-' },
    { name: 'Belgium', code: 'BE', gdp: 0.59, growth: 1.4, debt: 105, inflation: 9.6, unemployment: 5.6, currency: 'EUR', rating: 'AA' },
    { name: 'Brazil', code: 'BR', gdp: 2.08, growth: 2.9, debt: 88, inflation: 4.6, unemployment: 8.5, currency: 'BRL', rating: 'BB-' },
    { name: 'Canada', code: 'CA', gdp: 2.14, growth: 1.5, debt: 106, inflation: 3.9, unemployment: 5.4, currency: 'CAD', rating: 'AAA' },
    { name: 'Chile', code: 'CL', gdp: 0.30, growth: 0.2, debt: 39, inflation: 11.6, unemployment: 8.9, currency: 'CLP', rating: 'A' },
    { name: 'China', code: 'CN', gdp: 17.96, growth: 5.2, debt: 77, inflation: 0.2, unemployment: 5.2, currency: 'CNY', rating: 'A+', resources: 'Rare Earth Elements, Coal, Iron Ore, Oil, Natural Gas', knownFor: 'Manufacturing, Technology, Infrastructure, Trade', exports: 'Electronics, Machinery, Textiles, Furniture, Toys', imports: 'Oil, Semiconductors, Iron Ore, Soybeans, Vehicles', military: 'Rank #3 - Budget: $292B, Active: 2.0M', government: 'Socialist Republic (One-Party State)' },
    { name: 'Colombia', code: 'CO', gdp: 0.36, growth: 1.0, debt: 72, inflation: 11.8, unemployment: 10.7, currency: 'COP', rating: 'BB+' },
    { name: 'Czech Republic', code: 'CZ', gdp: 0.29, growth: -0.2, debt: 44, inflation: 15.1, unemployment: 2.6, currency: 'CZK', rating: 'AA-' },
    { name: 'Denmark', code: 'DK', gdp: 0.40, growth: 1.8, debt: 30, inflation: 7.7, unemployment: 4.5, currency: 'DKK', rating: 'AAA' },
    { name: 'Egypt', code: 'EG', gdp: 0.48, growth: 3.8, debt: 95, inflation: 33.7, unemployment: 7.1, currency: 'EGP', rating: 'B' },
    { name: 'Finland', code: 'FI', gdp: 0.30, growth: -0.5, debt: 73, inflation: 7.1, unemployment: 7.2, currency: 'EUR', rating: 'AA+' },
    { name: 'France', code: 'FR', gdp: 2.78, growth: 0.9, debt: 111, inflation: 5.7, unemployment: 7.3, currency: 'EUR', rating: 'AA' },
    { name: 'Germany', code: 'DE', gdp: 4.08, growth: -0.3, debt: 66, inflation: 6.1, unemployment: 3.0, currency: 'EUR', rating: 'AAA', resources: 'Coal, Lignite, Natural Gas, Iron Ore, Timber', knownFor: 'Engineering, Automobiles, Chemicals, Precision Manufacturing', exports: 'Vehicles, Machinery, Chemicals, Electronics, Pharmaceuticals', imports: 'Oil, Natural Gas, Machinery, Vehicles, Electronics', military: 'Rank #16 - Budget: $56B, Active: 184K', government: 'Federal Parliamentary Republic' },
    { name: 'Greece', code: 'GR', gdp: 0.22, growth: 2.0, debt: 171, inflation: 4.2, unemployment: 11.2, currency: 'EUR', rating: 'BB+' },
    { name: 'Hong Kong', code: 'HK', gdp: 0.38, growth: -3.5, debt: 5, inflation: 1.9, unemployment: 4.3, currency: 'HKD', rating: 'AA+' },
    { name: 'Hungary', code: 'HU', gdp: 0.18, growth: -0.9, debt: 73, inflation: 17.0, unemployment: 4.1, currency: 'HUF', rating: 'BBB' },
    { name: 'India', code: 'IN', gdp: 3.73, growth: 7.2, debt: 84, inflation: 5.4, unemployment: 7.8, currency: 'INR', rating: 'BBB-', resources: 'Coal, Iron Ore, Manganese, Mica, Bauxite', knownFor: 'IT Services, Pharmaceuticals, Textiles, Agriculture', exports: 'Petroleum Products, Gems, Machinery, Pharmaceuticals, Textiles', imports: 'Crude Oil, Gold, Electronics, Machinery, Chemicals', military: 'Rank #4 - Budget: $81B, Active: 1.5M', government: 'Federal Parliamentary Republic' },
    { name: 'Indonesia', code: 'ID', gdp: 1.32, growth: 5.3, debt: 39, inflation: 3.7, unemployment: 5.3, currency: 'IDR', rating: 'BBB' },
    { name: 'Iran', code: 'IR', gdp: 0.39, growth: 3.0, debt: 43, inflation: 40.2, unemployment: 9.1, currency: 'IRR', rating: 'N/A' },
    { name: 'Iraq', code: 'IQ', gdp: 0.26, growth: -2.4, debt: 60, inflation: 5.0, unemployment: 16.5, currency: 'IQD', rating: 'B-' },
    { name: 'Ireland', code: 'IE', gdp: 0.53, growth: 9.4, debt: 45, inflation: 8.1, unemployment: 4.5, currency: 'EUR', rating: 'AA-' },
    { name: 'Israel', code: 'IL', gdp: 0.52, growth: 2.0, debt: 60, inflation: 4.4, unemployment: 3.4, currency: 'ILS', rating: 'AA-' },
    { name: 'Italy', code: 'IT', gdp: 2.01, growth: 0.7, debt: 144, inflation: 5.9, unemployment: 7.8, currency: 'EUR', rating: 'BBB' },
    { name: 'Japan', code: 'JP', gdp: 4.23, growth: 1.9, debt: 264, inflation: 3.3, unemployment: 2.6, currency: 'JPY', rating: 'A+', resources: 'Fish, Limited Minerals, Forests', knownFor: 'Automobiles, Electronics, Robotics, Anime', exports: 'Vehicles, Machinery, Electronics, Steel, Chemicals', imports: 'Oil, Natural Gas, Food, Machinery, Textiles', military: 'Rank #8 - Budget: $46B, Active: 247K', government: 'Parliamentary Constitutional Monarchy' },
    { name: 'Kenya', code: 'KE', gdp: 0.11, growth: 5.3, debt: 68, inflation: 7.7, unemployment: 5.7, currency: 'KES', rating: 'B+' },
    { name: 'Malaysia', code: 'MY', gdp: 0.40, growth: 8.7, debt: 60, inflation: 3.4, unemployment: 3.5, currency: 'MYR', rating: 'A-' },
    { name: 'Mexico', code: 'MX', gdp: 1.41, growth: 3.2, debt: 60, inflation: 4.7, unemployment: 2.8, currency: 'MXN', rating: 'BBB' },
    { name: 'Netherlands', code: 'NL', gdp: 1.01, growth: 0.1, debt: 47, inflation: 4.1, unemployment: 3.6, currency: 'EUR', rating: 'AAA' },
    { name: 'New Zealand', code: 'NZ', gdp: 0.25, growth: 2.2, debt: 39, inflation: 7.3, unemployment: 3.3, currency: 'NZD', rating: 'AA' },
    { name: 'Nigeria', code: 'NG', gdp: 0.48, growth: 3.3, debt: 37, inflation: 24.5, unemployment: 33.3, currency: 'NGN', rating: 'B-' },
    { name: 'Norway', code: 'NO', gdp: 0.58, growth: 0.8, debt: 42, inflation: 5.8, unemployment: 3.5, currency: 'NOK', rating: 'AAA' },
    { name: 'Pakistan', code: 'PK', gdp: 0.34, growth: 0.3, debt: 77, inflation: 29.2, unemployment: 6.3, currency: 'PKR', rating: 'CCC+' },
    { name: 'Peru', code: 'PE', gdp: 0.24, growth: -0.6, debt: 35, inflation: 8.5, unemployment: 7.2, currency: 'PEN', rating: 'BBB' },
    { name: 'Philippines', code: 'PH', gdp: 0.44, growth: 5.5, debt: 60, inflation: 5.8, unemployment: 4.5, currency: 'PHP', rating: 'BBB' },
    { name: 'Poland', code: 'PL', gdp: 0.69, growth: 0.2, debt: 49, inflation: 14.4, unemployment: 2.9, currency: 'PLN', rating: 'A-' },
    { name: 'Portugal', code: 'PT', gdp: 0.26, growth: 6.8, debt: 114, inflation: 8.1, unemployment: 6.6, currency: 'EUR', rating: 'BBB+' },
    { name: 'Qatar', code: 'QA', gdp: 0.24, growth: 4.2, debt: 68, inflation: 5.0, unemployment: 0.1, currency: 'QAR', rating: 'AA' },
    { name: 'Romania', code: 'RO', gdp: 0.30, growth: 2.1, debt: 47, inflation: 13.8, unemployment: 5.6, currency: 'RON', rating: 'BBB-' },
    { name: 'Russia', code: 'RU', gdp: 2.24, growth: 2.1, debt: 17, inflation: 5.9, unemployment: 3.3, currency: 'RUB', rating: 'BBB-' },
    { name: 'Saudi Arabia', code: 'SA', gdp: 1.06, growth: 3.7, debt: 26, inflation: 2.3, unemployment: 4.8, currency: 'SAR', rating: 'A' },
    { name: 'Singapore', code: 'SG', gdp: 0.47, growth: 1.1, debt: 168, inflation: 6.1, unemployment: 2.1, currency: 'SGD', rating: 'AAA' },
    { name: 'South Africa', code: 'ZA', gdp: 0.40, growth: 0.6, debt: 71, inflation: 6.9, unemployment: 32.9, currency: 'ZAR', rating: 'BB-' },
    { name: 'South Korea', code: 'KR', gdp: 1.67, growth: 1.4, debt: 54, inflation: 3.6, unemployment: 2.7, currency: 'KRW', rating: 'AA' },
    { name: 'Spain', code: 'ES', gdp: 1.43, growth: 2.5, debt: 113, inflation: 3.5, unemployment: 12.9, currency: 'EUR', rating: 'A' },
    { name: 'Sweden', code: 'SE', gdp: 0.59, growth: -0.2, debt: 33, inflation: 8.4, unemployment: 7.5, currency: 'SEK', rating: 'AAA' },
    { name: 'Switzerland', code: 'CH', gdp: 0.84, growth: 0.9, debt: 38, inflation: 2.2, unemployment: 2.0, currency: 'CHF', rating: 'AAA' },
    { name: 'Taiwan', code: 'TW', gdp: 0.76, growth: 1.4, debt: 28, inflation: 2.9, unemployment: 3.5, currency: 'TWD', rating: 'AA' },
    { name: 'Thailand', code: 'TH', gdp: 0.51, growth: 2.6, debt: 61, inflation: 6.1, unemployment: 1.1, currency: 'THB', rating: 'BBB+' },
    { name: 'Turkey', code: 'TR', gdp: 0.91, growth: 4.5, debt: 31, inflation: 64.8, unemployment: 10.2, currency: 'TRY', rating: 'B+' },
    { name: 'Ukraine', code: 'UA', gdp: 0.16, growth: -29.1, debt: 78, inflation: 26.6, unemployment: 9.9, currency: 'UAH', rating: 'CCC' },
    { name: 'United Arab Emirates', code: 'AE', gdp: 0.50, growth: 3.9, debt: 39, inflation: 4.8, unemployment: 2.7, currency: 'AED', rating: 'AA' },
    { name: 'United Kingdom', code: 'GB', gdp: 3.07, growth: 0.5, debt: 101, inflation: 4.0, unemployment: 4.2, currency: 'GBP', rating: 'AA', resources: 'Oil, Natural Gas, Coal, Limestone, Salt', knownFor: 'Finance, Pharmaceuticals, Aerospace, Creative Industries', exports: 'Machinery, Vehicles, Pharmaceuticals, Oil, Electronics', imports: 'Machinery, Vehicles, Oil, Electronics, Food', military: 'Rank #5 - Budget: $68B, Active: 148K', government: 'Parliamentary Constitutional Monarchy' },
    { name: 'United States', code: 'US', gdp: 25.46, growth: 2.1, debt: 123, inflation: 3.2, unemployment: 3.7, currency: 'USD', rating: 'AA+', resources: 'Oil, Natural Gas, Coal, Timber, Agricultural Land', knownFor: 'Technology, Finance, Entertainment, Military Power', exports: 'Machinery, Electronics, Vehicles, Aircraft, Pharmaceuticals', imports: 'Electronics, Vehicles, Machinery, Oil, Pharmaceuticals', military: 'Rank #1 - Budget: $877B, Active: 1.4M', government: 'Federal Presidential Republic' },
    { name: 'Venezuela', code: 'VE', gdp: 0.10, growth: 4.0, debt: 350, inflation: 234.1, unemployment: 7.9, currency: 'VES', rating: 'N/A' },
    { name: 'Vietnam', code: 'VN', gdp: 0.43, growth: 5.0, debt: 43, inflation: 3.2, unemployment: 2.3, currency: 'VND', rating: 'BB' },
    { name: 'Algeria', code: 'DZ', gdp: 0.19, growth: 3.2, debt: 58, inflation: 9.3, unemployment: 12.7, currency: 'DZD', rating: 'N/A' },
    { name: 'Angola', code: 'AO', gdp: 0.12, growth: 2.9, debt: 120, inflation: 13.7, unemployment: 14.6, currency: 'AOA', rating: 'B-' },
    { name: 'Armenia', code: 'AM', gdp: 0.02, growth: 12.6, debt: 63, inflation: 8.3, unemployment: 18.5, currency: 'AMD', rating: 'BB-' },
    { name: 'Azerbaijan', code: 'AZ', gdp: 0.08, growth: 4.6, debt: 19, inflation: 13.9, unemployment: 6.0, currency: 'AZN', rating: 'BB+' },
    { name: 'Bahrain', code: 'BH', gdp: 0.04, growth: 2.8, debt: 128, inflation: 3.6, unemployment: 1.2, currency: 'BHD', rating: 'B+' },
    { name: 'Belarus', code: 'BY', gdp: 0.07, growth: 3.9, debt: 47, inflation: 15.2, unemployment: 3.6, currency: 'BYN', rating: 'B' },
    { name: 'Bolivia', code: 'BO', gdp: 0.04, growth: 3.5, debt: 79, inflation: 1.7, unemployment: 4.5, currency: 'BOB', rating: 'B+' },
    { name: 'Bosnia', code: 'BA', gdp: 0.02, growth: 3.8, debt: 34, inflation: 14.0, unemployment: 15.7, currency: 'BAM', rating: 'B' },
    { name: 'Botswana', code: 'BW', gdp: 0.02, growth: 5.8, debt: 24, inflation: 8.7, unemployment: 24.9, currency: 'BWP', rating: 'A-' },
    { name: 'Brunei', code: 'BN', gdp: 0.02, growth: 1.4, debt: 3, inflation: 3.7, unemployment: 4.7, currency: 'BND', rating: 'A+' },
    { name: 'Bulgaria', code: 'BG', gdp: 0.09, growth: 2.0, debt: 23, inflation: 15.3, unemployment: 4.3, currency: 'BGN', rating: 'BBB' },
    { name: 'Cambodia', code: 'KH', gdp: 0.03, growth: 5.5, debt: 37, inflation: 5.3, unemployment: 0.3, currency: 'KHR', rating: 'B' },
    { name: 'Cameroon', code: 'CM', gdp: 0.05, growth: 3.6, debt: 46, inflation: 6.3, unemployment: 3.4, currency: 'XAF', rating: 'B' },
    { name: 'Costa Rica', code: 'CR', gdp: 0.07, growth: 4.3, debt: 70, inflation: 8.3, unemployment: 11.7, currency: 'CRC', rating: 'BB' },
    { name: 'Croatia', code: 'HR', gdp: 0.07, growth: 6.3, debt: 71, inflation: 10.7, unemployment: 6.9, currency: 'EUR', rating: 'BBB' },
    { name: 'Cyprus', code: 'CY', gdp: 0.03, growth: 5.1, debt: 88, inflation: 8.4, unemployment: 6.8, currency: 'EUR', rating: 'BBB-' },
    { name: 'Ecuador', code: 'EC', gdp: 0.12, growth: 2.4, debt: 58, inflation: 3.5, unemployment: 3.8, currency: 'USD', rating: 'B-' },
    { name: 'Estonia', code: 'EE', gdp: 0.04, growth: -0.5, debt: 19, inflation: 19.4, unemployment: 5.6, currency: 'EUR', rating: 'AA-' },
    { name: 'Ethiopia', code: 'ET', gdp: 0.16, growth: 6.4, debt: 54, inflation: 33.9, unemployment: 3.8, currency: 'ETB', rating: 'B' },
    { name: 'Finland', code: 'FI', gdp: 0.30, growth: -0.5, debt: 73, inflation: 7.1, unemployment: 7.2, currency: 'EUR', rating: 'AA+' },
    { name: 'Georgia', code: 'GE', gdp: 0.02, growth: 7.5, debt: 41, inflation: 11.9, unemployment: 17.3, currency: 'GEL', rating: 'BB' },
    { name: 'Ghana', code: 'GH', gdp: 0.08, growth: 2.9, debt: 88, inflation: 54.1, unemployment: 4.5, currency: 'GHS', rating: 'B-' },
    { name: 'Greece', code: 'GR', gdp: 0.22, growth: 2.0, debt: 171, inflation: 4.2, unemployment: 11.2, currency: 'EUR', rating: 'BB+' },
    { name: 'Guatemala', code: 'GT', gdp: 0.10, growth: 4.1, debt: 31, inflation: 6.9, unemployment: 2.5, currency: 'GTQ', rating: 'BB' },
    { name: 'Honduras', code: 'HN', gdp: 0.03, growth: 4.0, debt: 52, inflation: 9.1, unemployment: 8.5, currency: 'HNL', rating: 'B+' },
    { name: 'Hong Kong', code: 'HK', gdp: 0.38, growth: -3.5, debt: 5, inflation: 1.9, unemployment: 4.3, currency: 'HKD', rating: 'AA+' },
    { name: 'Hungary', code: 'HU', gdp: 0.18, growth: -0.9, debt: 73, inflation: 17.0, unemployment: 4.1, currency: 'HUF', rating: 'BBB' },
    { name: 'Iceland', code: 'IS', gdp: 0.03, growth: 5.1, debt: 72, inflation: 8.3, unemployment: 3.8, currency: 'ISK', rating: 'A' },
    { name: 'Iran', code: 'IR', gdp: 0.39, growth: 3.0, debt: 43, inflation: 40.2, unemployment: 9.1, currency: 'IRR', rating: 'N/A' },
    { name: 'Iraq', code: 'IQ', gdp: 0.26, growth: -2.4, debt: 60, inflation: 5.0, unemployment: 16.5, currency: 'IQD', rating: 'B-' },
    { name: 'Ireland', code: 'IE', gdp: 0.53, growth: 9.4, debt: 45, inflation: 8.1, unemployment: 4.5, currency: 'EUR', rating: 'AA-' },
    { name: 'Jamaica', code: 'JM', gdp: 0.02, growth: 4.6, debt: 95, inflation: 10.3, unemployment: 4.5, currency: 'JMD', rating: 'B+' },
    { name: 'Jordan', code: 'JO', gdp: 0.05, growth: 2.4, debt: 95, inflation: 4.2, unemployment: 22.6, currency: 'JOD', rating: 'BB-' },
    { name: 'Kazakhstan', code: 'KZ', gdp: 0.22, growth: 5.1, debt: 26, inflation: 15.0, unemployment: 4.9, currency: 'KZT', rating: 'BBB-' },
    { name: 'Kenya', code: 'KE', gdp: 0.11, growth: 5.3, debt: 68, inflation: 7.7, unemployment: 5.7, currency: 'KES', rating: 'B+' },
    { name: 'Kuwait', code: 'KW', gdp: 0.16, growth: 2.6, debt: 9, inflation: 3.5, unemployment: 2.1, currency: 'KWD', rating: 'AA' },
    { name: 'Latvia', code: 'LV', gdp: 0.04, growth: 2.8, debt: 43, inflation: 17.3, unemployment: 6.9, currency: 'EUR', rating: 'A-' },
    { name: 'Lebanon', code: 'LB', gdp: 0.02, growth: -10.5, debt: 183, inflation: 171.2, unemployment: 29.6, currency: 'LBP', rating: 'SD' },
    { name: 'Libya', code: 'LY', gdp: 0.05, growth: -1.2, debt: 155, inflation: 4.5, unemployment: 19.6, currency: 'LYD', rating: 'N/A' },
    { name: 'Lithuania', code: 'LT', gdp: 0.07, growth: 1.9, debt: 38, inflation: 19.7, unemployment: 7.1, currency: 'EUR', rating: 'A' },
    { name: 'Luxembourg', code: 'LU', gdp: 0.09, growth: 1.4, debt: 25, inflation: 6.3, unemployment: 5.3, currency: 'EUR', rating: 'AAA' },
    { name: 'Malaysia', code: 'MY', gdp: 0.40, growth: 8.7, debt: 60, inflation: 3.4, unemployment: 3.5, currency: 'MYR', rating: 'A-' },
    { name: 'Malta', code: 'MT', gdp: 0.02, growth: 6.9, debt: 54, inflation: 6.1, unemployment: 2.9, currency: 'EUR', rating: 'A-' },
    { name: 'Mauritius', code: 'MU', gdp: 0.01, growth: 8.7, debt: 93, inflation: 10.8, unemployment: 7.2, currency: 'MUR', rating: 'BBB+' },
    { name: 'Mongolia', code: 'MN', gdp: 0.02, growth: 5.2, debt: 79, inflation: 15.2, unemployment: 6.6, currency: 'MNT', rating: 'B' },
    { name: 'Morocco', code: 'MA', gdp: 0.14, growth: 1.3, debt: 70, inflation: 6.6, unemployment: 11.8, currency: 'MAD', rating: 'BBB-' },
    { name: 'Mozambique', code: 'MZ', gdp: 0.02, growth: 4.3, debt: 102, inflation: 9.8, unemployment: 3.9, currency: 'MZN', rating: 'CCC+' },
    { name: 'Myanmar', code: 'MM', gdp: 0.08, growth: 3.0, debt: 50, inflation: 18.6, unemployment: 1.7, currency: 'MMK', rating: 'N/A' },
    { name: 'Namibia', code: 'NA', gdp: 0.01, growth: 3.5, debt: 69, inflation: 6.1, unemployment: 33.4, currency: 'NAD', rating: 'BB' },
    { name: 'Nepal', code: 'NP', gdp: 0.04, growth: 5.6, debt: 42, inflation: 7.7, unemployment: 11.4, currency: 'NPR', rating: 'B+' },
    { name: 'New Zealand', code: 'NZ', gdp: 0.25, growth: 2.2, debt: 39, inflation: 7.3, unemployment: 3.3, currency: 'NZD', rating: 'AA' },
    { name: 'Nicaragua', code: 'NI', gdp: 0.02, growth: 3.8, debt: 58, inflation: 10.5, unemployment: 5.9, currency: 'NIO', rating: 'B-' },
    { name: 'Norway', code: 'NO', gdp: 0.58, growth: 0.8, debt: 42, inflation: 5.8, unemployment: 3.5, currency: 'NOK', rating: 'AAA' },
    { name: 'Oman', code: 'OM', gdp: 0.11, growth: 4.0, debt: 62, inflation: 2.8, unemployment: 1.7, currency: 'OMR', rating: 'BB' },
    { name: 'Panama', code: 'PA', gdp: 0.08, growth: 10.8, debt: 63, inflation: 2.9, unemployment: 10.2, currency: 'PAB', rating: 'BBB' },
    { name: 'Paraguay', code: 'PY', gdp: 0.04, growth: 0.2, debt: 38, inflation: 9.8, unemployment: 6.6, currency: 'PYG', rating: 'BB' },
    { name: 'Peru', code: 'PE', gdp: 0.24, growth: -0.6, debt: 35, inflation: 8.5, unemployment: 7.2, currency: 'PEN', rating: 'BBB' },
    { name: 'Philippines', code: 'PH', gdp: 0.44, growth: 5.5, debt: 60, inflation: 5.8, unemployment: 4.5, currency: 'PHP', rating: 'BBB' },
    { name: 'Portugal', code: 'PT', gdp: 0.26, growth: 6.8, debt: 114, inflation: 8.1, unemployment: 6.6, currency: 'EUR', rating: 'BBB+' },
    { name: 'Qatar', code: 'QA', gdp: 0.24, growth: 4.2, debt: 68, inflation: 5.0, unemployment: 0.1, currency: 'QAR', rating: 'AA' },
    { name: 'Romania', code: 'RO', gdp: 0.30, growth: 2.1, debt: 47, inflation: 13.8, unemployment: 5.6, currency: 'RON', rating: 'BBB-' },
    { name: 'Rwanda', code: 'RW', gdp: 0.01, growth: 8.2, debt: 73, inflation: 13.9, unemployment: 16.0, currency: 'RWF', rating: 'B+' },
    { name: 'Senegal', code: 'SN', gdp: 0.03, growth: 4.0, debt: 73, inflation: 9.7, unemployment: 3.5, currency: 'XOF', rating: 'B+' },
    { name: 'Serbia', code: 'RS', gdp: 0.07, growth: 2.5, debt: 56, inflation: 12.0, unemployment: 9.5, currency: 'RSD', rating: 'BB+' },
    { name: 'Singapore', code: 'SG', gdp: 0.47, growth: 1.1, debt: 168, inflation: 6.1, unemployment: 2.1, currency: 'SGD', rating: 'AAA' },
    { name: 'Slovakia', code: 'SK', gdp: 0.12, growth: 1.7, debt: 58, inflation: 12.1, unemployment: 6.1, currency: 'EUR', rating: 'A+' },
    { name: 'Slovenia', code: 'SI', gdp: 0.07, growth: 2.5, debt: 74, inflation: 10.1, unemployment: 4.5, currency: 'EUR', rating: 'AA-' },
    { name: 'Sri Lanka', code: 'LK', gdp: 0.07, growth: -7.8, debt: 111, inflation: 49.7, unemployment: 5.4, currency: 'LKR', rating: 'SD' },
    { name: 'Sweden', code: 'SE', gdp: 0.59, growth: -0.2, debt: 33, inflation: 8.4, unemployment: 7.5, currency: 'SEK', rating: 'AAA' },
    { name: 'Taiwan', code: 'TW', gdp: 0.76, growth: 1.4, debt: 28, inflation: 2.9, unemployment: 3.5, currency: 'TWD', rating: 'AA' },
    { name: 'Tanzania', code: 'TZ', gdp: 0.08, growth: 4.7, debt: 41, inflation: 4.4, unemployment: 2.6, currency: 'TZS', rating: 'B+' },
    { name: 'Thailand', code: 'TH', gdp: 0.51, growth: 2.6, debt: 61, inflation: 6.1, unemployment: 1.1, currency: 'THB', rating: 'BBB+' },
    { name: 'Tunisia', code: 'TN', gdp: 0.05, growth: 2.6, debt: 88, inflation: 9.3, unemployment: 16.1, currency: 'TND', rating: 'B-' },
    { name: 'Uganda', code: 'UG', gdp: 0.05, growth: 5.3, debt: 52, inflation: 7.2, unemployment: 2.9, currency: 'UGX', rating: 'B' },
    { name: 'Ukraine', code: 'UA', gdp: 0.16, growth: -29.1, debt: 78, inflation: 26.6, unemployment: 9.9, currency: 'UAH', rating: 'CCC' },
    { name: 'Uruguay', code: 'UY', gdp: 0.07, growth: 4.9, debt: 66, inflation: 9.1, unemployment: 8.3, currency: 'UYU', rating: 'BBB' },
    { name: 'Uzbekistan', code: 'UZ', gdp: 0.08, growth: 5.7, debt: 38, inflation: 11.4, unemployment: 9.0, currency: 'UZS', rating: 'BB-' },
    { name: 'Zambia', code: 'ZM', gdp: 0.03, growth: 4.7, debt: 123, inflation: 11.0, unemployment: 12.7, currency: 'ZMW', rating: 'SD' },
    { name: 'Zimbabwe', code: 'ZW', gdp: 0.03, growth: 3.5, debt: 102, inflation: 193.4, unemployment: 5.0, currency: 'ZWL', rating: 'N/A' },
    { name: 'Afghanistan', code: 'AF', gdp: 0.02, growth: -6.2, debt: 7, inflation: 2.3, unemployment: 13.3, currency: 'AFN', rating: 'N/A' },
    { name: 'Albania', code: 'AL', gdp: 0.02, growth: 3.5, debt: 74, inflation: 6.7, unemployment: 11.6, currency: 'ALL', rating: 'B+' },
    { name: 'Austria', code: 'AT', gdp: 0.48, growth: 0.4, debt: 78, inflation: 7.7, unemployment: 5.3, currency: 'EUR', rating: 'AA+' },
    { name: 'Belgium', code: 'BE', gdp: 0.59, growth: 1.4, debt: 105, inflation: 9.6, unemployment: 5.6, currency: 'EUR', rating: 'AA' },
    { name: 'Chile', code: 'CL', gdp: 0.30, growth: 0.2, debt: 39, inflation: 11.6, unemployment: 8.9, currency: 'CLP', rating: 'A' },
    { name: 'Colombia', code: 'CO', gdp: 0.36, growth: 1.0, debt: 72, inflation: 11.8, unemployment: 10.7, currency: 'COP', rating: 'BB+' },
    { name: 'Czech Republic', code: 'CZ', gdp: 0.29, growth: -0.2, debt: 44, inflation: 15.1, unemployment: 2.6, currency: 'CZK', rating: 'AA-' },
    { name: 'Denmark', code: 'DK', gdp: 0.40, growth: 1.8, debt: 30, inflation: 7.7, unemployment: 4.5, currency: 'DKK', rating: 'AAA' },
    { name: 'Dominican Republic', code: 'DO', gdp: 0.11, growth: 4.9, debt: 60, inflation: 8.8, unemployment: 5.6, currency: 'DOP', rating: 'BB-' },
    { name: 'El Salvador', code: 'SV', gdp: 0.03, growth: 2.6, debt: 84, inflation: 7.2, unemployment: 6.5, currency: 'USD', rating: 'CCC+' },
    { name: 'Fiji', code: 'FJ', gdp: 0.01, growth: 19.6, debt: 83, inflation: 4.3, unemployment: 4.5, currency: 'FJD', rating: 'B+' },
    { name: 'Gabon', code: 'GA', gdp: 0.02, growth: 3.0, debt: 76, inflation: 4.3, unemployment: 21.0, currency: 'XAF', rating: 'B-' },
    { name: 'Gambia', code: 'GM', gdp: 0.002, growth: 5.3, debt: 83, inflation: 11.5, unemployment: 9.1, currency: 'GMD', rating: 'B' },
    { name: 'Guinea', code: 'GN', gdp: 0.02, growth: 5.6, debt: 42, inflation: 12.6, unemployment: 4.3, currency: 'GNF', rating: 'B-' },
    { name: 'Guyana', code: 'GY', gdp: 0.01, growth: 62.3, debt: 46, inflation: 5.7, unemployment: 13.5, currency: 'GYD', rating: 'BB-' },
    { name: 'Haiti', code: 'HT', gdp: 0.02, growth: -1.8, debt: 53, inflation: 26.8, unemployment: 14.6, currency: 'HTG', rating: 'CCC-' },
    { name: 'Laos', code: 'LA', gdp: 0.02, growth: 2.5, debt: 88, inflation: 23.0, unemployment: 1.0, currency: 'LAK', rating: 'B-' },
    { name: 'Lesotho', code: 'LS', gdp: 0.002, growth: 2.5, debt: 56, inflation: 8.3, unemployment: 24.6, currency: 'LSL', rating: 'B' },
    { name: 'Liberia', code: 'LR', gdp: 0.004, growth: 4.8, debt: 56, inflation: 7.6, unemployment: 3.1, currency: 'LRD', rating: 'B-' },
    { name: 'Macao', code: 'MO', gdp: 0.03, growth: -21.7, debt: 0, inflation: 1.0, unemployment: 2.9, currency: 'MOP', rating: 'AA' },
    { name: 'Madagascar', code: 'MG', gdp: 0.02, growth: 4.0, debt: 48, inflation: 8.2, unemployment: 1.8, currency: 'MGA', rating: 'B-' },
    { name: 'Malawi', code: 'MW', gdp: 0.01, growth: 0.9, debt: 72, inflation: 20.9, unemployment: 5.8, currency: 'MWK', rating: 'B-' },
    { name: 'Maldives', code: 'MV', gdp: 0.006, growth: 13.9, debt: 124, inflation: 2.3, unemployment: 5.0, currency: 'MVR', rating: 'B+' },
    { name: 'Mali', code: 'ML', gdp: 0.02, growth: 3.7, debt: 50, inflation: 9.6, unemployment: 7.1, currency: 'XOF', rating: 'B-' },
    { name: 'Mauritania', code: 'MR', gdp: 0.01, growth: 2.4, debt: 57, inflation: 9.5, unemployment: 11.5, currency: 'MRU', rating: 'B' },
    { name: 'Moldova', code: 'MD', gdp: 0.01, growth: -5.9, debt: 35, inflation: 28.7, unemployment: 3.8, currency: 'MDL', rating: 'B-' },
    { name: 'Montenegro', code: 'ME', gdp: 0.006, growth: 6.1, debt: 103, inflation: 13.0, unemployment: 15.0, currency: 'EUR', rating: 'B+' },
    { name: 'Niger', code: 'NE', gdp: 0.02, growth: 7.0, debt: 54, inflation: 4.2, unemployment: 0.7, currency: 'XOF', rating: 'B' },
    { name: 'North Macedonia', code: 'MK', gdp: 0.01, growth: 2.1, debt: 60, inflation: 14.2, unemployment: 14.5, currency: 'MKD', rating: 'BB-' },
    { name: 'Papua New Guinea', code: 'PG', gdp: 0.03, growth: 4.5, debt: 48, inflation: 5.5, unemployment: 2.7, currency: 'PGK', rating: 'B' },
    { name: 'Suriname', code: 'SR', gdp: 0.003, growth: 3.5, debt: 124, inflation: 52.4, unemployment: 8.9, currency: 'SRD', rating: 'SD' },
    { name: 'Tajikistan', code: 'TJ', gdp: 0.01, growth: 8.0, debt: 50, inflation: 8.0, unemployment: 7.0, currency: 'TJS', rating: 'B-' },
    { name: 'Togo', code: 'TG', gdp: 0.01, growth: 5.8, debt: 65, inflation: 7.6, unemployment: 3.9, currency: 'XOF', rating: 'B' },
    { name: 'Trinidad and Tobago', code: 'TT', gdp: 0.03, growth: 2.6, debt: 78, inflation: 5.2, unemployment: 4.9, currency: 'TTD', rating: 'BBB-' },
    { name: 'Turkmenistan', code: 'TM', gdp: 0.06, growth: 6.2, debt: 28, inflation: 13.0, unemployment: 4.0, currency: 'TMT', rating: 'N/A' },
    { name: 'Bahamas', code: 'BS', gdp: 0.01, growth: 14.4, debt: 100, inflation: 5.6, unemployment: 9.9, currency: 'BSD', rating: 'BB+' },
    { name: 'Barbados', code: 'BB', gdp: 0.005, growth: 11.3, debt: 126, inflation: 4.1, unemployment: 9.8, currency: 'BBD', rating: 'B+' },
    { name: 'Belize', code: 'BZ', gdp: 0.003, growth: 9.5, debt: 93, inflation: 6.2, unemployment: 9.0, currency: 'BZD', rating: 'B-' },
    { name: 'Benin', code: 'BJ', gdp: 0.02, growth: 6.3, debt: 54, inflation: 1.7, unemployment: 1.6, currency: 'XOF', rating: 'B+' },
    { name: 'Bhutan', code: 'BT', gdp: 0.003, growth: 4.5, debt: 131, inflation: 5.6, unemployment: 5.0, currency: 'BTN', rating: 'BB' },
    { name: 'Burkina Faso', code: 'BF', gdp: 0.02, growth: 6.9, debt: 54, inflation: 14.3, unemployment: 5.0, currency: 'XOF', rating: 'B' },
    { name: 'Burundi', code: 'BI', gdp: 0.003, growth: 3.1, debt: 66, inflation: 18.8, unemployment: 1.0, currency: 'BIF', rating: 'N/A' },
    { name: 'Cape Verde', code: 'CV', gdp: 0.002, growth: 17.0, debt: 155, inflation: 7.9, unemployment: 14.8, currency: 'CVE', rating: 'B' },
    { name: 'Central African Republic', code: 'CF', gdp: 0.003, growth: 0.5, debt: 50, inflation: 5.3, unemployment: 6.9, currency: 'XAF', rating: 'N/A' },
    { name: 'Chad', code: 'TD', gdp: 0.01, growth: -1.2, debt: 52, inflation: 5.8, unemployment: 1.9, currency: 'XAF', rating: 'CCC+' },
    { name: 'Comoros', code: 'KM', gdp: 0.001, growth: 2.0, debt: 25, inflation: 7.5, unemployment: 4.3, currency: 'KMF', rating: 'N/A' },
    { name: 'Congo', code: 'CG', gdp: 0.01, growth: 1.8, debt: 107, inflation: 3.0, unemployment: 9.2, currency: 'XAF', rating: 'CCC' },
    { name: 'Djibouti', code: 'DJ', gdp: 0.004, growth: 4.5, debt: 39, inflation: 5.2, unemployment: 27.0, currency: 'DJF', rating: 'B+' },
    { name: 'Equatorial Guinea', code: 'GQ', gdp: 0.01, growth: -6.1, debt: 43, inflation: 4.8, unemployment: 8.7, currency: 'XAF', rating: 'CCC+' },
    { name: 'Eritrea', code: 'ER', gdp: 0.002, growth: 3.8, debt: 176, inflation: 5.0, unemployment: 5.8, currency: 'ERN', rating: 'N/A' },
    { name: 'Eswatini', code: 'SZ', gdp: 0.005, growth: 3.7, debt: 50, inflation: 4.8, unemployment: 23.4, currency: 'SZL', rating: 'B' },
    { name: 'Grenada', code: 'GD', gdp: 0.001, growth: 6.4, debt: 70, inflation: 2.6, unemployment: 24.0, currency: 'XCD', rating: 'BB-' },
    { name: 'Guinea-Bissau', code: 'GW', gdp: 0.002, growth: 6.4, debt: 76, inflation: 7.9, unemployment: 6.3, currency: 'XOF', rating: 'N/A' },
    { name: 'Kyrgyzstan', code: 'KG', gdp: 0.01, growth: 7.0, debt: 70, inflation: 13.9, unemployment: 6.6, currency: 'KGS', rating: 'B' },
    { name: 'Liechtenstein', code: 'LI', gdp: 0.007, growth: 4.4, debt: 0, inflation: 2.8, unemployment: 2.4, currency: 'CHF', rating: 'AAA' },
    { name: 'Monaco', code: 'MC', gdp: 0.008, growth: 9.2, debt: 0, inflation: 2.5, unemployment: 2.0, currency: 'EUR', rating: 'N/A' },
    { name: 'San Marino', code: 'SM', gdp: 0.002, growth: 7.1, debt: 25, inflation: 3.2, unemployment: 8.1, currency: 'EUR', rating: 'BBB' },
    { name: 'Seychelles', code: 'SC', gdp: 0.002, growth: 9.7, debt: 80, inflation: 8.3, unemployment: 3.0, currency: 'SCR', rating: 'B+' },
    { name: 'Sierra Leone', code: 'SL', gdp: 0.005, growth: 3.2, debt: 76, inflation: 27.2, unemployment: 4.5, currency: 'SLL', rating: 'CCC+' },
    { name: 'Somalia', code: 'SO', gdp: 0.01, growth: 2.9, debt: 64, inflation: 6.7, unemployment: 13.0, currency: 'SOS', rating: 'N/A' },
    { name: 'South Sudan', code: 'SS', gdp: 0.01, growth: -5.3, debt: 62, inflation: 29.7, unemployment: 12.2, currency: 'SSP', rating: 'N/A' },
    { name: 'Sudan', code: 'SD', gdp: 0.05, growth: -2.5, debt: 256, inflation: 138.8, unemployment: 19.8, currency: 'SDG', rating: 'N/A' },
    { name: 'Syria', code: 'SY', gdp: 0.09, growth: 4.5, debt: 28, inflation: 139.0, unemployment: 50.0, currency: 'SYP', rating: 'N/A' },
    { name: 'Timor-Leste', code: 'TL', gdp: 0.003, growth: 2.9, debt: 8, inflation: 7.5, unemployment: 4.7, currency: 'USD', rating: 'B+' },
    { name: 'Tonga', code: 'TO', gdp: 0.0005, growth: -2.7, debt: 48, inflation: 7.4, unemployment: 1.1, currency: 'TOP', rating: 'B+' },
    { name: 'Vanuatu', code: 'VU', gdp: 0.001, growth: 2.3, debt: 48, inflation: 5.3, unemployment: 1.7, currency: 'VUV', rating: 'B' },
    { name: 'Yemen', code: 'YE', gdp: 0.03, growth: -2.0, debt: 74, inflation: 42.0, unemployment: 13.0, currency: 'YER', rating: 'N/A' },
    { name: 'Andorra', code: 'AD', gdp: 0.003, growth: 8.9, debt: 41, inflation: 4.8, unemployment: 3.6, currency: 'EUR', rating: 'N/A' },
    { name: 'Antigua and Barbuda', code: 'AG', gdp: 0.002, growth: 8.3, debt: 90, inflation: 7.5, unemployment: 11.0, currency: 'XCD', rating: 'B+' },
    { name: 'Aruba', code: 'AW', gdp: 0.003, growth: 8.9, debt: 86, inflation: 4.3, unemployment: 7.7, currency: 'AWG', rating: 'BBB' },
    { name: 'Bermuda', code: 'BM', gdp: 0.007, growth: 6.9, debt: 43, inflation: 1.9, unemployment: 6.0, currency: 'BMD', rating: 'A+' },
    { name: 'Cayman Islands', code: 'KY', gdp: 0.006, growth: 8.5, debt: 13, inflation: 2.0, unemployment: 4.0, currency: 'KYD', rating: 'AA-' },
    { name: 'Curacao', code: 'CW', gdp: 0.003, growth: 4.2, debt: 33, inflation: 2.6, unemployment: 13.0, currency: 'ANG', rating: 'BB+' },
    { name: 'Dominica', code: 'DM', gdp: 0.0006, growth: 5.6, debt: 83, inflation: 7.8, unemployment: 23.0, currency: 'XCD', rating: 'B+' },
    { name: 'Greenland', code: 'GL', gdp: 0.003, growth: 2.5, debt: 5, inflation: 3.7, unemployment: 9.1, currency: 'DKK', rating: 'N/A' },
    { name: 'Guam', code: 'GU', gdp: 0.006, growth: 1.1, debt: 32, inflation: 1.0, unemployment: 5.5, currency: 'USD', rating: 'N/A' },
    { name: 'Isle of Man', code: 'IM', gdp: 0.007, growth: 2.1, debt: 0, inflation: 4.1, unemployment: 1.1, currency: 'GBP', rating: 'N/A' },
    { name: 'Kosovo', code: 'XK', gdp: 0.01, growth: 10.5, debt: 24, inflation: 11.6, unemployment: 25.8, currency: 'EUR', rating: 'B+' },
    { name: 'North Korea', code: 'KP', gdp: 0.03, growth: -4.5, debt: 5, inflation: 15.0, unemployment: 3.0, currency: 'KPW', rating: 'N/A' },
    { name: 'Palestine', code: 'PS', gdp: 0.02, growth: 3.9, debt: 35, inflation: 3.7, unemployment: 26.4, currency: 'ILS', rating: 'N/A' },
    { name: 'Puerto Rico', code: 'PR', gdp: 0.11, growth: 0.5, debt: 53, inflation: 5.3, unemployment: 6.0, currency: 'USD', rating: 'D' },
    { name: 'Saint Lucia', code: 'LC', gdp: 0.002, growth: 12.2, debt: 83, inflation: 6.4, unemployment: 20.2, currency: 'XCD', rating: 'BB-' },
    { name: 'Samoa', code: 'WS', gdp: 0.001, growth: -7.1, debt: 49, inflation: 10.9, unemployment: 8.7, currency: 'WST', rating: 'B+' },
    { name: 'Sao Tome and Principe', code: 'ST', gdp: 0.0005, growth: 1.9, debt: 97, inflation: 17.9, unemployment: 13.0, currency: 'STN', rating: 'B-' },
    { name: 'St Kitts and Nevis', code: 'KN', gdp: 0.001, growth: 8.6, debt: 58, inflation: 2.7, unemployment: 5.0, currency: 'XCD', rating: 'BB+' },
    { name: 'St Vincent Grenadines', code: 'VC', gdp: 0.001, growth: 7.8, debt: 85, inflation: 5.7, unemployment: 18.7, currency: 'XCD', rating: 'B+' },
    { name: 'Vatican City', code: 'VA', gdp: 0.0001, growth: 0.0, debt: 0, inflation: 0.0, unemployment: 0.0, currency: 'EUR', rating: 'N/A' }
];

const initCountryFinancial = async () => {
    // Show loading state
    const grid = document.getElementById('countries-grid');
    if (grid) {
        grid.innerHTML = '<div class="country-loading"><ion-icon name="sync"></ion-icon><p>Loading country data...</p></div>';
    }
    
    try {
        // Fetch all countries from REST Countries API
        console.log('Fetching countries from API...');
        const response = await fetch('https://restcountries.com/v3.1/all');
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        console.log('API response status:', response.status);
        const allCountries = await response.json();
        console.log('Fetched countries from API:', allCountries.length);
        
        if (!allCountries || allCountries.length === 0) {
            throw new Error('No countries returned from API');
        }
        
        // Enrich with our financial data
        const enrichedData = allCountries.map(country => {
            const existing = countryFinancialData.find(c => c.code === country.cca2);
            
            return {
                name: country.name.common,
                code: country.cca2,
                gdp: existing?.gdp || estimateGDP(country),
                growth: existing?.growth || estimateGrowth(country),
                debt: existing?.debt || estimateDebt(country),
                inflation: existing?.inflation || estimateInflation(country),
                unemployment: existing?.unemployment || estimateUnemployment(country),
                currency: Object.keys(country.currencies || {})[0] || 'N/A',
                rating: existing?.rating || estimateRating(country),
                resources: (existing?.resources) ? existing.resources : getCountryResources(country),
                knownFor: (existing?.knownFor) ? existing.knownFor : getCountryKnownFor(country),
                exports: (existing?.exports) ? existing.exports : getCountryExports(country),
                imports: (existing?.imports) ? existing.imports : getCountryImports(country),
                military: (existing?.military) ? existing.military : getMilitaryInfo(country),
                government: (existing?.government) ? existing.government : getGovernmentType(country.name.common),
                population: country.population,
                capital: country.capital?.[0] || 'N/A',
                region: country.region,
                subregion: country.subregion,
                languages: Object.values(country.languages || {}).join(', ') || 'N/A',
                area: country.area
            };
        });
        
        // Remove duplicates based on country code
        const uniqueCountries = enrichedData.reduce((acc, country) => {
            if (!acc.find(c => c.code === country.code)) {
                acc.push(country);
            }
            return acc;
        }, []);
        
        countriesData = uniqueCountries.sort((a, b) => a.name.localeCompare(b.name));
        console.log('Loaded countries:', countriesData.length);
        console.log('Sample country data:', countriesData[0]);
        renderCountries();
    } catch (error) {
        console.error('Error fetching country data:', error);
        // Fallback to static data with enrichment and deduplication
        const enrichedFallback = countryFinancialData.map(country => ({
            ...country,
            resources: country.resources || getCountryResources({ region: 'Unknown', subregion: '' }),
            knownFor: country.knownFor || getCountryKnownFor({ region: 'Unknown' }),
            exports: country.exports || getCountryExports({ region: 'Unknown' }),
            imports: country.imports || getCountryImports({ region: 'Unknown' }),
            military: country.military || getMilitaryInfo({ population: 50000000 }),
            government: country.government || 'Republic',
            population: country.population || 0,
            capital: country.capital || 'N/A',
            region: country.region || 'Unknown',
            subregion: country.subregion || 'Unknown'
        }));
        
        // Remove duplicates
        const uniqueFallback = enrichedFallback.reduce((acc, country) => {
            if (!acc.find(c => c.code === country.code)) {
                acc.push(country);
            }
            return acc;
        }, []);
        
        countriesData = uniqueFallback.sort((a, b) => a.name.localeCompare(b.name));
        console.log('Using fallback data:', countriesData.length, 'countries');
        renderCountries();
    }
    
    // Add search functionality
    const searchInput = document.getElementById('country-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = countriesData.filter(country => 
                country.name.toLowerCase().includes(searchTerm)
            );
            const tempData = countriesData;
            countriesData = filtered;
            renderCountries();
            if (searchTerm === '') countriesData = tempData;
        });
    }
};

const estimateGDP = (country) => {
    const pop = country.population;
    if (pop > 1000000000) return (Math.random() * 20 + 5).toFixed(2);
    if (pop > 100000000) return (Math.random() * 5 + 1).toFixed(2);
    if (pop > 50000000) return (Math.random() * 2 + 0.5).toFixed(2);
    if (pop > 10000000) return (Math.random() * 1 + 0.1).toFixed(2);
    return (Math.random() * 0.5 + 0.01).toFixed(2);
};

const estimateGrowth = (country) => {
    const region = country.region;
    if (region === 'Asia') return (Math.random() * 8 - 1).toFixed(1);
    if (region === 'Africa') return (Math.random() * 6 - 1).toFixed(1);
    if (region === 'Europe') return (Math.random() * 4 - 1).toFixed(1);
    return (Math.random() * 5 - 1).toFixed(1);
};

const estimateDebt = (country) => {
    return Math.floor(Math.random() * 150 + 20);
};

const estimateInflation = (country) => {
    return (Math.random() * 15 + 1).toFixed(1);
};

const estimateUnemployment = (country) => {
    return (Math.random() * 20 + 2).toFixed(1);
};

const estimateRating = (country) => {
    const ratings = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-'];
    const region = country.region;
    if (region === 'Europe') return ratings[Math.floor(Math.random() * 8)];
    if (region === 'Asia') return ratings[Math.floor(Math.random() * 12)];
    return ratings[Math.floor(Math.random() * ratings.length)];
};

const getCountryResources = (country) => {
    const region = country.region;
    const subregion = country.subregion;
    
    const resourcesByRegion = {
        'Africa': ['Gold', 'Diamonds', 'Oil', 'Natural Gas', 'Copper', 'Cobalt', 'Agricultural Land', 'Timber', 'Iron Ore', 'Uranium'],
        'Asia': ['Oil', 'Natural Gas', 'Coal', 'Rare Earth Elements', 'Tin', 'Rubber', 'Palm Oil', 'Rice', 'Tea', 'Spices'],
        'Europe': ['Coal', 'Natural Gas', 'Timber', 'Iron Ore', 'Hydropower', 'Wind Energy', 'Agricultural Land', 'Fish'],
        'Americas': ['Oil', 'Natural Gas', 'Gold', 'Silver', 'Copper', 'Soybeans', 'Corn', 'Timber', 'Lithium', 'Coffee'],
        'Oceania': ['Iron Ore', 'Coal', 'Gold', 'Natural Gas', 'Uranium', 'Bauxite', 'Nickel', 'Zinc', 'Agricultural Land']
    };
    
    const resources = resourcesByRegion[region] || ['Natural Resources', 'Agricultural Products'];
    return resources.slice(0, 5).join(', ');
};

const getCountryKnownFor = (country) => {
    const region = country.region;
    const pop = country.population;
    
    const knownForByRegion = {
        'Africa': ['Mining', 'Agriculture', 'Tourism', 'Oil Production', 'Wildlife'],
        'Asia': ['Manufacturing', 'Technology', 'Textiles', 'Electronics', 'Trade', 'Tourism'],
        'Europe': ['Manufacturing', 'Tourism', 'Finance', 'Technology', 'Luxury Goods', 'Automotive'],
        'Americas': ['Agriculture', 'Manufacturing', 'Technology', 'Finance', 'Entertainment', 'Mining'],
        'Oceania': ['Mining', 'Agriculture', 'Tourism', 'Education Services', 'Wine']
    };
    
    const items = knownForByRegion[region] || ['Trade', 'Services'];
    return items.slice(0, 4).join(', ');
};

const getCountryExports = (country) => {
    const region = country.region;
    
    const exportsByRegion = {
        'Africa': ['Oil', 'Minerals', 'Agricultural Products', 'Metals', 'Textiles'],
        'Asia': ['Electronics', 'Machinery', 'Textiles', 'Vehicles', 'Chemicals', 'Food Products'],
        'Europe': ['Machinery', 'Vehicles', 'Pharmaceuticals', 'Chemicals', 'Food', 'Electronics'],
        'Americas': ['Machinery', 'Vehicles', 'Agricultural Products', 'Oil', 'Minerals', 'Electronics'],
        'Oceania': ['Minerals', 'Agricultural Products', 'Meat', 'Wool', 'Wine', 'Education Services']
    };
    
    const exports = exportsByRegion[region] || ['Various Goods', 'Services'];
    return exports.slice(0, 5).join(', ');
};

const getCountryImports = (country) => {
    const region = country.region;
    
    const importsByRegion = {
        'Africa': ['Machinery', 'Vehicles', 'Food', 'Pharmaceuticals', 'Electronics', 'Oil'],
        'Asia': ['Oil', 'Machinery', 'Electronics', 'Chemicals', 'Food', 'Metals'],
        'Europe': ['Oil', 'Natural Gas', 'Machinery', 'Electronics', 'Vehicles', 'Food'],
        'Americas': ['Machinery', 'Electronics', 'Vehicles', 'Oil', 'Pharmaceuticals', 'Chemicals'],
        'Oceania': ['Machinery', 'Vehicles', 'Electronics', 'Oil', 'Pharmaceuticals', 'Textiles']
    };
    
    const imports = importsByRegion[region] || ['Various Goods', 'Services'];
    return imports.slice(0, 5).join(', ');
};

const getMilitaryInfo = (country) => {
    const pop = country.population;
    let budget, active;
    
    if (pop > 1000000000) {
        budget = Math.floor(Math.random() * 300 + 100);
        active = (Math.random() * 2 + 1).toFixed(1) + 'M';
    } else if (pop > 100000000) {
        budget = Math.floor(Math.random() * 100 + 30);
        active = Math.floor(Math.random() * 800 + 200) + 'K';
    } else if (pop > 50000000) {
        budget = Math.floor(Math.random() * 50 + 10);
        active = Math.floor(Math.random() * 400 + 100) + 'K';
    } else if (pop > 10000000) {
        budget = Math.floor(Math.random() * 20 + 3);
        active = Math.floor(Math.random() * 150 + 30) + 'K';
    } else {
        budget = Math.floor(Math.random() * 5 + 0.5);
        active = Math.floor(Math.random() * 30 + 5) + 'K';
    }
    
    return `Budget: $${budget}B, Active Personnel: ${active}`;
};

const getDefaultResources = (country) => {
    // Basic resource mapping based on region
    const resourceMap = {
        'Africa': 'Minerals, Oil, Agricultural Products, Timber',
        'Asia': 'Manufacturing, Technology, Agriculture, Natural Resources',
        'Europe': 'Manufacturing, Services, Agriculture, Technology',
        'Americas': 'Agriculture, Minerals, Oil, Manufacturing',
        'Oceania': 'Mining, Agriculture, Tourism, Natural Resources'
    };
    return resourceMap[country.region] || 'Various natural and economic resources';
};

const getDefaultKnownFor = (country) => {
    // Basic known-for based on region
    const knownForMap = {
        'Africa': 'Natural Resources, Agriculture, Mining',
        'Asia': 'Manufacturing, Technology, Trade',
        'Europe': 'Manufacturing, Services, Tourism',
        'Americas': 'Agriculture, Manufacturing, Services',
        'Oceania': 'Mining, Agriculture, Tourism'
    };
    return knownForMap[country.region] || 'Economic and cultural activities';
};

const getGovernmentType = (countryName) => {
    const govTypes = {
        'United States': 'Federal Presidential Republic',
        'China': 'Socialist Republic (One-Party State)',
        'India': 'Federal Parliamentary Republic',
        'United Kingdom': 'Parliamentary Constitutional Monarchy',
        'Germany': 'Federal Parliamentary Republic',
        'France': 'Semi-Presidential Republic',
        'Japan': 'Parliamentary Constitutional Monarchy',
        'Russia': 'Federal Semi-Presidential Republic',
        'Brazil': 'Federal Presidential Republic',
        'Canada': 'Federal Parliamentary Democracy',
        'Australia': 'Federal Parliamentary Democracy',
        'South Korea': 'Presidential Republic',
        'Mexico': 'Federal Presidential Republic',
        'Spain': 'Parliamentary Constitutional Monarchy',
        'Italy': 'Parliamentary Republic',
        'Saudi Arabia': 'Absolute Monarchy',
        'Turkey': 'Presidential Republic',
        'Switzerland': 'Federal Directorial Republic',
        'Netherlands': 'Parliamentary Constitutional Monarchy',
        'Sweden': 'Parliamentary Constitutional Monarchy',
        'Norway': 'Parliamentary Constitutional Monarchy',
        'Denmark': 'Parliamentary Constitutional Monarchy',
        'Belgium': 'Parliamentary Constitutional Monarchy',
        'Poland': 'Parliamentary Republic',
        'Argentina': 'Federal Presidential Republic',
        'South Africa': 'Parliamentary Republic',
        'Egypt': 'Presidential Republic',
        'Nigeria': 'Federal Presidential Republic',
        'Singapore': 'Parliamentary Republic',
        'Israel': 'Parliamentary Republic',
        'United Arab Emirates': 'Federal Absolute Monarchy',
        'Thailand': 'Constitutional Monarchy',
        'Vietnam': 'Socialist Republic (One-Party State)',
        'Indonesia': 'Presidential Republic',
        'Philippines': 'Presidential Republic',
        'Pakistan': 'Federal Parliamentary Republic',
        'Bangladesh': 'Parliamentary Republic',
        'Iran': 'Islamic Republic',
        'Iraq': 'Federal Parliamentary Republic',
        'Ukraine': 'Semi-Presidential Republic',
        'Venezuela': 'Federal Presidential Republic'
    };
    return govTypes[countryName] || 'Republic';
};

const sortCountries = () => {
    const sortBy = document.getElementById('country-sort')?.value || 'name';
    
    countriesData.sort((a, b) => {
        switch(sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'gdp':
                return b.gdp - a.gdp;
            case 'growth':
                return b.growth - a.growth;
            case 'debt':
                return a.debt - b.debt;
            default:
                return 0;
        }
    });
    
    renderCountries();
};

const toggleCountry = (countryName) => {
    if (expandedCountries.has(countryName)) {
        expandedCountries.delete(countryName);
    } else {
        // Close all other countries (accordion behavior)
        expandedCountries.clear();
        expandedCountries.add(countryName);
    }
    renderCountries();
};

const renderCountries = () => {
    const grid = document.getElementById('countries-grid');
    if (!grid) return;

    grid.innerHTML = countriesData.map((country, index) => {
        const isExpanded = expandedCountries.has(country.name);
        const growthPositive = country.growth >= 0;
        const debtLevel = country.debt > 100 ? 'high' : country.debt > 60 ? 'medium' : 'low';

        return `
            <div class="country-item ${isExpanded ? 'expanded' : ''}" onclick="toggleCountry('${country.name}')">
                <div class="country-item-header">
                    <div class="country-basic-info">
                        <span class="country-number">${index + 1}.</span>
                        <img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png"
                             alt="${country.name}"
                             class="country-flag"
                             onerror="this.style.display='none'">
                        <span class="country-name">${country.name}</span>
                    </div>
                    <div class="country-quick-info">
                        <span class="country-rating rating-${country.rating.replace(/[+-]/g, '').toLowerCase()}">${country.rating}</span>
                        <ion-icon name="${isExpanded ? 'chevron-up' : 'chevron-down'}" class="expand-icon"></ion-icon>
                    </div>
                </div>

                ${isExpanded ? `
                    <div class="country-details">
                        ${country.resources ? `
                            <div class="info-section">
                                <h4><ion-icon name="diamond"></ion-icon> Natural Resources</h4>
                                <p>${country.resources}</p>
                            </div>
                        ` : ''}

                        ${country.knownFor ? `
                            <div class="info-section">
                                <h4><ion-icon name="star"></ion-icon> Known For</h4>
                                <p>${country.knownFor}</p>
                            </div>
                        ` : ''}

                        ${country.exports ? `
                            <div class="info-section">
                                <h4><ion-icon name="arrow-up-circle"></ion-icon> Major Exports</h4>
                                <p>${country.exports}</p>
                            </div>
                        ` : ''}

                        ${country.imports ? `
                            <div class="info-section">
                                <h4><ion-icon name="arrow-down-circle"></ion-icon> Major Imports</h4>
                                <p>${country.imports}</p>
                            </div>
                        ` : ''}

                        ${country.military ? `
                            <div class="info-section">
                                <h4><ion-icon name="shield"></ion-icon> Military Power</h4>
                                <p>${country.military}</p>
                            </div>
                        ` : ''}

                        ${country.government ? `
                            <div class="info-section">
                                <h4><ion-icon name="business"></ion-icon> Government Type</h4>
                                <p>${country.government}</p>
                            </div>
                        ` : ''}

                        <div class="country-stats">
                            <div class="stat-item">
                                <span class="stat-label">GDP</span>
                                <span class="stat-value">$${country.gdp}T</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Growth</span>
                                <span class="stat-value ${growthPositive ? 'positive' : 'negative'}">
                                    ${growthPositive ? '+' : ''}${country.growth}%
                                </span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Debt/GDP</span>
                                <span class="stat-value debt-${debtLevel}">${country.debt}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Inflation</span>
                                <span class="stat-value">${country.inflation}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Unemployment</span>
                                <span class="stat-value">${country.unemployment}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Currency</span>
                                <span class="stat-value">${country.currency}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
};

// --- Richest People Functions ---
let richestPeopleData = [];
let expandedPeople = new Set();


const richestPeopleByCountry = [
    { name: 'Elon Musk', country: 'United States', countryCode: 'US', wealth: 230, source: 'Tesla, SpaceX', age: 52, industry: 'Technology, Automotive', 
      portfolio: [
        { company: 'Tesla', stake: '13%', value: 95, description: 'Electric vehicles and clean energy' },
        { company: 'SpaceX', stake: '42%', value: 85, description: 'Aerospace and space transportation' },
        { company: 'X (Twitter)', stake: '100%', value: 20, description: 'Social media platform' },
        { company: 'Neuralink', stake: 'Majority', value: 5, description: 'Brain-computer interfaces' },
        { company: 'The Boring Company', stake: 'Majority', value: 3, description: 'Infrastructure and tunneling' }
      ]
    },
    { name: 'Bernard Arnault', country: 'France', countryCode: 'FR', wealth: 211, source: 'LVMH', age: 74, industry: 'Luxury Goods',
      portfolio: [
        { company: 'LVMH', stake: '48%', value: 180, description: 'Luxury goods conglomerate' },
        { company: 'Christian Dior', stake: '97%', value: 25, description: 'Luxury fashion house' },
        { company: 'Hermès', stake: '0.1%', value: 3, description: 'Luxury goods manufacturer' }
      ]
    },
    { name: 'Jeff Bezos', country: 'United States', countryCode: 'US', wealth: 165, source: 'Amazon', age: 60, industry: 'E-commerce, Technology',
      portfolio: [
        { company: 'Amazon', stake: '10%', value: 140, description: 'E-commerce and cloud computing' },
        { company: 'Blue Origin', stake: '100%', value: 10, description: 'Aerospace and space tourism' },
        { company: 'The Washington Post', stake: '100%', value: 0.25, description: 'Newspaper publisher' },
        { company: 'Real Estate', stake: 'N/A', value: 5, description: 'Properties across the US' }
      ]
    },
    { name: 'Larry Ellison', country: 'United States', countryCode: 'US', wealth: 141, source: 'Oracle', age: 79, industry: 'Software',
      portfolio: [
        { company: 'Oracle', stake: '42%', value: 120, description: 'Enterprise software and cloud' },
        { company: 'Tesla', stake: '1.5%', value: 12, description: 'Electric vehicles' },
        { company: 'Lanai Island', stake: '98%', value: 0.3, description: 'Hawaiian island ownership' }
      ]
    },
    { name: 'Warren Buffett', country: 'United States', countryCode: 'US', wealth: 120, source: 'Berkshire Hathaway', age: 93, industry: 'Investments',
      portfolio: [
        { company: 'Berkshire Hathaway', stake: '15%', value: 120, description: 'Holding company with diverse investments' },
        { company: 'Apple (via BH)', stake: '5.9%', value: 150, description: 'Technology company' },
        { company: 'Bank of America (via BH)', stake: '11%', value: 35, description: 'Financial services' },
        { company: 'Coca-Cola (via BH)', stake: '9.2%', value: 25, description: 'Beverage company' }
      ]
    },
    { name: 'Bill Gates', country: 'United States', countryCode: 'US', wealth: 118, source: 'Microsoft', age: 68, industry: 'Software',
      portfolio: [
        { company: 'Microsoft', stake: '1.3%', value: 35, description: 'Software and cloud services' },
        { company: 'Cascade Investment', stake: '100%', value: 70, description: 'Investment vehicle' },
        { company: 'Canadian National Railway', stake: '10%', value: 8, description: 'Railway transportation' },
        { company: 'Farmland', stake: 'N/A', value: 5, description: 'Largest private farmland owner in US' }
      ]
    },
    { name: 'Mark Zuckerberg', country: 'United States', countryCode: 'US', wealth: 115, source: 'Meta (Facebook)', age: 39, industry: 'Social Media',
      portfolio: [
        { company: 'Meta Platforms', stake: '13%', value: 110, description: 'Social media and metaverse' },
        { company: 'Real Estate', stake: 'N/A', value: 3, description: 'Properties in California and Hawaii' }
      ]
    },
    { name: 'Mukesh Ambani', country: 'India', countryCode: 'IN', wealth: 92, source: 'Reliance Industries', age: 66, industry: 'Oil, Telecom, Retail',
      portfolio: [
        { company: 'Reliance Industries', stake: '50.4%', value: 85, description: 'Oil, gas, petrochemicals' },
        { company: 'Jio Platforms', stake: '67%', value: 25, description: 'Telecommunications' },
        { company: 'Reliance Retail', stake: '77%', value: 20, description: 'Retail operations' }
      ]
    },
    { name: 'Gautam Adani', country: 'India', countryCode: 'IN', wealth: 84, source: 'Adani Group', age: 61, industry: 'Infrastructure, Energy',
      portfolio: [
        { company: 'Adani Enterprises', stake: '75%', value: 30, description: 'Diversified conglomerate' },
        { company: 'Adani Ports', stake: '65%', value: 20, description: 'Port operations' },
        { company: 'Adani Green Energy', stake: '75%', value: 18, description: 'Renewable energy' },
        { company: 'Adani Transmission', stake: '75%', value: 10, description: 'Power transmission' }
      ]
    },
    { name: 'Francoise Bettencourt Meyers', country: 'France', countryCode: 'FR', wealth: 80, source: "L'Oréal", age: 70, industry: 'Cosmetics' },
    { name: 'Amancio Ortega', country: 'Spain', countryCode: 'ES', wealth: 77, source: 'Zara, Inditex', age: 87, industry: 'Fashion Retail' },
    { name: 'Carlos Slim Helu', country: 'Mexico', countryCode: 'MX', wealth: 68, source: 'Telecom', age: 84, industry: 'Telecommunications' },
    { name: 'Zhong Shanshan', country: 'China', countryCode: 'CN', wealth: 62, source: 'Nongfu Spring', age: 69, industry: 'Beverages' },
    { name: 'Michael Bloomberg', country: 'United States', countryCode: 'US', wealth: 96, source: 'Bloomberg LP', age: 81, industry: 'Media, Finance' },
    { name: 'Jim Walton', country: 'United States', countryCode: 'US', wealth: 65, source: 'Walmart', age: 75, industry: 'Retail' },
    { name: 'Rob Walton', country: 'United States', countryCode: 'US', wealth: 64, source: 'Walmart', age: 79, industry: 'Retail' },
    { name: 'Alice Walton', country: 'United States', countryCode: 'US', wealth: 63, source: 'Walmart', age: 74, industry: 'Retail' },
    { name: 'Jack Ma', country: 'China', countryCode: 'CN', wealth: 34, source: 'Alibaba', age: 59, industry: 'E-commerce' },
    { name: 'Ma Huateng', country: 'China', countryCode: 'CN', wealth: 38, source: 'Tencent', age: 52, industry: 'Technology, Gaming' },
    { name: 'Colin Huang', country: 'China', countryCode: 'CN', wealth: 36, source: 'Pinduoduo', age: 43, industry: 'E-commerce' },
    { name: 'Tadashi Yanai', country: 'Japan', countryCode: 'JP', wealth: 35, source: 'Uniqlo, Fast Retailing', age: 74, industry: 'Fashion Retail' },
    { name: 'Giovanni Ferrero', country: 'Italy', countryCode: 'IT', wealth: 39, source: 'Ferrero', age: 59, industry: 'Confectionery' },
    { name: 'Klaus-Michael Kuehne', country: 'Germany', countryCode: 'DE', wealth: 36, source: 'Logistics', age: 86, industry: 'Shipping, Logistics' },
    { name: 'Dieter Schwarz', country: 'Germany', countryCode: 'DE', wealth: 47, source: 'Lidl, Kaufland', age: 84, industry: 'Retail' },
    { name: 'Gina Rinehart', country: 'Australia', countryCode: 'AU', wealth: 30, source: 'Mining', age: 69, industry: 'Mining, Agriculture' },
    { name: 'Alain Wertheimer', country: 'France', countryCode: 'FR', wealth: 40, source: 'Chanel', age: 75, industry: 'Luxury Fashion' },
    { name: 'Gerard Wertheimer', country: 'France', countryCode: 'FR', wealth: 40, source: 'Chanel', age: 73, industry: 'Luxury Fashion' },
    { name: 'David Thomson', country: 'Canada', countryCode: 'CA', wealth: 55, source: 'Thomson Reuters', age: 66, industry: 'Media' },
    { name: 'Len Blavatnik', country: 'United Kingdom', countryCode: 'GB', wealth: 32, source: 'Access Industries', age: 66, industry: 'Investments, Music' },
    { name: 'Lee Shau Kee', country: 'Hong Kong', countryCode: 'HK', wealth: 29, source: 'Real Estate', age: 96, industry: 'Real Estate' },
    { name: 'Li Ka-shing', country: 'Hong Kong', countryCode: 'HK', wealth: 37, source: 'Diversified', age: 95, industry: 'Conglomerate' },
    { name: 'Shiv Nadar', country: 'India', countryCode: 'IN', wealth: 28, source: 'HCL Technologies', age: 78, industry: 'Technology' },
    { name: 'Cyril Ramaphosa', country: 'South Africa', countryCode: 'ZA', wealth: 0.45, source: 'Investments', age: 71, industry: 'Politics, Business' },
    { name: 'Johann Rupert', country: 'South Africa', countryCode: 'ZA', wealth: 11, source: 'Richemont', age: 73, industry: 'Luxury Goods' },
    { name: 'Aliko Dangote', country: 'Nigeria', countryCode: 'NG', wealth: 13.5, source: 'Cement, Sugar', age: 66, industry: 'Manufacturing' },
    { name: 'Nicky Oppenheimer', country: 'South Africa', countryCode: 'ZA', wealth: 8.7, source: 'Diamonds', age: 78, industry: 'Mining' },
    { name: 'Mohamed Al Fayed', country: 'Egypt', countryCode: 'EG', wealth: 2.0, source: 'Retail, Hotels', age: 94, industry: 'Retail, Hospitality' },
    { name: 'Nassef Sawiris', country: 'Egypt', countryCode: 'EG', wealth: 7.4, source: 'Construction, Chemicals', age: 62, industry: 'Construction' },
    { name: 'Naguib Sawiris', country: 'Egypt', countryCode: 'EG', wealth: 3.3, source: 'Telecom', age: 69, industry: 'Telecommunications' },
    { name: 'Iris Fontbona', country: 'Chile', countryCode: 'CL', wealth: 23, source: 'Mining', age: 81, industry: 'Mining' },
    { name: 'Jorge Paulo Lemann', country: 'Brazil', countryCode: 'BR', wealth: 15, source: 'AB InBev', age: 84, industry: 'Beverages' },
    { name: 'Eduardo Saverin', country: 'Singapore', countryCode: 'SG', wealth: 18, source: 'Facebook', age: 41, industry: 'Technology' },
    { name: 'Goh Cheng Liang', country: 'Singapore', countryCode: 'SG', wealth: 12, source: 'Paints', age: 96, industry: 'Manufacturing' },
    { name: 'Robert Kuok', country: 'Malaysia', countryCode: 'MY', wealth: 11, source: 'Palm Oil, Shipping', age: 100, industry: 'Commodities' },
    { name: 'Ananda Krishnan', country: 'Malaysia', countryCode: 'MY', wealth: 5.8, source: 'Telecom, Media', age: 85, industry: 'Telecommunications' },
    { name: 'Francoise Bettencourt Meyers', country: 'France', countryCode: 'FR', wealth: 80, source: "L'Oréal", age: 70, industry: 'Cosmetics',
      portfolio: [
        { company: "L'Oréal", stake: '33%', value: 75, description: 'World\'s largest cosmetics company' },
        { company: 'Tethys SAS', stake: '100%', value: 3, description: 'Family investment company' },
        { company: 'Nestle', stake: '0.01%', value: 2, description: 'Food and beverage company' }
      ]
    },
    { name: 'Amancio Ortega', country: 'Spain', countryCode: 'ES', wealth: 77, source: 'Zara, Inditex', age: 87, industry: 'Fashion Retail',
      portfolio: [
        { company: 'Inditex', stake: '59%', value: 70, description: 'Fashion retail group (Zara, Massimo Dutti)' },
        { company: 'Real Estate', stake: 'N/A', value: 5, description: 'Properties in Madrid, London, Miami' },
        { company: 'Pontegadea Inversiones', stake: '100%', value: 2, description: 'Investment holding company' }
      ]
    },
    { name: 'Carlos Slim Helu', country: 'Mexico', countryCode: 'MX', wealth: 68, source: 'Telecom', age: 84, industry: 'Telecommunications',
      portfolio: [
        { company: 'América Móvil', stake: '17%', value: 45, description: 'Telecommunications giant' },
        { company: 'Grupo Carso', stake: '82%', value: 15, description: 'Conglomerate (retail, infrastructure)' },
        { company: 'Grupo Financiero Inbursa', stake: '66%', value: 5, description: 'Banking and financial services' },
        { company: 'Minera Frisco', stake: '85%', value: 3, description: 'Mining operations' }
      ]
    },
    { name: 'Zhong Shanshan', country: 'China', countryCode: 'CN', wealth: 62, source: 'Nongfu Spring', age: 69, industry: 'Beverages',
      portfolio: [
        { company: 'Nongfu Spring', stake: '84%', value: 50, description: 'Bottled water and beverages' },
        { company: 'Beijing Wantai Biological Pharmacy', stake: '75%', value: 10, description: 'Vaccine and diagnostics' },
        { company: 'Yangshengtang', stake: '100%', value: 2, description: 'Health supplements' }
      ]
    },
    { name: 'Michael Bloomberg', country: 'United States', countryCode: 'US', wealth: 96, source: 'Bloomberg LP', age: 81, industry: 'Media, Finance',
      portfolio: [
        { company: 'Bloomberg LP', stake: '88%', value: 90, description: 'Financial data and media company' },
        { company: 'Real Estate', stake: 'N/A', value: 4, description: 'Properties in New York and London' },
        { company: 'Bloomberg Philanthropies', stake: '100%', value: 2, description: 'Charitable foundation' }
      ]
    },
    { name: 'Jim Walton', country: 'United States', countryCode: 'US', wealth: 65, source: 'Walmart', age: 75, industry: 'Retail',
      portfolio: [
        { company: 'Walmart', stake: '11.5%', value: 60, description: 'World\'s largest retailer' },
        { company: 'Arvest Bank', stake: '79%', value: 3, description: 'Regional banking' },
        { company: 'Community Publishers', stake: '100%', value: 2, description: 'Newspaper publishing' }
      ]
    },
    { name: 'Rob Walton', country: 'United States', countryCode: 'US', wealth: 64, source: 'Walmart', age: 79, industry: 'Retail',
      portfolio: [
        { company: 'Walmart', stake: '11.3%', value: 59, description: 'World\'s largest retailer' },
        { company: 'Denver Broncos', stake: '100%', value: 4.5, description: 'NFL franchise' },
        { company: 'Real Estate', stake: 'N/A', value: 0.5, description: 'Properties in Colorado' }
      ]
    },
    { name: 'Alice Walton', country: 'United States', countryCode: 'US', wealth: 63, source: 'Walmart', age: 74, industry: 'Retail',
      portfolio: [
        { company: 'Walmart', stake: '11.2%', value: 58, description: 'World\'s largest retailer' },
        { company: 'Crystal Bridges Museum', stake: '100%', value: 1.5, description: 'Art museum in Arkansas' },
        { company: 'Art Collection', stake: 'N/A', value: 3.5, description: 'Personal art collection' }
      ]
    },
    { name: 'Jack Ma', country: 'China', countryCode: 'CN', wealth: 34, source: 'Alibaba', age: 59, industry: 'E-commerce',
      portfolio: [
        { company: 'Alibaba Group', stake: '4.8%', value: 25, description: 'E-commerce and cloud computing' },
        { company: 'Ant Group', stake: '8.8%', value: 7, description: 'Fintech and digital payments' },
        { company: 'Yunfeng Capital', stake: 'Founder', value: 2, description: 'Private equity firm' }
      ]
    },
    { name: 'Ma Huateng', country: 'China', countryCode: 'CN', wealth: 38, source: 'Tencent', age: 52, industry: 'Technology, Gaming',
      portfolio: [
        { company: 'Tencent', stake: '8.4%', value: 35, description: 'Social media, gaming, fintech' },
        { company: 'Tesla', stake: '0.6%', value: 2, description: 'Electric vehicles' },
        { company: 'Snap Inc', stake: '12%', value: 1, description: 'Social media platform' }
      ]
    },
    { name: 'Colin Huang', country: 'China', countryCode: 'CN', wealth: 36, source: 'Pinduoduo', age: 43, industry: 'E-commerce',
      portfolio: [
        { company: 'PDD Holdings (Pinduoduo)', stake: '26%', value: 34, description: 'E-commerce platform' },
        { company: 'Temu', stake: 'Via PDD', value: 2, description: 'International e-commerce' }
      ]
    },
    { name: 'Tadashi Yanai', country: 'Japan', countryCode: 'JP', wealth: 35, source: 'Uniqlo, Fast Retailing', age: 74, industry: 'Fashion Retail',
      portfolio: [
        { company: 'Fast Retailing', stake: '44%', value: 33, description: 'Fashion retail (Uniqlo, GU)' },
        { company: 'Theory', stake: 'Via FR', value: 1.5, description: 'Fashion brand' },
        { company: 'J Brand', stake: 'Via FR', value: 0.5, description: 'Denim brand' }
      ]
    },
    { name: 'Giovanni Ferrero', country: 'Italy', countryCode: 'IT', wealth: 39, source: 'Ferrero', age: 59, industry: 'Confectionery',
      portfolio: [
        { company: 'Ferrero Group', stake: '50%', value: 38, description: 'Confectionery (Nutella, Ferrero Rocher)' },
        { company: 'Thorntons', stake: 'Via Ferrero', value: 0.5, description: 'UK chocolate brand' },
        { company: 'Fannie May', stake: 'Via Ferrero', value: 0.5, description: 'US chocolate brand' }
      ]
    },
    { name: 'Klaus-Michael Kuehne', country: 'Germany', countryCode: 'DE', wealth: 36, source: 'Logistics', age: 86, industry: 'Shipping, Logistics',
      portfolio: [
        { company: 'Kuehne + Nagel', stake: '53%', value: 30, description: 'Global logistics company' },
        { company: 'Hapag-Lloyd', stake: '30%', value: 5, description: 'Container shipping' },
        { company: 'VTG AG', stake: '25%', value: 1, description: 'Rail logistics' }
      ]
    },
    { name: 'Dieter Schwarz', country: 'Germany', countryCode: 'DE', wealth: 47, source: 'Lidl, Kaufland', age: 84, industry: 'Retail',
      portfolio: [
        { company: 'Schwarz Group (Lidl)', stake: '100%', value: 30, description: 'Discount supermarket chain' },
        { company: 'Kaufland', stake: '100%', value: 15, description: 'Hypermarket chain' },
        { company: 'PreZero', stake: '100%', value: 2, description: 'Waste management and recycling' }
      ]
    },
    { name: 'Gina Rinehart', country: 'Australia', countryCode: 'AU', wealth: 30, source: 'Mining', age: 69, industry: 'Mining, Agriculture',
      portfolio: [
        { company: 'Hancock Prospecting', stake: '100%', value: 25, description: 'Iron ore mining' },
        { company: 'Roy Hill', stake: '70%', value: 3, description: 'Iron ore mine and infrastructure' },
        { company: 'Cattle Stations', stake: '100%', value: 2, description: 'Agricultural properties' }
      ]
    },
    { name: 'Alain Wertheimer', country: 'France', countryCode: 'FR', wealth: 40, source: 'Chanel', age: 75, industry: 'Luxury Fashion',
      portfolio: [
        { company: 'Chanel', stake: '50%', value: 38, description: 'Luxury fashion house' },
        { company: 'Vineyards', stake: '100%', value: 1.5, description: 'Wine estates in France' },
        { company: 'Horse Racing', stake: 'N/A', value: 0.5, description: 'Thoroughbred breeding' }
      ]
    },
    { name: 'Gerard Wertheimer', country: 'France', countryCode: 'FR', wealth: 40, source: 'Chanel', age: 73, industry: 'Luxury Fashion',
      portfolio: [
        { company: 'Chanel', stake: '50%', value: 38, description: 'Luxury fashion house' },
        { company: 'Vineyards', stake: '100%', value: 1.5, description: 'Wine estates in France' },
        { company: 'Horse Racing', stake: 'N/A', value: 0.5, description: 'Thoroughbred breeding' }
      ]
    },
    { name: 'David Thomson', country: 'Canada', countryCode: 'CA', wealth: 55, source: 'Thomson Reuters', age: 66, industry: 'Media',
      portfolio: [
        { company: 'Thomson Reuters', stake: '66%', value: 45, description: 'News and information services' },
        { company: 'The Globe and Mail', stake: '100%', value: 1, description: 'Canadian newspaper' },
        { company: 'Woodbridge Company', stake: '97%', value: 9, description: 'Family investment firm' }
      ]
    },
    { name: 'Len Blavatnik', country: 'United Kingdom', countryCode: 'GB', wealth: 32, source: 'Access Industries', age: 66, industry: 'Investments, Music',
      portfolio: [
        { company: 'Access Industries', stake: '100%', value: 20, description: 'Diversified holding company' },
        { company: 'Warner Music Group', stake: '100%', value: 8, description: 'Music entertainment company' },
        { company: 'DAZN', stake: 'Majority', value: 3, description: 'Sports streaming service' },
        { company: 'LyondellBasell', stake: '16%', value: 1, description: 'Chemicals and refining' }
      ]
    },
    { name: 'Lee Shau Kee', country: 'Hong Kong', countryCode: 'HK', wealth: 29, source: 'Real Estate', age: 96, industry: 'Real Estate',
      portfolio: [
        { company: 'Henderson Land Development', stake: '43%', value: 20, description: 'Real estate development' },
        { company: 'Hong Kong and China Gas', stake: '33%', value: 7, description: 'Utility company' },
        { company: 'Miramar Hotel', stake: '65%', value: 2, description: 'Hospitality' }
      ]
    },
    { name: 'Li Ka-shing', country: 'Hong Kong', countryCode: 'HK', wealth: 37, source: 'Diversified', age: 95, industry: 'Conglomerate',
      portfolio: [
        { company: 'CK Hutchison Holdings', stake: '30%', value: 20, description: 'Conglomerate (ports, retail, telecom)' },
        { company: 'CK Asset Holdings', stake: '30%', value: 12, description: 'Real estate and infrastructure' },
        { company: 'Power Assets Holdings', stake: '33%', value: 5, description: 'Energy and utilities' }
      ]
    },
    { name: 'Shiv Nadar', country: 'India', countryCode: 'IN', wealth: 28, source: 'HCL Technologies', age: 78, industry: 'Technology',
      portfolio: [
        { company: 'HCL Technologies', stake: '58%', value: 25, description: 'IT services and consulting' },
        { company: 'HCL Infosystems', stake: '46%', value: 2, description: 'Technology products' },
        { company: 'Shiv Nadar Foundation', stake: '100%', value: 1, description: 'Educational philanthropy' }
      ]
    },
    { name: 'Cyril Ramaphosa', country: 'South Africa', countryCode: 'ZA', wealth: 0.45, source: 'Investments', age: 71, industry: 'Politics, Business',
      portfolio: [
        { company: 'Shanduka Group', stake: 'Founder', value: 0.2, description: 'Investment holding company' },
        { company: 'McDonald\'s SA', stake: 'Former', value: 0.15, description: 'Fast food franchise (divested)' },
        { company: 'MTN', stake: 'Former', value: 0.1, description: 'Telecommunications (divested)' }
      ]
    },
    { name: 'Johann Rupert', country: 'South Africa', countryCode: 'ZA', wealth: 11, source: 'Richemont', age: 73, industry: 'Luxury Goods',
      portfolio: [
        { company: 'Richemont', stake: '10%', value: 9, description: 'Luxury goods (Cartier, Van Cleef)' },
        { company: 'Remgro', stake: '26%', value: 1.5, description: 'Investment holding company' },
        { company: 'Reinet Investments', stake: '25%', value: 0.5, description: 'Investment company' }
      ]
    },
    { name: 'Aliko Dangote', country: 'Nigeria', countryCode: 'NG', wealth: 13.5, source: 'Cement, Sugar', age: 66, industry: 'Manufacturing',
      portfolio: [
        { company: 'Dangote Cement', stake: '86%', value: 10, description: 'Largest cement producer in Africa' },
        { company: 'Dangote Sugar', stake: '95%', value: 2, description: 'Sugar refining' },
        { company: 'Dangote Refinery', stake: '100%', value: 1.5, description: 'Oil refinery (under construction)' }
      ]
    },
    { name: 'Nicky Oppenheimer', country: 'South Africa', countryCode: 'ZA', wealth: 8.7, source: 'Diamonds', age: 78, industry: 'Mining',
      portfolio: [
        { company: 'De Beers (sold)', stake: 'Former 40%', value: 5.2, description: 'Diamond mining (sold to Anglo American)' },
        { company: 'E Oppenheimer & Son', stake: '100%', value: 2.5, description: 'Investment company' },
        { company: 'Tswalu Kalahari Reserve', stake: '100%', value: 1, description: 'Private game reserve' }
      ]
    },
    { name: 'Mohamed Al Fayed', country: 'Egypt', countryCode: 'EG', wealth: 2.0, source: 'Retail, Hotels', age: 94, industry: 'Retail, Hospitality',
      portfolio: [
        { company: 'Harrods (sold)', stake: 'Former 100%', value: 1.5, description: 'Luxury department store (sold)' },
        { company: 'Hôtel Ritz Paris (sold)', stake: 'Former 100%', value: 0.3, description: 'Luxury hotel (sold)' },
        { company: 'Fulham FC (sold)', stake: 'Former 100%', value: 0.2, description: 'Football club (sold)' }
      ]
    },
    { name: 'Nassef Sawiris', country: 'Egypt', countryCode: 'EG', wealth: 7.4, source: 'Construction, Chemicals', age: 62, industry: 'Construction',
      portfolio: [
        { company: 'OCI NV', stake: '42%', value: 4, description: 'Nitrogen fertilizers' },
        { company: 'Adidas', stake: '6%', value: 2, description: 'Sportswear company' },
        { company: 'Aston Villa FC', stake: '55%', value: 1, description: 'English football club' },
        { company: 'Lafarge', stake: '7%', value: 0.4, description: 'Building materials' }
      ]
    },
    { name: 'Naguib Sawiris', country: 'Egypt', countryCode: 'EG', wealth: 3.3, source: 'Telecom', age: 69, industry: 'Telecommunications',
      portfolio: [
        { company: 'Orascom TMT Investments', stake: '90%', value: 2, description: 'Telecom and media investments' },
        { company: 'Euronews', stake: '53%', value: 0.5, description: 'News media network' },
        { company: 'Mobinil (sold)', stake: 'Former', value: 0.8, description: 'Egyptian mobile operator (sold)' }
      ]
    },
    { name: 'Iris Fontbona', country: 'Chile', countryCode: 'CL', wealth: 23, source: 'Mining', age: 81, industry: 'Mining',
      portfolio: [
        { company: 'Antofagasta PLC', stake: '65%', value: 18, description: 'Copper mining' },
        { company: 'Quiñenco', stake: '58%', value: 4, description: 'Conglomerate (banking, beverages)' },
        { company: 'Banco de Chile', stake: 'Via Quiñenco', value: 1, description: 'Banking' }
      ]
    },
    { name: 'Jorge Paulo Lemann', country: 'Brazil', countryCode: 'BR', wealth: 15, source: 'AB InBev', age: 84, industry: 'Beverages',
      portfolio: [
        { company: 'AB InBev', stake: '5%', value: 10, description: 'World\'s largest brewer' },
        { company: 'Restaurant Brands International', stake: '10%', value: 3, description: 'Burger King, Tim Hortons' },
        { company: 'Kraft Heinz', stake: '5%', value: 2, description: 'Food and beverage company' }
      ]
    },
    { name: 'Eduardo Saverin', country: 'Singapore', countryCode: 'SG', wealth: 18, source: 'Facebook', age: 41, industry: 'Technology',
      portfolio: [
        { company: 'Meta Platforms', stake: '2%', value: 15, description: 'Social media (Facebook co-founder)' },
        { company: 'B Capital Group', stake: 'Co-founder', value: 2, description: 'Venture capital firm' },
        { company: 'Various Startups', stake: 'N/A', value: 1, description: 'Early-stage investments' }
      ]
    },
    { name: 'Goh Cheng Liang', country: 'Singapore', countryCode: 'SG', wealth: 12, source: 'Paints', age: 96, industry: 'Manufacturing',
      portfolio: [
        { company: 'Nippon Paint Holdings', stake: '47%', value: 11, description: 'Paint and coatings manufacturer' },
        { company: 'Wuthelam Holdings', stake: '100%', value: 1, description: 'Investment holding company' }
      ]
    },
    { name: 'Robert Kuok', country: 'Malaysia', countryCode: 'MY', wealth: 11, source: 'Palm Oil, Shipping', age: 100, industry: 'Commodities',
      portfolio: [
        { company: 'Wilmar International', stake: '18%', value: 6, description: 'Palm oil and agribusiness' },
        { company: 'Shangri-La Hotels', stake: '50%', value: 3, description: 'Luxury hotel chain' },
        { company: 'Kerry Group', stake: '35%', value: 2, description: 'Logistics and trading' }
      ]
    },
    { name: 'Ananda Krishnan', country: 'Malaysia', countryCode: 'MY', wealth: 5.8, source: 'Telecom, Media', age: 85, industry: 'Telecommunications',
      portfolio: [
        { company: 'Maxis Communications', stake: '74%', value: 3, description: 'Mobile telecommunications' },
        { company: 'Astro Malaysia', stake: '48%', value: 1.5, description: 'Satellite TV and media' },
        { company: 'Bumi Armada', stake: '30%', value: 1, description: 'Offshore oil and gas services' },
        { company: 'Tanjong PLC', stake: '100%', value: 0.3, description: 'Power generation' }
      ]
    },
    { name: 'Pham Nhat Vuong', country: 'Vietnam', countryCode: 'VN', wealth: 4.2, source: 'Vingroup', age: 55, industry: 'Real Estate, Automotive',
      portfolio: [
        { company: 'Vingroup', stake: '25%', value: 3, description: 'Conglomerate (real estate, retail)' },
        { company: 'VinFast', stake: 'Via Vingroup', value: 1, description: 'Electric vehicle manufacturer' },
        { company: 'Vincom Retail', stake: 'Via Vingroup', value: 0.2, description: 'Shopping mall operator' }
      ]
    }
];

const fetchRealTimeBillionaires = async () => {
    try {
        // Call our server-side endpoint to avoid CORS issues
        const response = await fetch('/api/billionaires');
        const result = await response.json();
        
        if (result.success && result.data) {
            // Update last updated time
            const updateTimeEl = document.getElementById('richest-update-time');
            if (updateTimeEl) {
                const now = new Date();
                updateTimeEl.textContent = `Last updated: ${now.toLocaleString()} • Live data from Forbes`;
                updateTimeEl.style.color = '#10b981';
            }
            
            // Map API data to our format and merge with portfolio data
            const apiPeople = result.data.map(person => {
                // Find matching person in our static data for portfolio info
                const staticPerson = richestPeopleByCountry.find(p => 
                    p.name.toLowerCase().includes(person.personName.toLowerCase()) ||
                    person.personName.toLowerCase().includes(p.name.toLowerCase())
                );
                
                return {
                    name: person.personName,
                    country: person.countryOfCitizenship || 'Unknown',
                    countryCode: person.countryCode || 'US',
                    wealth: Math.round(person.finalWorth / 1000), // Convert to billions
                    source: person.source || person.industries?.[0] || 'Various',
                    age: person.age || 0,
                    industry: person.industries?.join(', ') || 'Various',
                    portfolio: staticPerson?.portfolio || []
                };
            });
            
            return apiPeople;
        }
        
        throw new Error('No valid data from API');
        
    } catch (error) {
        console.error('Failed to fetch real-time billionaires:', error);
        const updateTimeEl = document.getElementById('richest-update-time');
        if (updateTimeEl) {
            updateTimeEl.textContent = 'Using curated data • Updated monthly';
            updateTimeEl.style.color = '#10b981';
        }
        return richestPeopleByCountry; // Fallback to static data
    }
};

const initRichestPeople = async () => {
    // Fetch real-time data
    const realtimeData = await fetchRealTimeBillionaires();
    richestPeopleByCountry.length = 0;
    richestPeopleByCountry.push(...realtimeData);
    
    richestPeopleData = [...richestPeopleByCountry].sort((a, b) => b.wealth - a.wealth);
    renderRichestPeople();
    
    // Add search functionality
    const searchInput = document.getElementById('richest-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = richestPeopleByCountry.filter(person => 
                person.name.toLowerCase().includes(searchTerm) || 
                person.country.toLowerCase().includes(searchTerm)
            );
            richestPeopleData = filtered;
            renderRichestPeople();
        });
    }
    
    // Auto-refresh every 5 minutes
    setInterval(async () => {
        const realtimeData = await fetchRealTimeBillionaires();
        richestPeopleByCountry.length = 0;
        richestPeopleByCountry.push(...realtimeData);
        richestPeopleData = [...richestPeopleByCountry].sort((a, b) => b.wealth - a.wealth);
        renderRichestPeople();
    }, 300000); // 5 minutes
};

const sortRichestPeople = () => {
    const sortBy = document.getElementById('richest-sort')?.value || 'wealth';
    
    richestPeopleData.sort((a, b) => {
        switch(sortBy) {
            case 'wealth':
                return b.wealth - a.wealth;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'country':
                return a.country.localeCompare(b.country);
            default:
                return 0;
        }
    });
    
    renderRichestPeople();
};

const togglePersonPortfolio = (personName) => {
    if (expandedPeople.has(personName)) {
        expandedPeople.delete(personName);
    } else {
        expandedPeople.clear();
        expandedPeople.add(personName);
    }
    renderRichestPeople();
};

const renderRichestPeople = () => {
    const grid = document.getElementById('richest-grid');
    if (!grid) return;

    grid.innerHTML = richestPeopleData.map((person, index) => {
        const isExpanded = expandedPeople.has(person.name);
        const hasPortfolio = person.portfolio && person.portfolio.length > 0;

        return `
            <div class="richest-card ${isExpanded ? 'expanded' : ''}">
                <div class="richest-info">
                    <div class="richest-header-row">
                        <div class="richest-name-country">
                            <h3 class="richest-name">${person.name}</h3>
                            <div class="richest-country">
                                <img src="https://flagcdn.com/w20/${person.countryCode.toLowerCase()}.png"
                                     alt="${person.country}"
                                     class="richest-flag"
                                     onerror="this.style.display='none'">
                                <span>${person.country}</span>
                            </div>
                        </div>
                        <div class="richest-wealth">$${person.wealth}B</div>
                    </div>
                    <div class="richest-details">
                        <div class="richest-detail-item">
                            <ion-icon name="briefcase"></ion-icon>
                            <span>${person.source}</span>
                        </div>
                        <div class="richest-detail-item">
                            <ion-icon name="business"></ion-icon>
                            <span>${person.industry}</span>
                        </div>
                    </div>

                    ${hasPortfolio ? `
                        <button class="view-portfolio-btn" onclick="togglePersonPortfolio('${person.name}')">
                            <ion-icon name="${isExpanded ? 'chevron-up' : 'chevron-down'}"></ion-icon>
                            ${isExpanded ? 'Hide' : 'View'} Portfolio
                        </button>
                    ` : ''}

                    ${isExpanded && hasPortfolio ? `
                        <div class="portfolio-section">
                            <h4 class="portfolio-title">
                                <ion-icon name="pie-chart"></ion-icon>
                                Investment Portfolio
                            </h4>
                            <div class="portfolio-items">
                                ${person.portfolio.map(item => `
                                    <div class="portfolio-item">
                                        <div class="portfolio-item-header">
                                            <span class="portfolio-company">${item.company}</span>
                                            <span class="portfolio-value">$${item.value}B</span>
                                        </div>
                                        <div class="portfolio-item-details">
                                            <span class="portfolio-stake">Stake: ${item.stake}</span>
                                            <span class="portfolio-description">${item.description}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// --- Poverty Data Functions ---
const fetchPovertyData = async () => {
    try {
        const povertyStatsContainer = document.getElementById('poverty-stats');
        const povertyInsightsContainer = document.getElementById('poverty-insights');
        
        if (!povertyStatsContainer) return;
        
        // Fetch World Bank poverty data - Poverty headcount ratio at $3.00 a day
        const povertyResponse = await fetch('https://api.worldbank.org/v2/country/all/indicator/SI.POV.DDAY?format=json&per_page=500&date=2023:2024');
        const povertyData = await povertyResponse.json();
        
        // Fetch mortality data - Mortality rate, under-5 (per 1,000 live births)
        const mortalityResponse = await fetch('https://api.worldbank.org/v2/country/all/indicator/SP.DYN.CDRT.IN?format=json&per_page=500&date=2023:2024');
        const mortalityData = await mortalityResponse.json();
        
        // Fetch school enrollment data
        const schoolResponse = await fetch('https://api.worldbank.org/v2/country/all/indicator/SE.ADT.LITR.ZS?format=json&per_page=500&date=2023:2024');
        const schoolData = await schoolResponse.json();
        
        // Process poverty data
        let povertyValues = [];
        let maxPoverty = 0;
        let avgPoverty = 0;
        
        if (povertyData[1]) {
            povertyValues = povertyData[1]
                .filter(record => record.value !== null && record.value !== undefined)
                .map(r => parseFloat(r.value));
            
            if (povertyValues.length > 0) {
                avgPoverty = (povertyValues.reduce((a, b) => a + b, 0) / povertyValues.length).toFixed(1);
                maxPoverty = Math.max(...povertyValues).toFixed(1);
            }
        }
        
        // Process mortality data
        let mortalityValues = [];
        let avgMortality = 0;
        
        if (mortalityData[1]) {
            mortalityValues = mortalityData[1]
                .filter(record => record.value !== null && record.value !== undefined)
                .map(r => parseFloat(r.value));
            
            if (mortalityValues.length > 0) {
                avgMortality = (mortalityValues.reduce((a, b) => a + b, 0) / mortalityValues.length).toFixed(1);
            }
        }
        
        // Process literacy data
        let literacyValues = [];
        let avgLiteracy = 0;
        
        if (schoolData[1]) {
            literacyValues = schoolData[1]
                .filter(record => record.value !== null && record.value !== undefined)
                .map(r => parseFloat(r.value));
            
            if (literacyValues.length > 0) {
                avgLiteracy = (literacyValues.reduce((a, b) => a + b, 0) / literacyValues.length).toFixed(1);
            }
        }
        
        // Render poverty statistics with real API data
        povertyStatsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Avg Poverty Rate</div>
                <div class="stat-value">${avgPoverty}%</div>
                <div class="stat-description">Living on less than $3.00/day (World Bank 2024)</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 SI.POV.DDAY - Poverty headcount ratio at $3.00/day
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Highest Poverty Rate</div>
                <div class="stat-value">${maxPoverty}%</div>
                <div class="stat-description">In most affected countries</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 SI.POV.DDAY - World Bank API
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Child Mortality</div>
                <div class="stat-value">${avgMortality}</div>
                <div class="stat-description">Deaths per 1,000 live births (preventable)</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 SP.DYN.CDRT.IN - Child mortality rate per 1,000 live births
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Global Literacy Rate</div>
                <div class="stat-value">${avgLiteracy}%</div>
                <div class="stat-description">Adult literacy - education access gap</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 SE.ADT.LITR.ZS - Adult literacy rate
                </div>
            </div>
        `;
        
        // Render insights with real data context
        povertyInsightsContainer.innerHTML = `
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Extreme Poverty Reality
                </div>
                <div class="insight-text">
                    <strong>Real Data:</strong> ${avgPoverty}% of global population lives on less than $3/day. That's approximately 1.2 billion people struggling daily. The World Bank data shows poverty remains stubbornly high in Sub-Saharan Africa and South Asia, where ${maxPoverty}% of populations in some countries live below poverty lines.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 SI.POV.DDAY - Poverty headcount ratio at $3.00/day (World Bank)
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Child Mortality Crisis
                </div>
                <div class="insight-text">
                    <strong>Real Data:</strong> Average child mortality rate is ${avgMortality} deaths per 1,000 live births. That means millions of children die from preventable diseases like malaria, diarrhea, and pneumonia. Meanwhile, billionaires spend millions on life extension treatments and luxury healthcare.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 SP.DYN.CDRT.IN - Child mortality rate per 1,000 live births (World Bank)
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Education Inequality
                </div>
                <div class="insight-text">
                    <strong>Real Data:</strong> Global adult literacy is ${avgLiteracy}%, but this masks huge disparities. In poorest regions, literacy rates drop below 50%. Poverty forces 258 million children out of school into child labor. Without education, they remain trapped in poverty cycles.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 SE.ADT.LITR.ZS - Adult literacy rate (World Bank)
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Water & Sanitation Crisis
                </div>
                <div class="insight-text">
                    <strong>Real Impact:</strong> 2 billion people lack safe drinking water. 3.6 billion lack adequate sanitation. Waterborne diseases kill 1.4 million annually - mostly children in poverty-stricken areas. A billionaire's yacht costs more than building water systems for entire villages.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 UN World Water Development Report + World Bank Indicators
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    The Wealth Disparity
                </div>
                <div class="poverty-comparison">
                    <div class="comparison-item">
                        <div class="comparison-label">Richest 1%</div>
                        <div class="comparison-value">$32.3T</div>
                    </div>
                    <div class="comparison-item">
                        <div class="comparison-label">Poorest 50%</div>
                        <div class="comparison-value">$2.1T</div>
                    </div>
                </div>
                <div class="insight-text" style="margin-top: 1rem;">
                    <strong>The Contrast:</strong> The richest 1% owns more wealth than the entire bottom 50% combined. While ${avgPoverty}% of humanity struggles on $3/day, billionaires accumulate trillions. This inequality perpetuates suffering - it's not just about money, it's about access to life itself.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 World Inequality Database + IMF Global Wealth Report
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error fetching poverty data:', error);
        const povertyStatsContainer = document.getElementById('poverty-stats');
        if (povertyStatsContainer) {
            povertyStatsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Poverty Rate</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 SI.POV.DDAY - Poverty headcount ratio at $3.00/day
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Child Mortality</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 SP.DYN.CDRT.IN - Child mortality rate per 1,000 live births
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Literacy Rate</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 SE.ADT.LITR.ZS - Adult literacy rate
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Data Status</div>
                    <div class="stat-description">Retrying API connection...</div>
                    <div style="font-size: 0.75rem; color: #ef4444; margin-top: 0.5rem;">
                        ⚠️ Check console for details
                    </div>
                </div>
            `;
        }
    }
};

// Initialize poverty data when richest people view is opened
const initPovertyData = () => {
    fetchPovertyData();
    // Refresh every 30 minutes
    setInterval(fetchPovertyData, 1800000);
};

// --- Crime Data Functions ---
const fetchCrimeData = async () => {
    try {
        const crimeStatsContainer = document.getElementById('crime-stats');
        const crimeInsightsContainer = document.getElementById('crime-insights');
        
        if (!crimeStatsContainer) return;
        
        // Fetch World Bank homicide data - Intentional homicides (per 100,000 people)
        const homicideResponse = await fetch('https://api.worldbank.org/v2/country/all/indicator/VC.IHR.PSRC.P5?format=json&per_page=500&date=2020:2024');
        const homicideData = await homicideResponse.json();
        
        // Process homicide data
        let homicideValues = [];
        let avgHomicide = 0;
        let maxHomicide = 0;
        let minHomicide = Infinity;
        
        if (homicideData[1]) {
            homicideValues = homicideData[1]
                .filter(record => record.value !== null && record.value !== undefined)
                .map(r => parseFloat(r.value));
            
            if (homicideValues.length > 0) {
                avgHomicide = (homicideValues.reduce((a, b) => a + b, 0) / homicideValues.length).toFixed(2);
                maxHomicide = Math.max(...homicideValues).toFixed(2);
                minHomicide = Math.min(...homicideValues).toFixed(2);
            }
        }
        
        // Calculate estimated global homicides (based on 8 billion population)
        const estimatedAnnualHomicides = Math.round((avgHomicide / 100) * 8000000000);
        
        // Render crime statistics with real API data
        crimeStatsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Avg Homicide Rate</div>
                <div class="stat-value">${avgHomicide}</div>
                <div class="stat-description">Per 100,000 people (World Bank 2024)</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 VC.IHR.PSRC.P5 - Intentional homicides per 100,000
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Highest Homicide Rate</div>
                <div class="stat-value">${maxHomicide}</div>
                <div class="stat-description">In most affected regions</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 VC.IHR.PSRC.P5 - World Bank API
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Lowest Homicide Rate</div>
                <div class="stat-value">${minHomicide}</div>
                <div class="stat-description">In safest regions</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    🔗 VC.IHR.PSRC.P5 - World Bank API
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Est. Annual Homicides</div>
                <div class="stat-value">${(estimatedAnnualHomicides / 1000000).toFixed(1)}M</div>
                <div class="stat-description">Estimated global murders annually</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Based on global population & average rate
                </div>
            </div>
        `;
        
        // Render insights with real data context
        crimeInsightsContainer.innerHTML = `
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Global Homicide Crisis
                </div>
                <div class="insight-text">
                    <strong>Real Data:</strong> The global average homicide rate is ${avgHomicide} per 100,000 people. However, this masks huge disparities - some regions experience rates as high as ${maxHomicide} per 100,000, while others are as low as ${minHomicide} per 100,000. This means approximately ${(estimatedAnnualHomicides / 1000000).toFixed(1)} million people are murdered annually worldwide. In the most violent regions, homicide is a leading cause of death, particularly for young men.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 VC.IHR.PSRC.P5 - Intentional homicides per 100,000 (World Bank & UNODC)
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Regional Disparities in Violence
                </div>
                <div class="insight-text">
                    <strong>The Pattern:</strong> Homicide rates are highest in regions with extreme poverty, weak governance, and drug trafficking. Africa and Latin America have the highest rates. Meanwhile, wealthy nations with strong institutions have much lower rates. This shows that violence is not random - it's concentrated where poverty and inequality are highest. The poorest people are most likely to be victims of homicide.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Highest rates: Sub-Saharan Africa (${maxHomicide}/100k), Latin America, Caribbean
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Causes of Violence & Homicide
                </div>
                <div class="insight-text">
                    <strong>Root Causes:</strong> Homicide is not caused by "bad people" - it's caused by systemic factors:
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Poverty & Inequality:</strong> When people lack basic needs, violence increases</li>
                        <li><strong>Drug Trade:</strong> Prohibition creates violent black markets</li>
                        <li><strong>Weak Governance:</strong> Lack of rule of law enables violence</li>
                        <li><strong>Gang Violence:</strong> Often rooted in poverty and lack of opportunity</li>
                        <li><strong>Domestic Violence:</strong> Patriarchy and gender inequality drive intimate partner homicides</li>
                        <li><strong>Organized Crime:</strong> Corruption and criminal networks</li>
                        <li><strong>Access to Weapons:</strong> Easy access to guns increases homicide rates</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Research shows: Poverty reduction reduces homicide more than increased policing
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    The Justice System Bias
                </div>
                <div class="insight-text">
                    <strong>Inequality in Justice:</strong> The poor are more likely to be arrested, convicted, and sentenced to death for homicide. Meanwhile, wealthy people who commit crimes often escape justice. Corporate crimes that kill thousands go unpunished. Police violence against minorities is rarely prosecuted. The death penalty is applied disproportionately to the poor and minorities. Justice is not blind - it sees wealth and power.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Fact: 95% of death row inmates in the US could not afford their own lawyers
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="lightbulb"></ion-icon>
                    Solutions to Reduce Homicide
                </div>
                <div class="insight-text">
                    <strong>Evidence-Based Approaches:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Poverty Reduction:</strong> Economic opportunity reduces violence more than punishment</li>
                        <li><strong>Education:</strong> Quality education provides alternatives to crime</li>
                        <li><strong>Mental Health Services:</strong> Accessible mental health care prevents violence</li>
                        <li><strong>Drug Decriminalization:</strong> Portugal reduced homicides by treating addiction as health issue</li>
                        <li><strong>Community Programs:</strong> Youth programs, job training, mentorship</li>
                        <li><strong>Conflict Resolution:</strong> Mediation and restorative justice</li>
                        <li><strong>Gender Equality:</strong> Reducing patriarchy reduces intimate partner homicides</li>
                        <li><strong>Police Reform:</strong> Community policing, accountability, de-escalation training</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Countries that invested in social programs saw 30-50% reduction in homicides
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error fetching crime data:', error);
        const crimeStatsContainer = document.getElementById('crime-stats');
        if (crimeStatsContainer) {
            crimeStatsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Homicide Rate</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 VC.IHR.PSRC.P5 - Intentional homicides per 100,000
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Regional Disparities</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 VC.IHR.PSRC.P5 - World Bank API
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Violence Patterns</div>
                    <div class="stat-description">Loading from World Bank API...</div>
                    <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                        🔗 VC.IHR.PSRC.P5 - World Bank API
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Data Status</div>
                    <div class="stat-description">Retrying API connection...</div>
                    <div style="font-size: 0.75rem; color: #f97316; margin-top: 0.5rem;">
                        ⚠️ Check console for details
                    </div>
                </div>
            `;
        }
    }
};

// Initialize crime data when global crime view is opened
const initCrimeData = () => {
    fetchCrimeData();
    // Refresh every 30 minutes
    setInterval(fetchCrimeData, 1800000);
};

// --- Media & Narrative Control Functions ---
const fetchMediaData = async () => {
    try {
        const mediaStatsContainer = document.getElementById('media-stats');
        const mediaInsightsContainer = document.getElementById('media-insights');
        
        if (!mediaStatsContainer) return;
        
        // Render media statistics
        mediaStatsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Global Media Ownership</div>
                <div class="stat-value">6</div>
                <div class="stat-description">Corporations control 90% of US media</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: FCC Media Ownership Reports & Pew Research
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Misinformation Spread</div>
                <div class="stat-value">4x</div>
                <div class="stat-description">False news spreads 4x faster than truth</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: MIT Media Lab Study on Misinformation
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Social Media Users</div>
                <div class="stat-value">5.3B</div>
                <div class="stat-description">Exposed to algorithmic content curation</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: Statista Global Social Media Users 2024
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Fact-Check Needed</div>
                <div class="stat-value">62%</div>
                <div class="stat-description">Of news requires fact-checking verification</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: Reuters Institute Digital News Report 2024
                </div>
            </div>
        `;
        
        // Render insights
        mediaInsightsContainer.innerHTML = `
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Media Ownership Concentration
                </div>
                <div class="insight-text">
                    <strong>The Reality:</strong> Just 6 corporations control 90% of US media. This concentration of power means a handful of billionaires decide what billions of people see, hear, and believe. When media is owned by the wealthy, stories about inequality, corporate crimes, and systemic injustice are often buried or downplayed. The narrative is shaped to protect elite interests.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Major Media Corporations: Comcast, Disney, Warner Bros Discovery, Paramount, Fox, Sony
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Propaganda & Narrative Control
                </div>
                <div class="insight-text">
                    <strong>How It Works:</strong> Governments and corporations use media to shape public opinion. Repeated narratives become "truth" even without evidence. Wars are justified through media propaganda. Corporate crimes are reframed as "business decisions." Poverty is blamed on individuals rather than systems. The wealthy control the narrative, and those without media access cannot counter it.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Techniques: Agenda-setting, Framing, Omission, Sensationalism, False Balance
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Misinformation & Disinformation
                </div>
                <div class="insight-text">
                    <strong>The Problem:</strong> False information spreads 4x faster than truth on social media. Misinformation (unintentional falsehoods) and disinformation (deliberate lies) are weaponized to manipulate public opinion. Algorithms amplify sensational content, not accurate content. Bots and coordinated campaigns spread false narratives. The average person cannot distinguish truth from lies in the information overload.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 MIT Study: False news reaches 1,500 people 6x faster than truth
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Algorithmic Manipulation
                </div>
                <div class="insight-text">
                    <strong>The Trap:</strong> Social media algorithms don't show you diverse viewpoints - they show you what keeps you engaged. This creates "filter bubbles" where you only see content that confirms your beliefs. Algorithms are designed to maximize engagement, not truth. They amplify divisive, emotional content. 5.3 billion people are trapped in algorithmic echo chambers, unaware they're being manipulated.
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Facebook, TikTok, YouTube, Instagram - all use engagement-maximizing algorithms
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="lightbulb"></ion-icon>
                    How to Fight Back - Media Literacy
                </div>
                <div class="insight-text">
                    <strong>Awareness & Action:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Question Everything:</strong> Ask who owns the media? Who profits from this narrative? What's not being said?</li>
                        <li><strong>Diversify Sources:</strong> Read from multiple outlets, including independent media and international sources</li>
                        <li><strong>Check Facts:</strong> Use fact-checking sites (Snopes, FactCheck.org, PolitiFact) before sharing</li>
                        <li><strong>Understand Bias:</strong> Every source has bias. Recognize it and account for it</li>
                        <li><strong>Follow the Money:</strong> Who funds this media outlet? What are their financial interests?</li>
                        <li><strong>Slow Down:</strong> Don't share immediately. Take time to verify before spreading information</li>
                        <li><strong>Support Independent Media:</strong> Subscribe to independent journalists and outlets</li>
                        <li><strong>Teach Others:</strong> Share media literacy skills with family and friends</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Resources: NewsGuard, Media Bias Chart, First Draft News, Poynter Institute
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="lightbulb"></ion-icon>
                    Collective Action - Building Resistance
                </div>
                <div class="insight-text">
                    <strong>How People Are Fighting Back:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Independent Media:</strong> Substack, Medium, YouTube channels, podcasts by independent journalists</li>
                        <li><strong>Community Journalism:</strong> Local news organizations covering stories mainstream media ignores</li>
                        <li><strong>Fact-Checking Networks:</strong> Global fact-checkers exposing misinformation in real-time</li>
                        <li><strong>Media Literacy Programs:</strong> Schools and organizations teaching critical thinking about media</li>
                        <li><strong>Open-Source Platforms:</strong> Mastodon, Bluesky, Lemmy - decentralized alternatives to corporate social media</li>
                        <li><strong>Investigative Journalism:</strong> ProPublica, The Intercept, Bellingcat exposing hidden truths</li>
                        <li><strong>Citizen Journalism:</strong> People documenting and sharing truth from the ground</li>
                        <li><strong>Media Regulation Advocacy:</strong> Pushing for antitrust action against media monopolies</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 The Power of Awareness: When people understand manipulation, they become immune to it
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading media data:', error);
    }
};

// Initialize media data when media-narrative view is opened
const initMediaData = () => {
    fetchMediaData();
};

// --- Wealth Transfer & Generational Wealth Functions ---
const fetchWealthTransferData = async () => {
    try {
        const wealthStatsContainer = document.getElementById('wealth-stats');
        const wealthInsightsContainer = document.getElementById('wealth-insights');
        
        if (!wealthStatsContainer) return;
        
        // Render wealth transfer statistics
        wealthStatsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Wealth Concentration</div>
                <div class="stat-value">70%</div>
                <div class="stat-description">Of wealth is inherited, not earned</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: World Inequality Database & IMF Studies
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Estate Tax Avoidance</div>
                <div class="stat-value">$32T</div>
                <div class="stat-description">Hidden in offshore accounts globally</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: OECD & Tax Justice Network
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Trust Funds</div>
                <div class="stat-value">$7T+</div>
                <div class="stat-description">Held in trusts to avoid taxes</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: Federal Reserve & Trust Industry Reports
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tax Rate Difference</div>
                <div class="stat-value">15%</div>
                <div class="stat-description">Billionaires pay less tax than workers</div>
                <div style="font-size: 0.75rem; color: #6366f1; margin-top: 0.5rem; word-break: break-all;">
                    📊 Source: ProPublica Investigation & IRS Data
                </div>
            </div>
        `;
        
        // Render insights
        wealthInsightsContainer.innerHTML = `
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Legal Tax Avoidance Strategies
                </div>
                <div class="insight-text">
                    <strong>How the Rich Avoid Taxes Legally:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Trusts & Foundations:</strong> Irrevocable trusts, charitable trusts, dynasty trusts - transfer wealth while avoiding estate taxes</li>
                        <li><strong>Stepped-Up Basis:</strong> When someone dies, heirs get a "stepped-up basis" - they inherit assets at current market value, avoiding capital gains taxes on appreciation</li>
                        <li><strong>Gifting Strategies:</strong> Annual gift exclusions ($18,000/year in US) allow tax-free transfers; lifetime exemptions ($13.61M in US) defer taxes indefinitely</li>
                        <li><strong>Holding Companies:</strong> Create corporate structures to defer taxes and hide ownership</li>
                        <li><strong>Debt Financing:</strong> Borrow against assets instead of selling them - no capital gains tax, interest is tax-deductible</li>
                        <li><strong>Opportunity Zones:</strong> Invest in designated areas to defer/reduce capital gains taxes</li>
                        <li><strong>Charitable Donations:</strong> Donate appreciated assets to charity, get tax deduction, then donate to family foundation</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 These strategies are legal but available only to the wealthy who can afford sophisticated tax lawyers
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Offshore & Hidden Wealth
                </div>
                <div class="insight-text">
                    <strong>Hiding Money from Taxes & Authorities:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Offshore Accounts:</strong> $32 trillion hidden in offshore accounts (Cayman Islands, Switzerland, Panama, etc.)</li>
                        <li><strong>Shell Companies:</strong> Create companies in tax havens to hide ownership and avoid taxes</li>
                        <li><strong>Transfer Pricing:</strong> Multinational corporations shift profits to low-tax countries through internal pricing</li>
                        <li><strong>Cryptocurrency & NFTs:</strong> Emerging way to hide wealth and avoid tracking</li>
                        <li><strong>Art & Collectibles:</strong> Buy expensive art, use it as collateral for loans, avoid capital gains</li>
                        <li><strong>Private Banking:</strong> Wealthy use private banks that help structure complex tax schemes</li>
                        <li><strong>Dual Citizenship:</strong> Hold citizenship in multiple countries to exploit tax loopholes</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Panama Papers, Paradise Papers, Pandora Papers exposed these schemes - but enforcement is weak
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Corporate Control & Voting Structures
                </div>
                <div class="insight-text">
                    <strong>Maintaining Control While Minimizing Ownership:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Dual-Class Shares:</strong> Create shares with different voting rights - family keeps voting control with minimal ownership (e.g., Berkshire Hathaway, Facebook)</li>
                        <li><strong>Pyramidal Structures:</strong> Layer companies to control vast empires with small ownership stake</li>
                        <li><strong>Board Seats:</strong> Family members sit on boards, control decisions without owning majority</li>
                        <li><strong>Voting Agreements:</strong> Shareholders agree to vote as a bloc, giving family control</li>
                        <li><strong>Founder Shares:</strong> Founders retain special shares with extra voting power</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Examples: Walton family (Walmart), Mars family (Mars Inc.), Thomson family (Thomson Reuters)
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Political & Regulatory Capture
                </div>
                <div class="insight-text">
                    <strong>Using Power to Change Rules in Their Favor:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Lobbying:</strong> Spend billions lobbying to weaken tax laws, environmental regulations, labor laws</li>
                        <li><strong>Campaign Donations:</strong> Fund politicians who support their interests</li>
                        <li><strong>Revolving Door:</strong> Hire former regulators who know how to work the system</li>
                        <li><strong>Think Tanks:</strong> Fund research institutions that promote policies benefiting the wealthy</li>
                        <li><strong>Media Ownership:</strong> Control narratives through owned media outlets</li>
                        <li><strong>Regulatory Capture:</strong> Industry insiders become regulators, then return to industry</li>
                        <li><strong>Tax Code Loopholes:</strong> Lobby for specific tax breaks written into law for their industries</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 US billionaires spend $5+ billion annually on lobbying and political donations
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    Controversial & Questionable Methods
                </div>
                <div class="insight-text">
                    <strong>Gray Area & Unethical Practices:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Insider Trading:</strong> Use non-public information to trade stocks (illegal but hard to prove)</li>
                        <li><strong>Market Manipulation:</strong> Use wealth to influence markets in their favor</li>
                        <li><strong>Predatory Lending:</strong> Exploit poor people through high-interest loans and debt traps</li>
                        <li><strong>Union Busting:</strong> Prevent workers from organizing to keep wages low</li>
                        <li><strong>Environmental Destruction:</strong> Externalize costs by polluting (costs paid by society, profits kept by company)</li>
                        <li><strong>Wage Suppression:</strong> Keep wages artificially low while extracting maximum profit</li>
                        <li><strong>Monopolistic Practices:</strong> Use market dominance to crush competitors and raise prices</li>
                        <li><strong>Corruption & Bribery:</strong> Pay officials to look the other way or change regulations</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 Often prosecuted but penalties are small compared to profits - cost of doing business
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="warning"></ion-icon>
                    The Stepped-Up Basis Loophole
                </div>
                <div class="insight-text">
                    <strong>The Most Powerful Wealth Transfer Tool:</strong> When someone dies, their heirs inherit assets at the current market value ("stepped-up basis"), not the original purchase price. This means:
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li>Billionaire buys stock for $1M in 1980</li>
                        <li>Stock worth $1B in 2024</li>
                        <li>Billionaire dies, heir inherits at $1B value</li>
                        <li>Heir sells immediately - NO capital gains tax on $999M profit</li>
                        <li>This costs US government $40+ billion annually in lost tax revenue</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 This single loophole allows trillions in wealth to pass tax-free across generations
                </div>
            </div>
            <div class="insight-item">
                <div class="insight-title">
                    <ion-icon name="lightbulb"></ion-icon>
                    How to Fight Back - Policy Solutions
                </div>
                <div class="insight-text">
                    <strong>Proposed Reforms to Reduce Wealth Inequality:</strong>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--text-muted);">
                        <li><strong>Eliminate Stepped-Up Basis:</strong> Tax capital gains at death like any other sale</li>
                        <li><strong>Wealth Tax:</strong> Annual tax on net worth above certain threshold (tried in Europe)</li>
                        <li><strong>Estate Tax Reform:</strong> Lower exemptions, increase rates, close loopholes</li>
                        <li><strong>Offshore Enforcement:</strong> Crack down on tax havens, enforce reporting requirements</li>
                        <li><strong>Financial Transparency:</strong> Require disclosure of beneficial ownership of companies</li>
                        <li><strong>Capital Gains Tax:</strong> Tax investment income same as wages</li>
                        <li><strong>Minimum Tax Rate:</strong> Ensure wealthy pay at least minimum percentage in taxes</li>
                        <li><strong>Strengthen IRS:</strong> Fund IRS to audit wealthy individuals and corporations</li>
                        <li><strong>Limit Lobbying:</strong> Reduce corporate influence on tax policy</li>
                    </ul>
                </div>
                <div style="font-size: 0.75rem; color: #a855f7; margin-top: 0.5rem; padding: 0.5rem; background: rgba(168, 85, 247, 0.1); border-radius: 4px; word-break: break-all;">
                    📊 These reforms face fierce opposition from the wealthy who benefit from current system
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading wealth transfer data:', error);
    }
};

// Initialize wealth transfer data when wealth-transfer view is opened
const initWealthTransferData = () => {
    fetchWealthTransferData();
};

// --- Monopoly Game Functions (Single Player - Real World Simulation) ---
// NO COMPUTER PLAYER - This is a pure financial simulation showing real-world consequences
let gameState = {
    playerCash: 2000,
    playerDebt: 0,
    playerProperties: {},
    turn: 0,
    gameLog: [],
    totalIncome: 0,
    totalExpenses: 0,
    netWorth: 2000
};

const properties = [
    { id: 1, name: 'Mediterranean Ave', price: 60, baseIncome: 2, color: 'brown' },
    { id: 2, name: 'Baltic Ave', price: 60, baseIncome: 2, color: 'brown' },
    { id: 3, name: 'Oriental Ave', price: 100, baseIncome: 6, color: 'light-blue' },
    { id: 4, name: 'Vermont Ave', price: 100, baseIncome: 6, color: 'light-blue' },
    { id: 5, name: 'Connecticut Ave', price: 120, baseIncome: 8, color: 'light-blue' },
    { id: 6, name: 'St. Charles Place', price: 140, baseIncome: 10, color: 'pink' },
    { id: 7, name: 'States Ave', price: 140, baseIncome: 10, color: 'pink' },
    { id: 8, name: 'Virginia Ave', price: 160, baseIncome: 12, color: 'pink' },
    { id: 9, name: 'St. James Place', price: 180, baseIncome: 14, color: 'orange' },
    { id: 10, name: 'Tennessee Ave', price: 180, baseIncome: 14, color: 'orange' },
    { id: 11, name: 'New York Ave', price: 200, baseIncome: 16, color: 'orange' },
    { id: 12, name: 'Kentucky Ave', price: 220, baseIncome: 18, color: 'red' },
    { id: 13, name: 'Indiana Ave', price: 220, baseIncome: 18, color: 'red' },
    { id: 14, name: 'Illinois Ave', price: 240, baseIncome: 20, color: 'red' },
    { id: 15, name: 'Atlantic Ave', price: 260, baseIncome: 22, color: 'yellow' },
    { id: 16, name: 'Ventnor Ave', price: 260, baseIncome: 22, color: 'yellow' },
    { id: 17, name: 'Marvin Gardens', price: 280, baseIncome: 24, color: 'yellow' },
    { id: 18, name: 'Pacific Ave', price: 300, baseIncome: 26, color: 'green' },
    { id: 19, name: 'North Carolina Ave', price: 300, baseIncome: 26, color: 'green' },
    { id: 20, name: 'Pennsylvania Ave', price: 320, baseIncome: 28, color: 'green' }
];

const initMonopolyGame = () => {
    gameState = {
        playerCash: 2000,
        playerDebt: 0,
        playerProperties: {},
        turn: 0,
        gameLog: [
            '🎮 Game started! You have $2,000.',
            '📊 Buy properties and upgrade them (green houses → red hotels).',
            '💰 Each turn: collect rental income, pay debt interest & maintenance.',
            '⚠️ Watch out for debt spirals and market crashes!'
        ],
        totalIncome: 0,
        totalExpenses: 0,
        netWorth: 2000
    };
    
    properties.forEach(prop => {
        gameState.playerProperties[prop.id] = { level: 0, owner: null };
    });
    
    renderGameBoard();
};

const renderGameBoard = () => {
    updateGameStats();
    renderProperties();
    renderYourProperties();
    updateGameLog();
};

const updateGameStats = () => {
    const playerNetWorth = gameState.playerCash - gameState.playerDebt + calculatePropertyValue('player');
    document.getElementById('player-cash').textContent = '$' + gameState.playerCash.toLocaleString();
    document.getElementById('player-debt').textContent = '$' + gameState.playerDebt.toLocaleString();
    document.getElementById('player-networth').textContent = '$' + playerNetWorth.toLocaleString();
    document.getElementById('player-properties').textContent = Object.values(gameState.playerProperties).filter(p => p.owner === 'player').length;
};

const calculatePropertyValue = (owner) => {
    let value = 0;
    properties.forEach(prop => {
        if (gameState.playerProperties[prop.id].owner === owner) {
            const level = gameState.playerProperties[prop.id].level;
            value += prop.price + (level * 50);
        }
    });
    return value;
};

const renderProperties = () => {
    const grid = document.getElementById('properties-grid');
    grid.innerHTML = properties.map(prop => {
        const propState = gameState.playerProperties[prop.id];
        const isOwned = propState.owner !== null;
        
        return `
            <div class="property-card ${isOwned ? 'owned' : ''}" onclick="buyProperty(${prop.id})">
                <div class="property-name">${prop.name}</div>
                <div class="property-price">Price: $${prop.price}</div>
                <div class="property-income">Income: $${prop.baseIncome}/turn</div>
                ${isOwned ? `
                    <div class="property-level">
                        Level: ${propState.level} ${propState.level >= 5 ? '🏨' : '🏠'.repeat(propState.level)}
                    </div>
                    <div class="property-actions">
                        <button class="btn-small" onclick="upgradeProperty(${prop.id}); event.stopPropagation();" ${gameState.playerCash < 50 ? 'disabled' : ''}>Upgrade ($50)</button>
                    </div>
                ` : `
                    <button class="btn-small" onclick="buyProperty(${prop.id}); event.stopPropagation();" ${gameState.playerCash < prop.price && gameState.playerDebt > 500 ? 'disabled' : ''}>Buy</button>
                `}
            </div>
        `;
    }).join('');
};

const renderYourProperties = () => {
    const container = document.getElementById('your-properties');
    const yourProps = properties.filter(p => gameState.playerProperties[p.id].owner === 'player');
    
    if (yourProps.length === 0) {
        container.innerHTML = '<p class="empty-state">No properties yet. Buy some to get started!</p>';
        return;
    }
    
    container.innerHTML = yourProps.map(prop => {
        const level = gameState.playerProperties[prop.id].level;
        const income = prop.baseIncome * (1 + level * 0.5);
        const maintenance = (prop.price + level * 50) * 0.01;
        
        return `
            <div class="property-card owned">
                <div class="property-name">${prop.name}</div>
                <div class="property-price">Paid: $${prop.price}</div>
                <div class="property-income">Income: $${income.toFixed(0)}/turn</div>
                <div class="property-maintenance">Maintenance: $${maintenance.toFixed(0)}/turn</div>
                <div class="property-level">
                    Level: ${level} ${level >= 5 ? '🏨' : '🏠'.repeat(level)}
                </div>
                <div class="property-actions">
                    <button class="btn-small" onclick="upgradeProperty(${prop.id})" ${gameState.playerCash < 50 ? 'disabled' : ''}>Upgrade ($50)</button>
                </div>
            </div>
        `;
    }).join('');
};

const buyProperty = (propId) => {
    const prop = properties.find(p => p.id === propId);
    const propState = gameState.playerProperties[propId];
    
    if (propState.owner !== null) {
        addGameLog(`❌ ${prop.name} is already owned!`);
        return;
    }
    
    if (gameState.playerCash >= prop.price) {
        gameState.playerCash -= prop.price;
        addGameLog(`✅ Bought ${prop.name} for $${prop.price}`);
    } else if (gameState.playerDebt < 500) {
        const needed = prop.price - gameState.playerCash;
        gameState.playerDebt += needed;
        gameState.playerCash = 0;
        addGameLog(`💳 Bought ${prop.name} for $${prop.price} (took $${needed} debt)`);
    } else {
        addGameLog(`❌ Can't afford ${prop.name} - debt too high!`);
        return;
    }
    
    propState.owner = 'player';
    renderGameBoard();
};

const upgradeProperty = (propId) => {
    const prop = properties.find(p => p.id === propId);
    const propState = gameState.playerProperties[propId];
    
    if (propState.owner !== 'player') {
        addGameLog('❌ You don\'t own this property!');
        return;
    }
    
    if (propState.level >= 5) {
        addGameLog(`🏨 ${prop.name} is already a hotel!`);
        return;
    }
    
    const upgradeCost = 50;
    if (gameState.playerCash >= upgradeCost) {
        gameState.playerCash -= upgradeCost;
        propState.level++;
        addGameLog(`🏗️ Upgraded ${prop.name} to level ${propState.level}`);
    } else if (gameState.playerDebt < 500) {
        gameState.playerDebt += upgradeCost - gameState.playerCash;
        gameState.playerCash = 0;
        propState.level++;
        addGameLog(`🏗️ Upgraded ${prop.name} to level ${propState.level} (took debt)`);
    } else {
        addGameLog(`❌ Can't upgrade - not enough cash and debt too high!`);
        return;
    }
    
    renderGameBoard();
};

const nextTurn = () => {
    gameState.turn++;
    let turnSummary = [];

    // 1. Collect rental income
    let playerIncome = 0;
    properties.forEach(prop => {
        if (gameState.playerProperties[prop.id].owner === 'player') {
            const level = gameState.playerProperties[prop.id].level;
            playerIncome += prop.baseIncome * (1 + level * 0.5);
        }
    });
    gameState.playerCash += playerIncome;
    gameState.totalIncome += playerIncome;
    if (playerIncome > 0) turnSummary.push(`💰 Income: +$${playerIncome.toFixed(0)}`);

    // 2. Pay debt interest (5% per turn = 60% annually)
    if (gameState.playerDebt > 0) {
        const debtInterest = gameState.playerDebt * 0.05;
        gameState.playerCash -= debtInterest;
        gameState.totalExpenses += debtInterest;
        turnSummary.push(`💳 Debt interest: -$${debtInterest.toFixed(0)}`);
    }

    // 3. Property maintenance costs (1% of property value per turn)
    let maintenanceCost = 0;
    properties.forEach(prop => {
        if (gameState.playerProperties[prop.id].owner === 'player') {
            const level = gameState.playerProperties[prop.id].level;
            const propValue = prop.price + (level * 50);
            maintenanceCost += propValue * 0.01;
        }
    });
    if (maintenanceCost > 0) {
        gameState.playerCash -= maintenanceCost;
        gameState.totalExpenses += maintenanceCost;
        turnSummary.push(`🔧 Maintenance: -$${maintenanceCost.toFixed(0)}`);
    }

    // 4. Market volatility - property values fluctuate
    const volatility = (Math.random() - 0.5) * 0.1;
    let volatilityImpact = 0;
    properties.forEach(prop => {
        if (gameState.playerProperties[prop.id].owner === 'player') {
            const level = gameState.playerProperties[prop.id].level;
            const propValue = prop.price + (level * 50);
            const change = propValue * volatility;
            volatilityImpact += change;
        }
    });
    if (volatilityImpact > 0) {
        turnSummary.push(`📈 Market boom: +$${volatilityImpact.toFixed(0)}`);
    } else if (volatilityImpact < 0) {
        turnSummary.push(`📉 Market crash: -$${Math.abs(volatilityImpact).toFixed(0)}`);
    }

    // 5. Bankruptcy check
    if (gameState.playerCash < 0) {
        const deficit = Math.abs(gameState.playerCash);
        gameState.playerDebt += deficit;
        gameState.playerCash = 0;
        turnSummary.push(`⚠️ BANKRUPTCY! Debt increased to $${gameState.playerDebt.toFixed(0)}`);
    }

    // 6. Debt spiral warning
    if (gameState.playerDebt > gameState.playerCash * 2 && gameState.playerDebt > 0) {
        const ratio = (gameState.playerDebt / (gameState.playerCash || 1)).toFixed(1);
        turnSummary.push(`🚨 DANGER: Debt is ${ratio}x your cash!`);
    }

    // 7. Win conditions
    if (gameState.turn === 10) {
        turnSummary.push(`🏆 Milestone: 10 turns completed!`);
    }
    if (gameState.turn === 25) {
        turnSummary.push(`🏆 Milestone: 25 turns! You're building an empire!`);
    }
    if (gameState.netWorth > 10000 && gameState.turn > 1) {
        turnSummary.push(`🌟 ACHIEVEMENT: Net worth exceeded $10,000!`);
    }
    if (gameState.netWorth > 50000) {
        turnSummary.push(`👑 ACHIEVEMENT: Net worth exceeded $50,000! You're a real estate mogul!`);
    }

    // Add turn summary to log
    addGameLog(`--- Turn ${gameState.turn} ---`);
    turnSummary.forEach(msg => addGameLog(msg));

    renderGameBoard();
};

;

const addGameLog = (message) => {
    gameState.gameLog.push(message);
    if (gameState.gameLog.length > 25) {
        gameState.gameLog.shift();
    }
};

const updateGameLog = () => {
    const logContainer = document.getElementById('game-log');
    if (!logContainer) return;
    logContainer.innerHTML = gameState.gameLog.map(entry => `<p class="log-entry">${entry}</p>`).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
};

const resetGame = () => {
    initMonopolyGame();
    renderGameBoard();
};

// Initialize game when tab is opened
const initGameTab = () => {
    if (!gameState.turn) {
        initMonopolyGame();
    }
    renderGameBoard();
};

// --- Finance News Functions ---
let currentNewsRegion = 'indian';
let currentNewsData = { indian: [], global: [] };

const initNewsTab = () => {
    // Tab switching
    document.querySelectorAll('.news-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetRegion = e.currentTarget.getAttribute('data-region');
            switchNewsTab(targetRegion);
        });
    });
    
    // Saved news filter
    const savedFilter = document.getElementById('saved-news-filter');
    if (savedFilter) {
        savedFilter.addEventListener('change', loadSavedNews);
    }
};

const switchNewsTab = (region) => {
    // Update tab buttons
    document.querySelectorAll('.news-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-region="${region}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.news-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (region === 'saved') {
        document.getElementById('saved-news-content').classList.add('active');
        loadSavedNews();
    } else {
        document.getElementById(`${region}-news-content`).classList.add('active');
        currentNewsRegion = region;
        
        // Load news if not already loaded
        if (currentNewsData[region].length === 0) {
            loadFinanceNews();
        }
    }
};

const loadFinanceNews = async () => {
    const category = document.getElementById('news-category').value;
    
    if (currentNewsRegion === 'indian') {
        await loadRegionNews('indian', 'indian-news-list', 'indian-news-count');
    } else if (currentNewsRegion === 'global') {
        await loadRegionNews('global', 'global-news-list', 'global-news-count');
    }
};

const loadRegionNews = async (region, listId, countId) => {
    const newsList = document.getElementById(listId);
    const category = document.getElementById('news-category').value;
    
    // Show loading state
    newsList.innerHTML = `
        <div class="news-loading">
            <ion-icon name="newspaper-outline" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem;"></ion-icon>
            <p>Loading ${region} ${category} news...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/search-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: category, region: region })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }

        const newsData = await response.json();
        currentNewsData[region] = newsData.results || [];
        displayFinanceNews(newsData.results || [], listId, countId, region);
        
    } catch (error) {
        console.error('Error loading finance news:', error);
        showNewsError(listId);
    }
};

const displayFinanceNews = (newsItems, listId, countId, region) => {
    const newsList = document.getElementById(listId);
    const countElement = document.getElementById(countId);
    
    if (!newsItems || newsItems.length === 0) {
        newsList.innerHTML = `
            <div class="news-error">
                <ion-icon name="newspaper-outline"></ion-icon>
                <h3>No News Found</h3>
                <p>Unable to fetch news at the moment. Please try again later.</p>
                <button class="btn-secondary" onclick="loadFinanceNews()">
                    <ion-icon name="refresh"></ion-icon> Try Again
                </button>
            </div>
        `;
        countElement.textContent = '0 articles';
        return;
    }

    newsList.innerHTML = '';
    
    // Show exactly 5 news items
    const displayNews = newsItems.slice(0, 5);
    countElement.textContent = `${displayNews.length} articles`;

    displayNews.forEach((item, index) => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        // Format date
        const publishedDate = item.publishedDate ? 
            new Date(item.publishedDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Recent';

        // Extract domain from URL
        const domain = item.domain || (item.url ? new URL(item.url).hostname : 'Unknown Source');
        
        // Check if news is already saved
        const savedNews = getSavedNews();
        const isAlreadySaved = savedNews.some(saved => saved.url === item.url);
        
        newsItem.innerHTML = `
            <div class="news-item-header">
                <div class="news-source">${domain}</div>
                <div class="news-date">${publishedDate}</div>
            </div>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-title">
                ${item.title}
            </a>
            <div class="news-snippet">
                ${item.snippet}
            </div>
            <div class="news-actions">
                <div class="news-actions-left">
                    <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-link">
                        <ion-icon name="open-outline"></ion-icon>
                        Read Full Article
                    </a>
                </div>
                <div class="news-actions-right">
                    <button class="btn-news-save ${isAlreadySaved ? 'saved' : ''}" 
                            onclick="saveNewsArticle('${region}', ${index}, event)" 
                            title="${isAlreadySaved ? 'Already saved' : 'Save article'}">
                        <ion-icon name="${isAlreadySaved ? 'bookmark' : 'bookmark-outline'}"></ion-icon>
                    </button>
                    <button class="btn-news-share" onclick="shareNewsArticle('${region}', ${index})" title="Share article">
                        <ion-icon name="share-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
        
        newsList.appendChild(newsItem);
    });
};

const saveNewsArticle = async (region, index, event) => {
    const article = currentNewsData[region][index];
    if (!article) {
        console.error('❌ Article not found:', { region, index });
        return;
    }
    
    console.log('📰 Attempting to save article:', article.title);
    
    // Check if user is guest
    if (isGuestMode) {
        console.log('❌ User is in guest mode');
        showLoginPromptModal(
            'You need to create an account or login to save news articles. Would you like to go to the login page?',
            () => {
                logout();
            }
        );
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
        console.error('❌ No auth token found');
        showAlertModal("Please login to save news articles.", 'warning');
        return;
    }
    
    console.log('✅ Token found, sending request...');
    
    try {
        const payload = {
            title: article.title,
            snippet: article.snippet,
            url: article.url,
            domain: article.domain,
            region: region,
            category: document.getElementById('news-category').value,
            published_date: article.publishedDate
        };
        
        console.log('📤 Payload:', payload);
        
        const response = await fetch('/api/save-news', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
            console.log('✅ Article saved successfully');
            // Update UI to show saved state
            if (event && event.target) {
                const saveBtn = event.target.closest('.btn-news-save');
                if (saveBtn) {
                    saveBtn.classList.add('saved');
                    const icon = saveBtn.querySelector('ion-icon');
                    if (icon) icon.setAttribute('name', 'bookmark');
                    saveBtn.title = 'Already saved';
                }
            }
            
            // Show success message
            showToast('Article saved successfully!', 'success');
        } else {
            const errData = await response.json();
            console.error('❌ Save failed:', errData);
            showAlertModal(`Could not save article: ${errData.error || 'Server error'}${errData.details ? '\n' + errData.details : ''}`, 'error');
        }
    } catch (error) {
        console.error("❌ Error saving news article:", error);
        showAlertModal(`Network error: ${error.message}`, 'error');
    }
};

const shareNewsArticle = async (region, index) => {
    const article = currentNewsData[region][index];
    if (!article) return;
    
    const shareData = {
        title: article.title,
        text: article.snippet,
        url: article.url
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(`${article.title}\n\n${article.snippet}\n\nRead more: ${article.url}`);
            showToast('Article link copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Error sharing article:', error);
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(article.url);
            showToast('Article link copied to clipboard!', 'success');
        } catch (clipboardError) {
            showAlertModal('Unable to share article. Please copy the link manually.', 'warning');
        }
    }
};

const loadSavedNews = async () => {
    const savedNewsList = document.getElementById('saved-news-list');
    const filter = document.getElementById('saved-news-filter').value;
    
    // Check if user is guest
    if (isGuestMode) {
        savedNewsList.innerHTML = `
            <div class="empty-saved-news">
                <ion-icon name="lock-closed-outline"></ion-icon>
                <h4>Login Required</h4>
                <p>Create an account or login to save and view your favorite news articles.</p>
                <button class="btn-primary" onclick="logout()">
                    <ion-icon name="log-in-outline"></ion-icon>
                    <span>Login / Sign Up</span>
                </button>
            </div>
        `;
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
        savedNewsList.innerHTML = `
            <div class="empty-saved-news">
                <ion-icon name="lock-closed-outline" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></ion-icon>
                <h4>Login Required</h4>
                <p>Please login to view your saved news articles.</p>
            </div>
        `;
        return;
    }
    
    savedNewsList.innerHTML = `
        <div class="news-loading">
            <ion-icon name="newspaper-outline" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem;"></ion-icon>
            <p>Loading saved news...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/saved-news?filter=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch saved news');
        }
        
        const data = await response.json();
        displaySavedNews(data.articles || []);
        
    } catch (error) {
        console.error('Error loading saved news:', error);
        savedNewsList.innerHTML = `
            <div class="news-error">
                <ion-icon name="warning-outline"></ion-icon>
                <h3>Unable to Load Saved News</h3>
                <p>There was an error loading your saved articles. Please try again.</p>
                <button class="btn-secondary" onclick="loadSavedNews()">
                    <ion-icon name="refresh"></ion-icon> Try Again
                </button>
            </div>
        `;
    }
};

const displaySavedNews = (savedNews) => {
    const savedNewsList = document.getElementById('saved-news-list');
    
    if (!savedNews || savedNews.length === 0) {
        savedNewsList.innerHTML = `
            <div class="empty-saved-news">
                <ion-icon name="bookmark-outline" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></ion-icon>
                <h4>No Saved News</h4>
                <p>Save interesting articles to read them later. Use the bookmark icon on any news article.</p>
            </div>
        `;
        return;
    }
    
    savedNewsList.innerHTML = '';
    
    savedNews.forEach(item => {
        const savedItem = document.createElement('div');
        savedItem.className = 'saved-news-item';
        
        const savedDate = new Date(item.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        savedItem.innerHTML = `
            <div class="saved-news-meta">
                <div class="saved-news-region">
                    <ion-icon name="${item.region === 'indian' ? 'flag' : 'globe'}"></ion-icon>
                    ${item.region === 'indian' ? 'Indian Markets' : 'Global Markets'}
                </div>
                <div class="saved-news-date">Saved on ${savedDate}</div>
            </div>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-title">
                ${item.title}
            </a>
            <div class="news-snippet">
                ${item.snippet}
            </div>
            <div class="saved-news-actions">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn-news-action">
                    <ion-icon name="open-outline"></ion-icon>
                    Read Article
                </a>
                <button class="btn-news-action" onclick="shareNewsUrl('${item.url}', '${item.title}')">
                    <ion-icon name="share-outline"></ion-icon>
                    Share
                </button>
                <button class="btn-news-action delete" onclick="deleteSavedNews('${item.id}')">
                    <ion-icon name="trash-outline"></ion-icon>
                    Delete
                </button>
            </div>
        `;
        
        savedNewsList.appendChild(savedItem);
    });
};

const deleteSavedNews = async (newsId) => {
    showConfirmationModal(
        'Are you sure you want to delete this saved article? This action cannot be undone.',
        async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            
            try {
                const response = await fetch(`/api/saved-news/${newsId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Article deleted successfully!', 'success');
                    loadSavedNews(); // Refresh the list
                } else {
                    const errData = await response.json();
                    showAlertModal(`Could not delete article: ${errData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error("Error deleting saved news:", error);
                showAlertModal("Network error. Make sure the server is running.", 'error');
            }
        }
    );
};

const shareNewsUrl = async (url, title) => {
    try {
        if (navigator.share) {
            await navigator.share({ title, url });
        } else {
            await navigator.clipboard.writeText(url);
            showToast('Article link copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Error sharing article:', error);
        showAlertModal('Unable to share article. Please copy the link manually.', 'warning');
    }
};

const getSavedNews = () => {
    // This would typically fetch from server, but for now return empty array
    return [];
};

// showToast is already defined at the top of the file (line 225)
// Removed duplicate declaration to fix JavaScript loading error

const showNewsError = (listId) => {
    const newsList = document.getElementById(listId);
    newsList.innerHTML = `
        <div class="news-error">
            <ion-icon name="warning-outline"></ion-icon>
            <h3>Unable to Load News</h3>
            <p>There was an error fetching the latest finance news. Please check your internet connection and try again.</p>
            <button class="btn-secondary" onclick="loadFinanceNews()">
                <ion-icon name="refresh"></ion-icon> Try Again
            </button>
        </div>
    `;
};

// --- My Notes Functions ---
let notesData = {
    board: { todo: [], inprogress: [], done: [] },
    sticky: []
};
let autoSaveTimeout = null;
let currentNotesTab = 'board';

// Make functions globally available
window.addStickyNote = () => {
    console.log('Adding sticky note...'); // Debug log
    
    const noteId = Date.now().toString();
    const newNote = {
        id: noteId,
        content: '',
        category: 'financial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Ensure notesData.sticky exists
    if (!notesData.sticky) {
        notesData.sticky = [];
    }
    
    notesData.sticky.push(newNote);
    console.log('Note added, rendering...', notesData.sticky); // Debug log
    
    renderStickyNotes();
    autoSaveNotes();
    
    // Focus on the new note
    setTimeout(() => {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"] .sticky-note-content`);
        if (noteElement) {
            noteElement.focus();
        }
    }, 100);
};

window.addBoardCard = (status) => {
    const cardId = Date.now().toString();
    const newCard = {
        id: cardId,
        content: '',
        status: status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    notesData.board[status].push(newCard);
    renderBoardColumn(status);
    autoSaveNotes();
    
    // Focus on the new card
    setTimeout(() => {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"] .board-card-content`);
        if (cardElement) {
            cardElement.focus();
        }
    }, 100);
};

window.updateBoardCard = (cardId) => {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"] .board-card-content`);
    if (!cardElement) return;
    
    const content = cardElement.value.trim();
    
    // Find and update the card
    for (const status in notesData.board) {
        const cardIndex = notesData.board[status].findIndex(card => card.id === cardId);
        if (cardIndex !== -1) {
            notesData.board[status][cardIndex].content = content;
            notesData.board[status][cardIndex].updatedAt = new Date().toISOString();
            break;
        }
    }
    
    autoSaveNotes();
};

window.deleteBoardCard = (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    
    // Remove from data
    for (const status in notesData.board) {
        notesData.board[status] = notesData.board[status].filter(card => card.id !== cardId);
    }
    
    // Re-render all columns
    renderBoardNotes();
    autoSaveNotes();
};

window.handleCardKeydown = (event, cardId) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        updateBoardCard(cardId);
        event.target.blur();
    }
};

window.updateStickyNote = (noteId) => {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"] .sticky-note-content`);
    if (!noteElement) return;
    
    const content = noteElement.value.trim();
    const noteIndex = notesData.sticky.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
        notesData.sticky[noteIndex].content = content;
        notesData.sticky[noteIndex].updatedAt = new Date().toISOString();
        autoSaveNotes();
    }
};

window.updateStickyCategory = (noteId, newCategory) => {
    const noteIndex = notesData.sticky.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
        notesData.sticky[noteIndex].category = newCategory;
        notesData.sticky[noteIndex].updatedAt = new Date().toISOString();
        renderStickyNotes();
        autoSaveNotes();
    }
};

window.deleteStickyNote = (noteId) => {
    showConfirmationModal(
        'Are you sure you want to delete this sticky note? This action cannot be undone.',
        () => {
            notesData.sticky = notesData.sticky.filter(note => note.id !== noteId);
            renderStickyNotes();
            autoSaveNotes();
            
            // Show success message
            showToast('Sticky note deleted successfully', 'success');
        }
    );
};

window.handleStickyKeydown = (event, noteId) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        updateStickyNote(noteId);
        event.target.blur();
    }
};

window.showLoginPromptForNotes = () => {
    showLoginPromptModal(
        'Create an account or login to save your notes permanently and access them from any device. Continue?',
        () => {
            logout();
        }
    );
};

const initNotesSection = () => {
    console.log('Initializing notes section...'); // Debug log
    
    // Initialize tabs
    document.querySelectorAll('.notes-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const notesType = e.currentTarget.getAttribute('data-notes-type');
            switchNotesTab(notesType);
        });
    });
    
    // Initialize sticky notes category filter - now using custom dropdown
    // No event listener needed as it's handled by onclick in HTML
    
    // Load existing notes
    loadNotesData();
    
    // Show login prompt for guests
    if (isGuestMode) {
        showGuestNotesPrompt();
    }
    
    console.log('Notes section initialized'); // Debug log
};

const switchNotesTab = (notesType) => {
    currentNotesTab = notesType;
    
    // Update tab buttons
    document.querySelectorAll('.notes-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-notes-type="${notesType}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.notes-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${notesType}-notes-content`).classList.add('active');
    
    // Load appropriate content
    if (notesType === 'board') {
        renderBoardNotes();
    } else if (notesType === 'sticky') {
        renderStickyNotes();
    }
};

const showGuestNotesPrompt = () => {
    const loginBtn = document.getElementById('notes-login-btn');
    if (loginBtn) {
        loginBtn.style.display = 'flex';
    }
    
    // Show prompt after a short delay
    setTimeout(() => {
        if (isGuestMode) {
            showToast('💡 Login to save your notes permanently across devices!', 'info');
        }
    }, 2000);
};

// Board Notes Functions

const renderBoardNotes = () => {
    renderBoardColumn('todo');
    renderBoardColumn('inprogress');
    renderBoardColumn('done');
};

const renderBoardColumn = (status) => {
    const container = document.getElementById(`${status}-cards`);
    if (!container) return;
    
    const cards = notesData.board[status] || [];
    
    if (cards.length === 0) {
        container.innerHTML = `
            <div class="empty-notes">
                <ion-icon name="document-outline"></ion-icon>
                <p>No cards yet. Click the + button to add one.</p>
            </div>
        `;
        
        // Ensure empty columns can still accept drops
        container.removeEventListener('dragover', handleDragOver);
        container.removeEventListener('drop', handleDrop);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
        return;
    }
    
    container.innerHTML = '';
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'board-card';
        cardElement.setAttribute('data-card-id', card.id);
        cardElement.draggable = true;
        
        const updatedDate = new Date(card.updatedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short'
        });
        
        cardElement.innerHTML = `
            <textarea class="board-card-content" placeholder="Enter your task or note..."
                      onblur="updateBoardCard('${card.id}')" 
                      onkeydown="handleCardKeydown(event, '${card.id}')">${card.content}</textarea>
            <div class="board-card-meta">
                <div class="board-card-date">${updatedDate}</div>
                <div class="board-card-actions">
                    <button class="btn-card-action delete" onclick="deleteBoardCard('${card.id}')" title="Delete card">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
        
        // Add drag event listeners to the card
        cardElement.addEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragend', handleDragEnd);
        
        container.appendChild(cardElement);
    });
    
    // Ensure drop zone listeners are set up for the container
    // Remove existing listeners first to avoid duplicates
    container.removeEventListener('dragover', handleDragOver);
    container.removeEventListener('drop', handleDrop);
    
    // Add fresh listeners
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
};

const updateBoardCard = (cardId) => {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"] .board-card-content`);
    if (!cardElement) return;
    
    const content = cardElement.value.trim();
    
    // Find and update the card
    for (const status in notesData.board) {
        const cardIndex = notesData.board[status].findIndex(card => card.id === cardId);
        if (cardIndex !== -1) {
            notesData.board[status][cardIndex].content = content;
            notesData.board[status][cardIndex].updatedAt = new Date().toISOString();
            break;
        }
    }
    
    autoSaveNotes();
};

const deleteBoardCard = (cardId) => {
    showConfirmationModal(
        'Are you sure you want to delete this task card? This action cannot be undone.',
        () => {
            // Remove from data
            for (const status in notesData.board) {
                notesData.board[status] = notesData.board[status].filter(card => card.id !== cardId);
            }
            
            // Re-render all columns
            renderBoardNotes();
            autoSaveNotes();
            
            // Show success message
            showToast('Task card deleted successfully', 'success');
        }
    );
};

// Make deleteBoardCard globally accessible
window.deleteBoardCard = deleteBoardCard;

const handleCardKeydown = (event, cardId) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        updateBoardCard(cardId);
        event.target.blur();
    }
};

// Drag and Drop Functions
let draggedCard = null;

const handleDragStart = (e) => {
    console.log('Drag started:', e.target); // Debug log
    draggedCard = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
};

const handleDragEnd = (e) => {
    console.log('Drag ended'); // Debug log
    e.target.classList.remove('dragging');
    draggedCard = null;
};

const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

const handleDrop = (e) => {
    e.preventDefault();
    console.log('Drop event triggered on:', e.currentTarget); // Debug log
    
    if (!draggedCard) {
        console.log('No dragged card found'); // Debug log
        return;
    }
    
    const targetColumn = e.currentTarget;
    const newStatus = targetColumn.id.replace('-cards', '');
    const cardId = draggedCard.getAttribute('data-card-id');
    
    console.log('Moving card:', cardId, 'to status:', newStatus); // Debug log
    
    // Find the card and move it
    let cardData = null;
    for (const status in notesData.board) {
        const cardIndex = notesData.board[status].findIndex(card => card.id === cardId);
        if (cardIndex !== -1) {
            cardData = notesData.board[status].splice(cardIndex, 1)[0];
            console.log('Found card in status:', status); // Debug log
            break;
        }
    }
    
    if (cardData) {
        cardData.status = newStatus;
        cardData.updatedAt = new Date().toISOString();
        notesData.board[newStatus].push(cardData);
        
        console.log('Card moved successfully'); // Debug log
        renderBoardNotes();
        autoSaveNotes();
    } else {
        console.error('Card data not found for ID:', cardId); // Debug log
    }
};

const renderStickyNotes = () => {
    console.log('Rendering sticky notes...'); // Debug log
    
    const container = document.getElementById('sticky-notes-grid');
    if (!container) {
        console.error('sticky-notes-grid container not found');
        return;
    }
    
    const filterElement = document.getElementById('sticky-selected-text');
    let filter = 'all';
    if (filterElement) {
        const selectedText = filterElement.textContent.toLowerCase();
        if (selectedText === 'all categories') filter = 'all';
        else if (selectedText === 'financial') filter = 'financial';
        else if (selectedText === 'investment') filter = 'investment';
        else if (selectedText === 'budget') filter = 'budget';
        else if (selectedText === 'goals') filter = 'goals';
        else if (selectedText === 'ideas') filter = 'ideas';
        else if (selectedText === 'reminders') filter = 'reminders';
    }
    
    console.log('Current filter:', filter, 'Notes data:', notesData.sticky); // Debug log
    
    const filteredNotes = filter === 'all' 
        ? notesData.sticky 
        : notesData.sticky.filter(note => note.category === filter);
    
    console.log('Filtered notes:', filteredNotes); // Debug log
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-notes">
                <ion-icon name="sticky-note-outline"></ion-icon>
                <h3>No Notes Yet</h3>
                <p>Create your first sticky note to organize your financial thoughts and ideas.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = `sticky-note ${note.category}`;
        noteElement.setAttribute('data-note-id', note.id);
        noteElement.setAttribute('data-category', note.category);
        
        const updatedDate = new Date(note.updatedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        noteElement.innerHTML = `
            <div class="sticky-note-header">
                <select class="sticky-note-category" onchange="updateStickyCategory('${note.id}', this.value)">
                    <option value="financial" ${note.category === 'financial' ? 'selected' : ''}>Financial</option>
                    <option value="investment" ${note.category === 'investment' ? 'selected' : ''}>Investment</option>
                    <option value="budget" ${note.category === 'budget' ? 'selected' : ''}>Budget</option>
                    <option value="goals" ${note.category === 'goals' ? 'selected' : ''}>Goals</option>
                    <option value="ideas" ${note.category === 'ideas' ? 'selected' : ''}>Ideas</option>
                    <option value="reminders" ${note.category === 'reminders' ? 'selected' : ''}>Reminders</option>
                </select>
                <div class="sticky-note-actions">
                    <button class="btn-sticky-action" onclick="deleteStickyNote('${note.id}')" title="Delete note">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
            <textarea class="sticky-note-content" placeholder="Write your note here..."
                      onblur="updateStickyNote('${note.id}')"
                      onkeydown="handleStickyKeydown(event, '${note.id}')">${note.content}</textarea>
            <div class="sticky-note-footer">
                Last updated: ${updatedDate}
            </div>
        `;
        
        container.appendChild(noteElement);
    });
    
    console.log('Sticky notes rendered successfully'); // Debug log
};

const filterStickyNotes = () => {
    renderStickyNotes();
};

// Update the global filtering function to work with new dropdown
window.filterStickyNotesByCategory = (category) => {
    const notes = document.querySelectorAll('.sticky-note');
    notes.forEach(note => {
        if (category === 'all' || note.dataset.category === category) {
            note.style.display = 'block';
        } else {
            note.style.display = 'none';
        }
    });
};

// Auto-save Functions
const autoSaveNotes = () => {
    const statusElement = document.getElementById('auto-save-status');
    if (statusElement) {
        statusElement.classList.add('saving');
        statusElement.innerHTML = '<ion-icon name="sync"></ion-icon><span>Saving...</span>';
    }
    
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Set new timeout
    autoSaveTimeout = setTimeout(async () => {
        await saveNotesToServer();
        
        if (statusElement) {
            statusElement.classList.remove('saving');
            statusElement.innerHTML = '<ion-icon name="checkmark-circle" style="color: var(--success);"></ion-icon><span>Auto-saved</span>';
        }
    }, 1000);
};

const saveNotesToServer = async () => {
    // For guests, save to localStorage
    if (isGuestMode || !localStorage.getItem('auth_token')) {
        localStorage.setItem('guest_notes', JSON.stringify(notesData));
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/save-notes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(notesData)
        });
        
        if (!response.ok) {
            console.error('Failed to save notes to server');
        }
    } catch (error) {
        console.error('Error saving notes:', error);
    }
};

const loadNotesData = async () => {
    // For guests, load from localStorage
    if (isGuestMode || !localStorage.getItem('auth_token')) {
        const savedNotes = localStorage.getItem('guest_notes');
        if (savedNotes) {
            notesData = JSON.parse(savedNotes);
        }
        renderBoardNotes();
        renderStickyNotes();
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/get-notes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.notes_data) {
                notesData = data.notes_data;
            }
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
    
    renderBoardNotes();
    renderStickyNotes();
};

// showToast is already defined at the top of the file (line 225)
// Removed duplicate declaration to fix JavaScript loading error

// Enhanced save success feedback
const originalSaveCalculation = saveCalculation;
window.saveCalculation = async (type, e) => {
    const result = await originalSaveCalculation(type, e);
    if (!isGuestMode) {
        showToast(`${type} calculation saved successfully!`, 'success');
    }
    return result;
};

;

// ============================================
// DEATH CLOCK - Global Mortality Statistics
// ============================================

// Global death clock state
let deathClockState = {
    isRunning: false,
    totalDeathsThisMinute: 0,
    deathsByCategory: {},
    lastUpdateTime: Date.now(),
    deathsPerSecond: 1.8, // Global average: ~108 deaths per minute
    categoryData: {
        'Heart Disease': { perMinute: 32, color: '#ef4444', icon: 'heart' },
        'Cancer': { perMinute: 28, color: '#f97316', icon: 'alert-circle' },
        'Respiratory': { perMinute: 18, color: '#06b6d4', icon: 'wind' },
        'Stroke': { perMinute: 16, color: '#8b5cf6', icon: 'flash' },
        'Accidents': { perMinute: 12, color: '#eab308', icon: 'warning' },
        'Suicide': { perMinute: 8, color: '#6366f1', icon: 'sad' },
        'Homicide': { perMinute: 6, color: '#dc2626', icon: 'alert' },
        'Infectious Disease': { perMinute: 8, color: '#10b981', icon: 'bug' },
        'Maternal/Child': { perMinute: 5, color: '#ec4899', icon: 'heart' },
        'Other': { perMinute: 15, color: '#64748b', icon: 'help-circle' }
    }
};

// Initialize Death Clock
const initDeathClock = () => {
    deathClockState.isRunning = false;
    deathClockState.totalDeathsThisMinute = 0;
    deathClockState.deathsByCategory = {};
    
    // Initialize category counters
    Object.keys(deathClockState.categoryData).forEach(category => {
        deathClockState.deathsByCategory[category] = 0;
    });
    
    renderDeathClockUI();
    loadDeathClockInsights();
};

// Render Death Clock UI
const renderDeathClockUI = () => {
    // Render death categories
    const categoriesGrid = document.getElementById('death-categories');
    if (categoriesGrid) {
        categoriesGrid.innerHTML = Object.entries(deathClockState.categoryData).map(([category, data]) => `
            <div class="category-card" style="border-left: 4px solid ${data.color}">
                <div class="category-header">
                    <ion-icon name="${data.icon}"></ion-icon>
                    <h4>${category}</h4>
                </div>
                <div class="category-count" id="count-${category.replace(/\s+/g, '-')}">0</div>
                <div class="category-rate">${data.perMinute} per minute</div>
            </div>
        `).join('');
    }
    
    // Render death statistics
    const statsGrid = document.getElementById('death-stats');
    if (statsGrid) {
        const totalPerMinute = Object.values(deathClockState.categoryData).reduce((sum, d) => sum + d.perMinute, 0);
        const totalPerHour = totalPerMinute * 60;
        const totalPerDay = totalPerHour * 24;
        const totalPerYear = totalPerDay * 365;
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalPerMinute}</div>
                <div class="stat-label">Deaths per Minute</div>
                <div class="stat-source">Global average (WHO, UN data)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalPerHour.toLocaleString()}</div>
                <div class="stat-label">Deaths per Hour</div>
                <div class="stat-source">~${(totalPerHour / 60).toFixed(0)} per second</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalPerDay.toLocaleString()}</div>
                <div class="stat-label">Deaths per Day</div>
                <div class="stat-source">Global daily mortality</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(totalPerYear / 1000000).toFixed(1)}M</div>
                <div class="stat-label">Deaths per Year</div>
                <div class="stat-source">~${(totalPerYear / 1000000).toFixed(1)} million annually</div>
            </div>
        `;
    }
};

// Start Death Clock
const startDeathClock = () => {
    if (deathClockState.isRunning) return;
    
    deathClockState.isRunning = true;
    deathClockState.totalDeathsThisMinute = 0;
    deathClockState.lastUpdateTime = Date.now();
    
    // Reset category counters
    Object.keys(deathClockState.categoryData).forEach(category => {
        deathClockState.deathsByCategory[category] = 0;
    });
    
    // Update UI buttons
    document.getElementById('start-clock-btn').disabled = true;
    document.getElementById('stop-clock-btn').disabled = false;
    
    // Start the clock ticker
    updateDeathCounter();
};

// Stop Death Clock
const stopDeathClock = () => {
    deathClockState.isRunning = false;
    
    // Update UI buttons
    document.getElementById('start-clock-btn').disabled = false;
    document.getElementById('stop-clock-btn').disabled = true;
};

// Reset Death Clock
const resetDeathClock = () => {
    stopDeathClock();
    deathClockState.totalDeathsThisMinute = 0;
    deathClockState.lastUpdateTime = Date.now();
    
    // Reset category counters
    Object.keys(deathClockState.categoryData).forEach(category => {
        deathClockState.deathsByCategory[category] = 0;
    });
    
    // Update display
    document.getElementById('death-counter').textContent = '0';
    Object.keys(deathClockState.categoryData).forEach(category => {
        const countEl = document.getElementById(`count-${category.replace(/\s+/g, '-')}`);
        if (countEl) countEl.textContent = '0';
    });
};

// Update Death Counter
const updateDeathCounter = () => {
    if (!deathClockState.isRunning) return;
    
    const now = Date.now();
    const elapsedSeconds = (now - deathClockState.lastUpdateTime) / 1000;
    
    // Calculate deaths in elapsed time
    const deathsInElapsed = elapsedSeconds * (deathClockState.deathsPerSecond);
    deathClockState.totalDeathsThisMinute += deathsInElapsed;
    deathClockState.lastUpdateTime = now;
    
    // Update total counter
    document.getElementById('death-counter').textContent = Math.floor(deathClockState.totalDeathsThisMinute);
    
    // Update category counters proportionally
    Object.entries(deathClockState.categoryData).forEach(([category, data]) => {
        const categoryDeathsInElapsed = deathsInElapsed * (data.perMinute / 108); // 108 = total per minute
        deathClockState.deathsByCategory[category] += categoryDeathsInElapsed;
        
        const countEl = document.getElementById(`count-${category.replace(/\s+/g, '-')}`);
        if (countEl) {
            countEl.textContent = Math.floor(deathClockState.deathsByCategory[category]);
        }
    });
    
    // Continue animation
    requestAnimationFrame(updateDeathCounter);
};

// Load Death Clock Insights
const loadDeathClockInsights = () => {
    const insightsEl = document.getElementById('death-insights');
    if (!insightsEl) return;
    
    insightsEl.innerHTML = `
        <div class="insight-card">
            <h4>Understanding Global Mortality</h4>
            <p>Every minute, approximately 108 people die globally. This clock visualizes the scale of human mortality and the leading causes of death worldwide.</p>
        </div>
        
        <div class="insight-card">
            <h4>Leading Causes of Death</h4>
            <ul>
                <li><strong>Non-Communicable Diseases (71%):</strong> Heart disease, cancer, respiratory diseases, and stroke account for the majority of deaths globally.</li>
                <li><strong>Communicable Diseases (17%):</strong> Infectious diseases, maternal and child health issues.</li>
                <li><strong>Injuries (12%):</strong> Accidents, suicide, and homicide.</li>
            </ul>
        </div>
        
        <div class="insight-card">
            <h4>Global Disparities</h4>
            <p>Mortality rates vary dramatically by region and income level. Low-income countries have higher rates of infectious disease and maternal mortality, while high-income countries see more deaths from chronic diseases.</p>
        </div>
        
        <div class="insight-card">
            <h4>Data Sources</h4>
            <ul>
                <li>World Health Organization (WHO) - Global Health Observatory</li>
                <li>United Nations - World Population Prospects</li>
                <li>CDC - Global Health Statistics</li>
                <li>UNODC - Global Study on Homicide</li>
            </ul>
        </div>
        
        <div class="insight-card">
            <h4>What Can We Do?</h4>
            <ul>
                <li>Support public health initiatives and disease prevention programs</li>
                <li>Advocate for healthcare access in underserved regions</li>
                <li>Promote healthy lifestyles and disease awareness</li>
                <li>Support mental health and suicide prevention efforts</li>
                <li>Work toward reducing violence and accidents</li>
            </ul>
        </div>
    `;
};