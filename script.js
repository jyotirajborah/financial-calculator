
// [DEPRECATED] PDF export functions removed - use Excel export only
// The following functions are kept for backwards compatibility but are no longer used in the UI:
// - exportFromButton(elementId) - reads export settings and calls exportToPDF
// - serverExport(elementId) - server-side Puppeteer rendering (endpoint still available for legacy callers)
// - exportToPDF(elementId, options) - client-side html2pdf export
// 
// Please use exportToExcel(elementId) for data export instead.

// State Management
let currentUser = null;

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

// Debug function to test authentication
window.debugAuth = function() {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Auth overlay:', document.getElementById('auth-overlay'));
    console.log('Auth tabs:', document.querySelectorAll('.auth-tab'));
    console.log('Auth forms:', document.querySelectorAll('.auth-form'));
    console.log('Guest continue btn:', document.getElementById('guest-continue-btn'));
    console.log('Login form:', document.getElementById('login-form'));
    console.log('Signup form:', document.getElementById('signup-form'));
    console.log('Guest form:', document.getElementById('guest-form'));
    console.log('Current user:', currentUser);
    console.log('Guest mode:', isGuestMode);
    console.log('=== END DEBUG INFO ===');
};

// Force guest login for testing
window.forceGuestLogin = function() {
    console.log('Forcing guest login...');
    try {
        loginAsGuest();
        console.log('Guest login successful');
    } catch (err) {
        console.error('Guest login failed:', err);
    }
};

// Emergency bypass function
window.emergencyBypass = function() {
    console.log('🚨 EMERGENCY BYPASS ACTIVATED');
    
    try {
        // Force guest mode
        isGuestMode = true;
        currentUser = { name: 'Guest', email: null };
        
        // Hide auth overlay
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
        
        // Show app container
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.display = 'flex';
            appContainer.style.opacity = '1';
        }
        
        // Set guest profile
        const guestIcon = document.getElementById('guest-icon');
        const userInitials = document.getElementById('user-initials');
        if (guestIcon && userInitials) {
            guestIcon.style.display = 'block';
            userInitials.style.display = 'none';
        }
        
        // Initialize calculators
        calculateSIP();
        calculateEMI();
        calculateCI();
        calculateBudget();
        calculateTax();
        calculateNetWorth();
        
        showToast('🚨 Emergency bypass successful! You are now in the app as a guest.', 'success');
        console.log('✅ EMERGENCY BYPASS SUCCESSFUL');
        
    } catch (err) {
        console.error('❌ EMERGENCY BYPASS FAILED:', err);
        alert('Emergency bypass failed. Please refresh the page and try again.');
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
                <button class="btn-primary" onclick="logout()" style="margin-top: 1rem;">
                    <ion-icon name="log-in-outline"></ion-icon> Login / Sign Up
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
                <button class="btn-primary" onclick="logout()" style="margin-top: 1rem;">
                    <ion-icon name="log-in-outline"></ion-icon> Login / Sign Up
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
let isGuestMode = false;

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
    
    isGuestMode = false;
    currentUser = user;
    if (token) localStorage.setItem('auth_token', token);
    
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
    
    if (user && user.name) {
        // Extract initials from user name
        const initials = user.name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2);
        if (userInitials) {
            userInitials.textContent = initials;
            console.log('👤 SET USER INITIALS:', initials);
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
    
    // Refresh charts now that container is visible
    calculateSIP();
    calculateEMI();
    calculateCI();
    calculateBudget();
    calculateTax();
};

const logout = () => {
    isGuestMode = false;
    currentUser = null;
    localStorage.removeItem('auth_token');
    
    const overlay = document.getElementById('auth-overlay');
    const appContainer = document.getElementById('app-container');
    
    appContainer.style.display = 'none';
    overlay.classList.add('active');
    
    // Reset to login tab
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelector('.auth-tab[data-form="login"]').classList.add('active');
    document.getElementById('login-form').classList.add('active');
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
                    login(data.user, data.token);
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
                        login(data.user, data.token);
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
            debtMonths = Math.ceil(Math.log(debtPayment / (debtPayment - debt * dRate)) / Math.log(1 + dRate));
            totalDebtInterest = debtPayment * debtMonths - debt;
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
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                console.log('✅ Auto-login successful:', data.user);
                login(data.user, authToken);
                return;
            } else {
                console.log('❌ Token invalid, clearing...');
                localStorage.removeItem('auth_token');
            }
        })
        .catch(err => {
            console.log('❌ Auto-login failed:', err);
            localStorage.removeItem('auth_token');
        });
    }
    
    // EMERGENCY BYPASS - Auto-login as guest after 3 seconds if auth fails
    setTimeout(() => {
        const overlay = document.getElementById('auth-overlay');
        const appContainer = document.getElementById('app-container');
        
        if (overlay && overlay.classList.contains('active') && appContainer) {
            console.log('🚨 EMERGENCY BYPASS: Auto-logging in as guest...');
            try {
                // Force guest login
                isGuestMode = true;
                currentUser = { name: 'Guest', email: null };
                
                // Hide auth overlay and show app
                overlay.classList.remove('active');
                appContainer.style.display = 'flex';
                appContainer.style.opacity = '1';
                
                // Set guest profile
                const guestIcon = document.getElementById('guest-icon');
                const userInitials = document.getElementById('user-initials');
                if (guestIcon && userInitials) {
                    guestIcon.style.display = 'block';
                    userInitials.style.display = 'none';
                }
                
                console.log('✅ EMERGENCY BYPASS: Successfully entered as guest!');
                showToast('Entered as Guest - Authentication bypassed', 'success');
            } catch (err) {
                console.error('❌ EMERGENCY BYPASS FAILED:', err);
            }
        }
    }, 3000);
    
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
    
    // Show welcome toast for new users
    setTimeout(() => {
        if (isGuestMode) {
            showToast('Welcome! Press Alt+1-9 for quick navigation or Ctrl+S to save calculations', 'success');
        } else {
            showToast('Welcome back! Use keyboard shortcuts for faster navigation', 'success');
        }
    }, 1000);
    
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
                            onclick="saveNewsArticle('${region}', ${index})" 
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

const saveNewsArticle = async (region, index) => {
    const article = currentNewsData[region][index];
    if (!article) return;
    
    // Check if user is guest
    if (isGuestMode) {
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
        showAlertModal("Please login to save news articles.", 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/save-news', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: article.title,
                snippet: article.snippet,
                url: article.url,
                domain: article.domain,
                region: region,
                category: document.getElementById('news-category').value,
                published_date: article.publishedDate
            })
        });
        
        if (response.ok) {
            // Update UI to show saved state
            const saveBtn = event.target.closest('.btn-news-save');
            saveBtn.classList.add('saved');
            saveBtn.querySelector('ion-icon').setAttribute('name', 'bookmark');
            saveBtn.title = 'Already saved';
            
            // Show success message
            showToast('Article saved successfully!', 'success');
        } else {
            const errData = await response.json();
            showAlertModal(`Could not save article: ${errData.error || 'Server error'}`, 'error');
        }
    } catch (error) {
        console.error("Error saving news article:", error);
        showAlertModal("Network error. Make sure the server is running.", 'error');
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
                <ion-icon name="lock-closed-outline" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></ion-icon>
                <h4>Login Required</h4>
                <p>Create an account or login to save and view your favorite news articles.</p>
                <button class="btn-primary" onclick="logout()" style="margin-top: 1rem;">
                    <ion-icon name="log-in-outline"></ion-icon> Login / Sign Up
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
        
        const savedNews = await response.json();
        displaySavedNews(savedNews);
        
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

const showToast = (message, type = 'info') => {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : 'var(--accent-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
};

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

// Toast Notification System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Enhanced save success feedback
const originalSaveCalculation = saveCalculation;
window.saveCalculation = async (type, e) => {
    const result = await originalSaveCalculation(type, e);
    if (!isGuestMode) {
        showToast(`${type} calculation saved successfully!`, 'success');
    }
    return result;
};