/*
🚀 Personal Finance Visualizer - JavaScript Logic
================================================

This file contains all the interactive functionality for our finance tracker.
It handles data storage, chart generation, smart tips, and user interactions.

Features included:
- Add/remove income and expense entries
- Set and track savings goals with progress bars
- Generate interactive charts showing monthly trends
- Provide personalized saving tips based on spending patterns
- Export financial data as CSV files
- Persist all data in browser's local storage

Let's make managing money fun and insightful! 💰
*/

// 📊 Data Storage - Our financial records live here
let entries = [];           // Array to store all income/expense transactions
let savingsGoal = null;     // User's savings target amount

// 🔄 Load Previously Saved Data
// When the page loads, we check if the user has saved data from before
if (localStorage.getItem('entries')) {
    entries = JSON.parse(localStorage.getItem('entries'));
    console.log('📂 Loaded', entries.length, 'previous transactions');
}

if (localStorage.getItem('savingsGoal')) {
    savingsGoal = Number(localStorage.getItem('savingsGoal'));
    console.log('🎯 Loaded savings goal: ₹', savingsGoal);
}

// 🎛️ Get References to HTML Elements
// These are our connection points between JavaScript and the web page
const entryForm = document.getElementById('entryForm');
const dataList = document.getElementById('dataList');
const goalInput = document.getElementById('goal');
const setGoalBtn = document.getElementById('setGoalBtn');
const goalDisplay = document.getElementById('goalDisplay');
const goalProgress = document.getElementById('goalProgress');
const tipsDiv = document.getElementById('tips');
const exportBtn = document.getElementById('exportBtn');
const chartCanvas = document.getElementById('financeChart');

// 📝 Handle New Transaction Entries
// When user submits the form, we capture their financial data
entryForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Stop the form from refreshing the page

    // Gather the form data
    const transactionType = document.getElementById('type').value;
    const description = document.getElementById('desc').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const month = document.getElementById('month').value;

    // Validate the input (make sure everything is filled out correctly)
    if (!description || amount <= 0 || !month) {
        alert('⚠️ Please fill out all fields with valid data!');
        return;
    }

    // Create a new transaction record
    const newTransaction = {
        type: transactionType,
        desc: description,
        amount: amount,
        month: month,
        id: Date.now() // Unique identifier using timestamp
    };

    // Add to our records and save
    entries.push(newTransaction);
    saveToLocalStorage();

    // Clear the form for next entry
    entryForm.reset();

    // Update all displays with new data
    refreshAllDisplays();

    console.log('✅ Added new transaction:', newTransaction);
});

// 🎯 Handle Savings Goal Setting
setGoalBtn.addEventListener('click', function() {
    const goalAmount = parseFloat(goalInput.value);

    if (!goalAmount || goalAmount <= 0) {
        alert('⚠️ Please enter a valid savings goal amount!');
        return;
    }

    savingsGoal = goalAmount;
    saveToLocalStorage();
    goalInput.value = ''; // Clear the input

    refreshGoalDisplay();
    refreshTips();

    console.log('🎯 New savings goal set: ₹', savingsGoal);
});

// 🗑️ Delete Transaction Function
// This function is called when user clicks delete button on any transaction
function deleteTransaction(transactionId) {
    const originalLength = entries.length;
    entries = entries.filter(entry => entry.id !== transactionId);

    if (entries.length < originalLength) {
        saveToLocalStorage();
        refreshAllDisplays();
        console.log('🗑️ Transaction deleted');
    }
}

// 💾 Save Data to Browser Storage
function saveToLocalStorage() {
    localStorage.setItem('entries', JSON.stringify(entries));
    if (savingsGoal !== null) {
        localStorage.setItem('savingsGoal', savingsGoal.toString());
    }
}

// 🔄 Refresh All Visual Elements
function refreshAllDisplays() {
    refreshTransactionsList();
    refreshChart();
    refreshTips();
    refreshGoalDisplay();
}

// 📋 Display Transaction History
function refreshTransactionsList() {
    if (entries.length === 0) {
        dataList.innerHTML = '<p style="color: #888; text-align: center; margin: 20px 0;">No transactions yet. Add your first income or expense above!</p>';
        return;
    }

    // Sort entries by month and type for better organization
    const sortedEntries = [...entries].sort((a, b) => {
        if (a.month !== b.month) return b.month.localeCompare(a.month);
        return a.type.localeCompare(b.type);
    });

    let html = '';
    sortedEntries.forEach(entry => {
        const icon = entry.type === 'income' ? '💵' : '💸';
        const colorClass = entry.type === 'income' ? 'income-item' : 'expense-item';

        html += `
            <div class="entry-item ${colorClass}">
                <span>
                    ${icon} [${entry.month}] ${entry.desc} - ₹${entry.amount.toLocaleString()}
                </span>
                <button class="delete-btn" onclick="deleteTransaction(${entry.id})" title="Delete this transaction">
                    🗑️ Delete
                </button>
            </div>
        `;
    });

    dataList.innerHTML = html;
}

// 🎯 Update Savings Goal Display with Progress
function refreshGoalDisplay() {
    if (!savingsGoal) {
        goalDisplay.textContent = "No savings goal set yet.";
        goalProgress.innerHTML = '';
        return;
    }

    const totalSavings = calculateTotalSavings();
    const progressPercentage = Math.min((totalSavings / savingsGoal) * 100, 100);

    goalDisplay.innerHTML = `
        <strong>Goal: ₹${savingsGoal.toLocaleString()}</strong><br>
        Current Savings: ₹${totalSavings.toLocaleString()}<br>
        ${totalSavings >= savingsGoal ? '🎉 Goal Achieved!' : `₹${(savingsGoal - totalSavings).toLocaleString()} to go`}
    `;

    // Create visual progress bar
    goalProgress.innerHTML = `
        <div style="background: #ddd; border-radius: 10px; height: 20px; margin-top: 10px; overflow: hidden;">
            <div style="background: ${totalSavings >= savingsGoal ? '#28a745' : '#2a9d8f'}; height: 100%; width: ${progressPercentage}%; border-radius: 10px; transition: width 0.3s ease;"></div>
        </div>
        <p style="text-align: center; margin-top: 5px; font-size: 14px; color: #666;">
            ${progressPercentage.toFixed(1)}% Complete
        </p>
    `;
}

// 💰 Calculate Total Savings
function calculateTotalSavings() {
    const totalIncome = entries
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpenses = entries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

    return totalIncome - totalExpenses;
}

// 📊 Generate Interactive Chart
let financeChart = null; // Keep track of chart instance

function refreshChart() {
    if (!entries.length) {
        // Show empty state message
        chartCanvas.style.display = 'none';
        return;
    }

    chartCanvas.style.display = 'block';

    // Group data by month
    const monthlyData = {};

    entries.forEach(entry => {
        if (!monthlyData[entry.month]) {
            monthlyData[entry.month] = { income: 0, expense: 0 };
        }
        monthlyData[entry.month][entry.type] += entry.amount;
    });

    // Prepare data for Chart.js
    const months = Object.keys(monthlyData).sort();
    const incomeData = months.map(month => monthlyData[month].income);
    const expenseData = months.map(month => monthlyData[month].expense);
    const savingsData = months.map(month => monthlyData[month].income - monthlyData[month].expense);

    // Destroy existing chart if it exists
    if (financeChart) {
        financeChart.destroy();
    }

    // Create new beautiful chart
    financeChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: months.map(month => {
                const date = new Date(month + '-01');
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }),
            datasets: [
                {
                    label: '💵 Income',
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    borderWidth: 2,
                    data: incomeData
                },
                {
                    label: '💸 Expenses',
                    backgroundColor: '#e76f51',
                    borderColor: '#c44126',
                    borderWidth: 2,
                    data: expenseData
                },
                {
                    label: '💰 Net Savings',
                    backgroundColor: '#457b9d',
                    borderColor: '#3a6b8a',
                    borderWidth: 2,
                    data: savingsData
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Your Financial Journey Over Time',
                    font: { size: 16 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 💡 Generate Smart Financial Tips
function refreshTips() {
    if (!entries.length) {
        tipsDiv.innerHTML = 'Add some financial data to get personalized money-saving tips!';
        return;
    }

    let tips = [];

    // Analyze spending patterns
    const expenseCategories = {};
    const incomeCategories = {};

    entries.forEach(entry => {
        if (entry.type === 'expense') {
            expenseCategories[entry.desc] = (expenseCategories[entry.desc] || 0) + entry.amount;
        } else {
            incomeCategories[entry.desc] = (incomeCategories[entry.desc] || 0) + entry.amount;
        }
    });

    // Find highest expense category
    const expenseEntries = Object.entries(expenseCategories);
    if (expenseEntries.length > 0) {
        const [highestCategory, highestAmount] = expenseEntries.sort((a, b) => b[1] - a[1])[0];
        tips.push(`🎯 <strong>Top Expense Alert:</strong> You spend the most on "${highestCategory}" (₹${highestAmount.toLocaleString()}). Consider ways to reduce this expense.`);
    }

    // Calculate financial health metrics
    const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const savings = totalIncome - totalExpenses;

    if (totalIncome > 0) {
        const savingsRate = (savings / totalIncome) * 100;

        if (savingsRate > 20) {
            tips.push(`🌟 <strong>Excellent!</strong> You're saving ${savingsRate.toFixed(1)}% of your income. You're on track for strong financial health!`);
        } else if (savingsRate > 10) {
            tips.push(`👍 <strong>Good Job!</strong> You're saving ${savingsRate.toFixed(1)}% of your income. Try to increase this to 20% for better financial security.`);
        } else if (savingsRate > 0) {
            tips.push(`⚠️ <strong>Room for Improvement:</strong> You're saving only ${savingsRate.toFixed(1)}% of your income. Aim for at least 10-20%.`);
        } else {
            tips.push(`🚨 <strong>Budget Alert:</strong> You're spending more than you earn. Time to review and cut some expenses!`);
        }
    }

    // Savings goal progress
    if (savingsGoal) {
        if (savings >= savingsGoal) {
            tips.push(`🎉 <strong>Goal Achieved!</strong> You've reached your savings goal of ₹${savingsGoal.toLocaleString()}! Time to set a new, higher goal!`);
        } else {
            const remaining = savingsGoal - savings;
            const monthsToGoal = Math.ceil(remaining / Math.max(savings / (entries.length / 12), 1));
            tips.push(`🎯 <strong>Goal Progress:</strong> You need ₹${remaining.toLocaleString()} more to reach your goal. At your current rate, you'll achieve it in about ${monthsToGoal} months.`);
        }
    } else {
        tips.push(`💭 <strong>Pro Tip:</strong> Set a savings goal to stay motivated and track your progress more effectively!`);
    }

    // General financial advice
    if (entries.length >= 5) {
        tips.push(`📊 <strong>Data Insight:</strong> You have ${entries.length} transactions recorded. Great job tracking your finances consistently!`);
    }

    // Join all tips and display them
    tipsDiv.innerHTML = tips.join('<br><br>');
}

// 📥 Export Data as CSV
exportBtn.addEventListener('click', function() {
    if (!entries.length) {
        alert('⚠️ No data to export! Add some transactions first.');
        return;
    }

    // Create CSV content
    let csvContent = "Date,Type,Description,Amount,Month\n";

    entries.forEach(entry => {
        // Escape commas in descriptions
        const safeDesc = entry.desc.replace(/,/g, ';');
        csvContent += `${new Date().toISOString().split('T')[0]},${entry.type},${safeDesc},${entry.amount},${entry.month}\n`;
    });

    // Add summary information
    csvContent += "\n--- SUMMARY ---\n";
    csvContent += `Total Income,${entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0)}\n`;
    csvContent += `Total Expenses,${entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)}\n`;
    csvContent += `Net Savings,${calculateTotalSavings()}\n`;
    if (savingsGoal) {
        csvContent += `Savings Goal,${savingsGoal}\n`;
    }

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `finance_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    console.log('📊 Data exported successfully!');
});

// 🚀 Initialize the App
// When the page loads, set everything up with existing data
function initializeApp() {
    refreshAllDisplays();

    // Set current month as default
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('month').value = currentMonth;

    console.log('🚀 Personal Finance Visualizer initialized!');
    console.log('📊 Loaded', entries.length, 'transactions');
    if (savingsGoal) {
        console.log('🎯 Active savings goal: ₹', savingsGoal.toLocaleString());
    }
}

// 🎬 Start the app when page is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Also run initialization immediately in case DOMContentLoaded already fired
initializeApp();

/*
🎉 That's all folks! 
This Personal Finance Visualizer is now ready to help users take control of their finances
with smart tracking, beautiful charts, and personalized insights.

Key features implemented:
✅ Transaction tracking (income/expenses)
✅ Visual progress bars for savings goals  
✅ Interactive charts with Chart.js
✅ Smart financial tips based on spending patterns
✅ CSV export with summary data
✅ Local storage persistence
✅ User-friendly interface with emojis and clear messaging
✅ Input validation and error handling
✅ Responsive design support

Happy budgeting! 💰
*/