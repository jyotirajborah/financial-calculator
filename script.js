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
                login(data.user, data.token);
            } else {
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
