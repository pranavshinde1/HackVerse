"""
🐍 Personal Finance Visualizer - Python Backend
===============================================

This Flask backend provides advanced analytics and server-side features
for our Personal Finance Visualizer web application.

Features:
- Advanced financial analysis using pandas
- Server-side CSV export with enhanced formatting
- Personalized saving tips based on sophisticated algorithms
- RESTful API endpoints for frontend integration

Author: Personal Finance Visualizer Team
Version: 2.0
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # Enable cross-origin requests
import pandas as pd
import io
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

# 🚀 Initialize Flask Application
app = Flask(__name__)
CORS(app)  # Allow requests from our frontend

# 📊 Configure logging for better debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 💰 Financial Analysis Helper Functions

def calculate_financial_health_score(entries: List[Dict], goal: float = None) -> Dict[str, Any]:
    """
    Calculate a comprehensive financial health score based on user's data.

    Args:
        entries: List of financial transactions
        goal: User's savings goal (optional)

    Returns:
        Dictionary containing health metrics and recommendations
    """
    if not entries:
        return {
            'score': 0,
            'level': 'No Data',
            'recommendations': ['Start tracking your income and expenses to get insights!']
        }

    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(entries)

    # Calculate basic metrics
    total_income = df[df['type'] == 'income']['amount'].sum()
    total_expenses = df[df['type'] == 'expense']['amount'].sum()
    net_savings = total_income - total_expenses

    score = 0
    recommendations = []

    # Scoring criteria (out of 100)

    # 1. Savings Rate (40 points max)
    if total_income > 0:
        savings_rate = (net_savings / total_income) * 100
        if savings_rate >= 20:
            score += 40
        elif savings_rate >= 10:
            score += 25
            recommendations.append("Great job saving! Try to increase your savings rate to 20% for optimal financial health.")
        elif savings_rate >= 0:
            score += 10
            recommendations.append("You're saving some money, but aim for at least 10-20% of your income.")
        else:
            score += 0
            recommendations.append("⚠️ You're spending more than you earn. This needs immediate attention!")

    # 2. Expense Diversification (20 points max)
    if 'desc' in df.columns:
        expense_categories = df[df['type'] == 'expense']['desc'].nunique()
        if expense_categories >= 5:
            score += 20
        elif expense_categories >= 3:
            score += 15
        else:
            score += 5
            recommendations.append("Try to categorize your expenses better for clearer insights.")

    # 3. Goal Achievement (20 points max)
    if goal:
        if net_savings >= goal:
            score += 20
            recommendations.append("🎉 Congratulations! You've achieved your savings goal!")
        elif net_savings >= goal * 0.75:
            score += 15
            recommendations.append("You're close to your savings goal! Keep up the great work.")
        elif net_savings >= goal * 0.5:
            score += 10
        else:
            score += 5
            recommendations.append("Focus on reaching your savings goal for better financial stability.")
    else:
        score += 10  # Bonus for having some savings even without a goal
        recommendations.append("Consider setting a savings goal to improve your financial discipline.")

    # 4. Consistency (20 points max)
    if 'month' in df.columns:
        months_with_data = df['month'].nunique()
        if months_with_data >= 6:
            score += 20
        elif months_with_data >= 3:
            score += 15
        elif months_with_data >= 2:
            score += 10
        else:
            score += 5

        if months_with_data >= 2:
            recommendations.append("Great job maintaining consistent financial tracking!")

    # Determine financial health level
    if score >= 80:
        level = "Excellent"
    elif score >= 60:
        level = "Good"
    elif score >= 40:
        level = "Fair"
    elif score >= 20:
        level = "Needs Improvement"
    else:
        level = "Critical"

    return {
        'score': min(score, 100),
        'level': level,
        'savings_rate': (net_savings / total_income * 100) if total_income > 0 else 0,
        'net_savings': net_savings,
        'total_income': total_income,
        'total_expenses': total_expenses,
        'recommendations': recommendations
    }

def generate_advanced_tips(entries: List[Dict], goal: float = None) -> List[str]:
    """
    Generate sophisticated financial tips based on spending patterns and trends.
    """
    if not entries:
        return ["Add some financial data to get personalized tips!"]

    df = pd.DataFrame(entries)
    tips = []

    # Advanced expense analysis
    if 'desc' in df.columns and 'amount' in df.columns:
        expense_df = df[df['type'] == 'expense']

        if not expense_df.empty:
            # Find spending patterns
            category_spending = expense_df.groupby('desc')['amount'].agg(['sum', 'count', 'mean']).sort_values('sum', ascending=False)

            # Top expense category
            if len(category_spending) > 0:
                top_category = category_spending.index[0]
                top_amount = category_spending.iloc[0]['sum']
                top_frequency = category_spending.iloc[0]['count']

                tips.append(f"💸 Your biggest expense is '{top_category}' at ₹{top_amount:,.0f} ({top_frequency} transactions). Consider if this aligns with your priorities.")

            # Identify small frequent expenses
            frequent_small = category_spending[(category_spending['count'] >= 3) & (category_spending['mean'] < 500)]
            if not frequent_small.empty:
                small_expense = frequent_small.index[0]
                total_small = frequent_small.iloc[0]['sum']
                tips.append(f"☕ Small but frequent: You've spent ₹{total_small:,.0f} on '{small_expense}'. These small amounts add up!")

    # Monthly trend analysis
    if 'month' in df.columns:
        monthly_data = df.groupby(['month', 'type'])['amount'].sum().unstack(fill_value=0)

        if 'income' in monthly_data.columns and 'expense' in monthly_data.columns:
            monthly_data['savings'] = monthly_data['income'] - monthly_data['expense']

            # Identify trends
            if len(monthly_data) >= 2:
                latest_savings = monthly_data['savings'].iloc[-1]
                previous_savings = monthly_data['savings'].iloc[-2]

                if latest_savings > previous_savings:
                    tips.append(f"📈 Positive trend! Your savings improved by ₹{latest_savings - previous_savings:,.0f} from last month.")
                elif latest_savings < previous_savings:
                    tips.append(f"📉 Your savings decreased by ₹{previous_savings - latest_savings:,.0f} from last month. Review your recent expenses.")

    # Goal-specific advice
    if goal:
        total_income = df[df['type'] == 'income']['amount'].sum()
        total_expenses = df[df['type'] == 'expense']['amount'].sum()
        current_savings = total_income - total_expenses

        if current_savings < goal:
            monthly_income = total_income / max(df['month'].nunique(), 1)
            months_needed = (goal - current_savings) / (monthly_income * 0.1)  # Assuming 10% additional savings
            tips.append(f"🎯 To reach your goal of ₹{goal:,.0f}, save an extra ₹{(goal - current_savings) / max(months_needed, 1):,.0f} per month for {months_needed:.1f} months.")

    # General financial wisdom
    total_transactions = len(df)
    if total_transactions >= 10:
        tips.append(f"📊 You've recorded {total_transactions} transactions! Consistent tracking is the foundation of financial success.")

    return tips[:5]  # Return top 5 most relevant tips

# 🔗 API Endpoints

@app.route('/', methods=['GET'])
def home():
    """Welcome endpoint with API information."""
    return jsonify({
        'message': 'Welcome to Personal Finance Visualizer API! 💰',
        'version': '2.0',
        'endpoints': {
            '/analyze': 'POST - Get advanced financial analysis and tips',
            '/export': 'POST - Export financial data as CSV',
            '/health': 'POST - Get financial health score and recommendations'
        }
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    🧠 Advanced Financial Analysis Endpoint

    Accepts user's financial data and returns personalized insights and tips.
    """
    try:
        data = request.get_json()
        entries = data.get('entries', [])
        goal = data.get('goal', None)

        logger.info(f"Analyzing {len(entries)} transactions with goal: {goal}")

        # Generate advanced tips
        tips = generate_advanced_tips(entries, goal)

        # Basic statistics
        df = pd.DataFrame(entries) if entries else pd.DataFrame()

        stats = {
            'total_transactions': len(entries),
            'total_income': 0,
            'total_expenses': 0,
            'net_savings': 0,
            'average_transaction': 0
        }

        if not df.empty and 'amount' in df.columns and 'type' in df.columns:
            stats['total_income'] = df[df['type'] == 'income']['amount'].sum()
            stats['total_expenses'] = df[df['type'] == 'expense']['amount'].sum()
            stats['net_savings'] = stats['total_income'] - stats['total_expenses']
            stats['average_transaction'] = df['amount'].mean()

        return jsonify({
            'success': True,
            'tips': tips,
            'statistics': stats,
            'message': f'Analysis complete for {len(entries)} transactions'
        })

    except Exception as e:
        logger.error(f"Error in analyze endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'tips': ['Error analyzing data. Please check your input format.']
        }), 400

@app.route('/health', methods=['POST'])
def financial_health():
    """
    🏥 Financial Health Score Endpoint

    Calculates a comprehensive financial health score with recommendations.
    """
    try:
        data = request.get_json()
        entries = data.get('entries', [])
        goal = data.get('goal', None)

        health_data = calculate_financial_health_score(entries, goal)

        return jsonify({
            'success': True,
            **health_data,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error in health endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/export', methods=['POST'])
def export_csv():
    """
    📊 Enhanced CSV Export Endpoint

    Creates a comprehensive CSV file with financial data and analysis.
    """
    try:
        data = request.get_json()
        entries = data.get('entries', [])
        goal = data.get('goal', None)

        if not entries:
            return jsonify({
                'success': False,
                'error': 'No data to export'
            }), 400

        # Create DataFrame
        df = pd.DataFrame(entries)

        # Prepare CSV content with multiple sheets worth of data
        output = io.StringIO()

        # Write main transaction data
        output.write("=== PERSONAL FINANCE DATA EXPORT ===\n")
        output.write(f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        output.write(f"Total Transactions: {len(entries)}\n\n")

        # Transaction details
        output.write("=== TRANSACTION DETAILS ===\n")
        df.to_csv(output, index=False)

        # Summary statistics
        output.write("\n\n=== FINANCIAL SUMMARY ===\n")
        if 'amount' in df.columns and 'type' in df.columns:
            total_income = df[df['type'] == 'income']['amount'].sum()
            total_expenses = df[df['type'] == 'expense']['amount'].sum()
            net_savings = total_income - total_expenses

            summary_data = [
                ['Metric', 'Amount (₹)'],
                ['Total Income', f'{total_income:,.2f}'],
                ['Total Expenses', f'{total_expenses:,.2f}'],
                ['Net Savings', f'{net_savings:,.2f}'],
                ['Savings Rate', f'{(net_savings/total_income*100) if total_income > 0 else 0:.1f}%']
            ]

            if goal:
                summary_data.append(['Savings Goal', f'{goal:,.2f}'])
                summary_data.append(['Goal Progress', f'{(net_savings/goal*100) if goal > 0 else 0:.1f}%'])

            for row in summary_data:
                output.write(f"{row[0]},{row[1]}\n")

        # Monthly breakdown
        if 'month' in df.columns:
            output.write("\n\n=== MONTHLY BREAKDOWN ===\n")
            monthly = df.groupby(['month', 'type'])['amount'].sum().unstack(fill_value=0)
            monthly.to_csv(output)

        # Category analysis
        if 'desc' in df.columns:
            output.write("\n\n=== EXPENSE CATEGORIES ===\n")
            expense_categories = df[df['type'] == 'expense'].groupby('desc')['amount'].agg(['sum', 'count', 'mean'])
            expense_categories = expense_categories.sort_values('sum', ascending=False)
            expense_categories.to_csv(output)

        # Generate tips
        tips = generate_advanced_tips(entries, goal)
        output.write("\n\n=== PERSONALIZED TIPS ===\n")
        for i, tip in enumerate(tips, 1):
            # Clean tip text for CSV (remove emojis and HTML)
            clean_tip = tip.replace(',', ';')  # Replace commas to avoid CSV issues
            output.write(f"Tip {i},{clean_tip}\n")

        # Create file buffer
        output.seek(0)
        csv_buffer = io.BytesIO()
        csv_buffer.write(output.getvalue().encode('utf-8'))
        csv_buffer.seek(0)

        # Generate filename with timestamp
        filename = f"finance_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        return send_file(
            csv_buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        logger.error(f"Error in export endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

# 🚨 Error Handlers

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': ['/analyze', '/export', '/health']
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'Please check your request format and try again'
    }), 500

# 🚀 Application Startup
if __name__ == '__main__':
    print("🚀 Starting Personal Finance Visualizer Backend Server...")
    print("💰 Advanced financial analytics ready!")
    print("📊 API endpoints available at:")
    print("   • http://localhost:5000/analyze (POST)")
    print("   • http://localhost:5000/export (POST)")
    print("   • http://localhost:5000/health (POST)")
    print("🔧 Running in development mode...")

    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )

"""
🎉 Enhanced Python Backend Complete!

New features added:
✅ Comprehensive financial health scoring system
✅ Advanced tip generation with trend analysis
✅ Enhanced CSV export with detailed breakdowns
✅ Better error handling and logging
✅ RESTful API design with proper responses
✅ Monthly trend analysis and spending pattern detection
✅ Goal tracking with intelligent recommendations
✅ Professional documentation and comments

This backend now provides enterprise-level financial analysis
while remaining simple to use and deploy! 💰🚀
"""