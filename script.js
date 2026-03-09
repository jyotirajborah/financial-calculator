// State Management
let currentUser = null;

// Format numbers as Indian Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN').format(Math.round(amount));
};

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
};

syncInputs('ci-principal', 'ci-principal-range', calculateCI);
syncInputs('ci-rate', 'ci-rate-range', calculateCI);
syncInputs('ci-time', 'ci-time-range', calculateCI);
document.getElementById('ci-compounding').addEventListener('change', calculateCI);


// --- Budget Planner ---
const calculateBudget = () => {
    const income = parseFloat(document.getElementById('budget-income').value) || 0;
    
    const needs = income * 0.5;
    const wants = income * 0.3;
    const savings = income * 0.2;
    
    document.getElementById('budget-needs').textContent = '₹' + formatCurrency(needs);
    document.getElementById('budget-wants').textContent = '₹' + formatCurrency(wants);
    document.getElementById('budget-savings').textContent = '₹' + formatCurrency(savings);
    
    updateChart('budgetChart', budgetChartObj, ['Needs (50%)', 'Wants (30%)', 'Savings (20%)'], [needs, wants, savings], ['#6366f1', '#f59e0b', '#10b981'], 'budgetChartObj', 'doughnut');
};

document.getElementById('budget-income').addEventListener('input', calculateBudget);


// --- Income Tax Calculator (New Regime FY 24-25) ---
const calculateTax = () => {
    const income = parseFloat(document.getElementById('tax-income').value) || 0;
    const stdDeduction = 75000;
    const taxableIncome = Math.max(0, income - stdDeduction);
    
    let tax = 0;
    
    // New Tax Regime Slabs (FY 2024-25)
    // 0 - 3L: Nil
    // 3L - 7L: 5% (on amount > 3L)
    // 7L - 10L: 10% (on amount > 7L)
    // 10L - 12L: 15% (on amount > 10L)
    // 12L - 15L: 20% (on amount > 12L)
    // > 15L: 30% (on amount > 15L)
    
    // Rebate under 87A: If taxable income <= 7L, tax is NIL (Standard deduction extra)
    // Actually in New Regime, if taxable income <= 7L (after std deduction), tax is NIL.
    
    if (taxableIncome <= 700000) {
        tax = 0;
    } else {
        if (taxableIncome > 1500000) {
            tax += (taxableIncome - 1500000) * 0.30;
            tax += (1500000 - 1200000) * 0.20;
            tax += (1200000 - 1000000) * 0.15;
            tax += (1000000 - 700000) * 0.10;
            tax += (700000 - 300000) * 0.05;
        } else if (taxableIncome > 1200000) {
            tax += (taxableIncome - 1200000) * 0.20;
            tax += (1200000 - 1000000) * 0.15;
            tax += (1000000 - 700000) * 0.10;
            tax += (700000 - 300000) * 0.05;
        } else if (taxableIncome > 1000000) {
            tax += (taxableIncome - 1000000) * 0.15;
            tax += (1000000 - 700000) * 0.10;
            tax += (700000 - 300000) * 0.05;
        } else if (taxableIncome > 700000) {
            tax += (taxableIncome - 700000) * 0.10;
            tax += (700000 - 300000) * 0.05;
        } else if (taxableIncome > 300000) {
            tax += (taxableIncome - 300000) * 0.05;
        }
    }
    
    // Health and Education Cess @ 4%
    const cess = tax * 0.04;
    const totalTax = tax + cess;
    
    const annualInHand = income - totalTax;
    const monthlyInHand = annualInHand / 12;
    
    document.getElementById('tax-payable').textContent = '₹' + formatCurrency(totalTax);
    document.getElementById('tax-taxable').textContent = '₹' + formatCurrency(taxableIncome);
    document.getElementById('tax-inhand').textContent = '₹' + formatCurrency(annualInHand);
    document.getElementById('tax-monthly').textContent = '₹' + formatCurrency(monthlyInHand);
    
    updateChart('taxChart', taxChartObj, ['In-Hand Salary', 'Total Tax'], [annualInHand, totalTax], ['#10b981', '#ef4444'], 'taxChartObj', 'doughnut');
};

syncInputs('tax-income', 'tax-income-range', calculateTax);


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
        input_data = { income: document.getElementById('budget-income').value };
        result_data = { savings: document.getElementById('budget-savings').textContent };
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
                subtext = `Monthly Income: ₹${item.input_data.income}`;
                mainVal = item.result_data.savings;
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
const exportToPDF = async (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) return alert('Export failed: element not found');

    // Save original styles/visibility to restore later
    const origBodyOverflow = document.body.style.overflow;
    const origElementBg = element.style.background;
    const origElementColor = element.style.color;

    // Hide interactive controls but preserve layout (use visibility:hidden)
    const interactiveNodes = Array.from(element.querySelectorAll('button, input, select, textarea'));
    interactiveNodes.forEach(n => n.style.visibility = 'hidden');

    // Replace Chart.js canvases with their base64 images (more reliable than canvas.toDataURL in some browsers)
    const canvasReplacements = [];
    try {
        const chartMappings = [
            { chartObj: window.sipChartObj, canvasId: 'sipChart' },
            { chartObj: window.emiChartObj, canvasId: 'emiChart' },
            { chartObj: window.ciChartObj, canvasId: 'ciChart' },
            { chartObj: window.budgetChartObj, canvasId: 'budgetChart' },
            { chartObj: window.taxChartObj, canvasId: 'taxChart' }
        ];

        chartMappings.forEach(mapping => {
            try {
                if (mapping.chartObj && typeof mapping.chartObj.toBase64Image === 'function') {
                    const canvas = element.querySelector(`#${mapping.canvasId}`);
                    if (!canvas) return;
                    const img = document.createElement('img');
                    img.src = mapping.chartObj.toBase64Image();
                    img.style.width = canvas.style.width || (canvas.width + 'px');
                    img.style.height = canvas.style.height || (canvas.height + 'px');
                    img.className = 'pdf-canvas-replacement';
                    canvas.parentNode.insertBefore(img, canvas.nextSibling);
                    canvas.style.display = 'none';
                    canvasReplacements.push({ canvas, img });
                }
            } catch (e) {
                console.warn('Could not replace chart canvas with base64 image:', e);
            }
        });
    } catch (e) {
        console.warn('Chart replacement routine failed:', e);
    }

    // Force light background and readable text for export
    element.style.background = '#ffffff';
    element.style.color = '#000000';

    // Ensure element is in viewport for html2canvas
    const prevScrollY = window.scrollY;
    element.scrollIntoView({ behavior: 'auto', block: 'start' });

    // Prevent page scroll while exporting
    document.body.style.overflow = 'hidden';

    const options = {
        margin: 10,
        filename: `FinCalc-${elementId}-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().from(element).set(options).save();
    } catch (err) {
        console.error('PDF export error:', err);
        alert('Could not export PDF. Check console for details.');
    } finally {
        // Restore canvases
        canvasReplacements.forEach(({ canvas, img }) => {
            if (img && img.parentNode) img.parentNode.removeChild(img);
            canvas.style.display = '';
        });

        // Restore interactive elements
        interactiveNodes.forEach(n => n.style.visibility = '');

        // Restore styles and scroll
        element.style.background = origElementBg;
        element.style.color = origElementColor;
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
});
