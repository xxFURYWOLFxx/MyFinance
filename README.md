# MyFinance

A self-hosted personal finance tracker. Track income, expenses, budgets, savings, investments, debts, and more -- all from a single dashboard. Runs on your own machine, your data stays with you.

Built with FastAPI (Python) on the backend and React + TypeScript on the frontend.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # edit as needed (SMTP settings for email verification)
python init_db.py            # creates the SQLite database
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The frontend proxies `/api` requests to the backend at `localhost:8000` automatically (configured in `vite.config.ts`).

### Windows Shortcut

There are batch files in the root if you're on Windows:

```bash
run.bat              # starts both backend and frontend
run-backend.bat      # backend only
run-frontend.bat     # frontend only
```

### First Login

The first user to register automatically gets admin privileges and skips email verification. Every user after that needs to verify their email before they can log in -- they'll get a verification link sent to their inbox.

Additional admin accounts can only be created from the local machine (see [Admin Creation](#admin-creation) below).

---

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, SQLite (swappable to PostgreSQL/MySQL), Pydantic, JWT auth, bcrypt

**Frontend:** React 19, TypeScript, Vite, TailwindCSS, Zustand, React Query, Recharts, React Hook Form, Zod

---

## Project Structure

```
Finance/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers (one file per resource)
│   │   ├── core/            # Config, security, JWT logic
│   │   ├── db/              # Database session + base model
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic layer
│   │   └── main.py          # App entry point, CORS, router mount
│   ├── requirements.txt
│   ├── init_db.py           # Database table creation script
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI (buttons, cards, modals, layout)
│   │   ├── pages/           # One component per route
│   │   ├── services/        # API client functions (axios-based)
│   │   ├── stores/          # Zustand state (auth, theme, toast)
│   │   ├── types/           # Shared TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── run.bat                  # Start everything (Windows)
├── run-backend.bat
└── run-frontend.bat
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./finance.db` | Database connection string. Supports SQLite, PostgreSQL, MySQL |
| `SECRET_KEY` | auto-generated | JWT signing key. Set a fixed value in production |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | How long access tokens last |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | How long refresh tokens last |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Allowed frontend origins (JSON array) |
| `APP_NAME` | `MyFinance` | Application name |
| `DEBUG` | `false` | Debug mode |
| `SMTP_HOST` | *(none)* | SMTP server hostname (e.g. `smtp.resend.com`, `smtp.gmail.com`) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | *(none)* | SMTP username |
| `SMTP_PASSWORD` | *(none)* | SMTP password or API key |
| `SMTP_FROM_EMAIL` | *(none)* | Sender email address (e.g. `noreply@yourdomain.com`) |
| `SMTP_USE_TLS` | `true` | Use STARTTLS |
| `FRONTEND_URL` | `http://localhost:5173` | Used in email links (password reset, verification) |

**Email setup:** SMTP is needed for email verification and password resets. If SMTP isn't configured, emails are printed to the server console instead (useful during development). Works with any SMTP provider -- Resend, Gmail App Passwords, SendGrid, Mailgun, etc.

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL. Default uses Vite's dev proxy |
| `VITE_APP_NAME` | `MyFinance` | Shown in the UI header |

---

## Features

- **Dashboard** -- Overview cards for income, expenses, savings, net worth. Expense breakdown chart, recent transactions.
- **Income tracking** -- Log income by source, category, date, payment method. Summary views.
- **Expense tracking** -- Categorized expenses with filters and date ranges.
- **Budgets** -- Weekly/monthly/yearly budgets per category. Spending tracked against limits with configurable alert thresholds.
- **Savings accounts** -- Multiple accounts with deposits, withdrawals, transfers, and interest tracking. Computed balances.
- **Investment tracking** -- Stocks, ETFs, and crypto. Real-time prices from Yahoo Finance and CoinGecko. Candlestick and area charts with zoom/pan.
- **Financial goals** -- Set targets with deadlines. Track contributions and progress percentage.
- **Debt management** -- Track debts with interest rates, minimum payments, and payment history.
- **Recurring transactions** -- Schedule repeating income or expenses on any frequency (daily through yearly).
- **Business/side income** -- Separate tracker for freelance work and invoices with client and payment status tracking.
- **Forecasting** -- 12-month balance projections based on your actual income and spending patterns.
- **Reports** -- Income vs expenses, category breakdowns, monthly trends, budget performance.
- **Notifications** -- Budget alerts, goal milestones, bill reminders, spending insights. Mix of stored and real-time computed.
- **Global search** -- Search across all your data from the header bar.
- **Data export** -- Export everything as JSON or CSV.
- **Archive** -- Archive old transactions without deleting them.
- **Admin panel** -- User management, system settings, activity logs, system analytics.
- **Dark mode** -- Light and dark theme toggle.
- **Multi-currency** -- Configurable default currency per user.
- **View as user** -- Admins can view the app as any user to troubleshoot (with a clear banner and exit button).

---

## API Reference

Base URL: `http://localhost:8000/api`

Interactive docs (auto-generated from the code):
- **Swagger UI:** `http://localhost:8000/api/docs`
- **ReDoc:** `http://localhost:8000/api/redoc`

All endpoints except auth routes require a Bearer token in the `Authorization` header.

---

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new account |
| POST | `/auth/login` | Log in, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh an expired access token |
| POST | `/auth/logout` | Log out |
| GET | `/auth/me` | Get your profile |
| PUT | `/auth/me` | Update your profile |
| DELETE | `/auth/me` | Delete your account |
| PUT | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Request a password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/verify-email` | Verify email with token from verification email |
| POST | `/auth/resend-verification` | Resend the verification email |
| POST | `/auth/create-admin` | Create admin account (localhost only) |
| GET | `/auth/localhost-check` | Check if request comes from localhost |

**Register:**
```json
{
  "email": "you@example.com",
  "password": "yourpassword",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Login** uses OAuth2 form encoding (`username` + `password` fields, not JSON body).

**Login response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/summary` | Income, expenses, savings, net worth, goal progress |
| GET | `/dashboard/expenses-by-category` | Expense breakdown by category |
| GET | `/dashboard/recent-transactions` | Latest transactions |

Query params for recent transactions: `limit` (default 10)

**Summary response:**
```json
{
  "total_income": 5000.00,
  "income_change": 12.5,
  "total_expenses": 3200.00,
  "expense_change": -5.0,
  "total_savings": 8500.00,
  "net_worth": 25000.00,
  "goals_progress": 65.0,
  "active_goals": 3
}
```

---

### Income

| Method | Endpoint | Description |
|---|---|---|
| GET | `/income` | List income entries |
| GET | `/income/summary` | Totals grouped by category |
| GET | `/income/{id}` | Get one |
| POST | `/income` | Create |
| PUT | `/income/{id}` | Update |
| DELETE | `/income/{id}` | Delete |

Query params: `skip`, `limit`, `category`, `start_date`, `end_date`

```json
{
  "source": "Freelance Project",
  "category": "Freelance",
  "amount": 1500.00,
  "date": "2025-01-15",
  "currency": "USD",
  "payment_method": "bank_transfer",
  "notes": "Website redesign"
}
```

---

### Expenses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/expenses` | List expenses |
| GET | `/expenses/summary` | Totals grouped by category |
| GET | `/expenses/{id}` | Get one |
| POST | `/expenses` | Create |
| PUT | `/expenses/{id}` | Update |
| DELETE | `/expenses/{id}` | Delete |

Query params: `skip`, `limit`, `category`, `start_date`, `end_date`

```json
{
  "description": "Grocery shopping",
  "category": "Food",
  "amount": 85.50,
  "date": "2025-01-20",
  "currency": "USD",
  "payment_method": "credit_card",
  "notes": "Weekly groceries"
}
```

---

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/budgets` | List budgets |
| GET | `/budgets/{id}` | Get one (includes computed `spent` field) |
| POST | `/budgets` | Create |
| PUT | `/budgets/{id}` | Update |
| DELETE | `/budgets/{id}` | Delete |

Query params: `include_inactive`

```json
{
  "name": "Monthly Groceries",
  "category": "Food",
  "amount": 500.00,
  "period": "monthly",
  "start_date": "2025-01-01",
  "alert_threshold": 80,
  "rollover_enabled": false
}
```

Period options: `weekly`, `monthly`, `yearly`

The response includes a `spent` field that's calculated from actual expenses matching the budget's category and current period. You don't set it manually.

---

### Goals

| Method | Endpoint | Description |
|---|---|---|
| GET | `/goals` | List goals |
| GET | `/goals/{id}` | Get one |
| POST | `/goals` | Create |
| PUT | `/goals/{id}` | Update |
| DELETE | `/goals/{id}` | Delete |
| GET | `/goals/{id}/contributions` | List contributions |
| POST | `/goals/{id}/contributions` | Add a contribution |

Query params: `status` (active, completed, paused, cancelled)

**Create goal:**
```json
{
  "name": "Emergency Fund",
  "target_amount": 10000.00,
  "target_date": "2025-12-31",
  "category": "Savings",
  "priority": 1,
  "description": "6 months of expenses"
}
```

**Add contribution:**
```json
{
  "amount": 250.00,
  "date": "2025-01-15",
  "notes": "Monthly contribution"
}
```

Goals can optionally be linked to a savings account via `linked_account_id`.

---

### Savings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/savings/accounts` | List accounts |
| GET | `/savings/accounts/{id}` | Get one (includes computed balance) |
| POST | `/savings/accounts` | Create |
| PUT | `/savings/accounts/{id}` | Update |
| DELETE | `/savings/accounts/{id}` | Delete |
| GET | `/savings/transactions` | List transactions |
| POST | `/savings/transactions` | Create transaction |
| DELETE | `/savings/transactions/{id}` | Delete transaction |

Query params for transactions: `account_id`, `skip`, `limit`

**Create account:**
```json
{
  "name": "High Yield Savings",
  "account_type": "savings",
  "institution": "Ally Bank",
  "initial_balance": 1000.00,
  "currency": "USD"
}
```

**Create transaction:**
```json
{
  "account_id": 1,
  "transaction_type": "deposit",
  "amount": 500.00,
  "date": "2025-01-15",
  "description": "Monthly deposit"
}
```

Transaction types: `deposit`, `withdrawal`, `transfer`, `interest`

The account balance is computed from `initial_balance` + all deposits/interest - all withdrawals. It's not a stored field.

---

### Investments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/investments/holdings` | List holdings |
| GET | `/investments/holdings/{id}` | Get one |
| POST | `/investments/holdings` | Create |
| PUT | `/investments/holdings/{id}` | Update |
| DELETE | `/investments/holdings/{id}` | Delete |
| GET | `/investments/transactions` | List investment transactions |
| POST | `/investments/transactions` | Create transaction |
| DELETE | `/investments/transactions/{id}` | Delete transaction |
| GET | `/investments/favorites` | Watched assets list |
| POST | `/investments/favorites` | Add to watchlist |
| DELETE | `/investments/favorites/{id}` | Remove from watchlist |
| GET | `/investments/chart/{symbol}` | Price chart data (candlestick/area) |
| GET | `/investments/price/{symbol}` | Current price |

Query params for holdings: `include_inactive`, `asset_type`

**Create holding:**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "asset_type": "stock",
  "quantity": 10,
  "average_cost": 175.50
}
```

Transaction types: `buy`, `sell`, `dividend`, `split`, `transfer`

Price data comes from Yahoo Finance (stocks/ETFs) and CoinGecko (crypto, 60+ coins). Chart data is cached for 5 minutes.

---

### Debts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/debts` | List debts |
| GET | `/debts/summary` | Overview stats |
| GET | `/debts/{id}` | Get one |
| POST | `/debts` | Create |
| PUT | `/debts/{id}` | Update |
| DELETE | `/debts/{id}` | Delete |
| GET | `/debts/{id}/payments` | Payment history |
| POST | `/debts/{id}/payments` | Record a payment |

Query params: `include_inactive`

**Create debt:**
```json
{
  "name": "Student Loan",
  "debt_type": "student_loan",
  "creditor": "Federal Aid",
  "original_amount": 25000.00,
  "current_balance": 18000.00,
  "interest_rate": 4.5,
  "minimum_payment": 250.00,
  "due_day": 15
}
```

**Record payment:**
```json
{
  "amount": 300.00,
  "principal_amount": 250.00,
  "interest_amount": 50.00,
  "date": "2025-01-15",
  "notes": "Extra payment"
}
```

---

### Recurring Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/recurring` | List recurring items |
| GET | `/recurring/summary` | Estimated monthly totals |
| GET | `/recurring/{id}` | Get one |
| POST | `/recurring` | Create |
| PUT | `/recurring/{id}` | Update |
| DELETE | `/recurring/{id}` | Delete |

Query params: `transaction_type`, `include_inactive`

```json
{
  "name": "Netflix",
  "transaction_type": "expense",
  "category": "Entertainment",
  "amount": 15.99,
  "frequency": "monthly",
  "start_date": "2025-01-01",
  "auto_post": true,
  "reminder_days_before": 3
}
```

Frequency options: `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`

---

### Forecasting

| Method | Endpoint | Description |
|---|---|---|
| GET | `/forecasting/summary` | Financial snapshot with savings rate and goal timeline |
| GET | `/forecasting/projection` | Month-by-month balance projection |

Query params for projection: `months` (default 12)

**Summary:**
```json
{
  "current_balance": 15000.00,
  "projected_balance": 22000.00,
  "monthly_income": 5000.00,
  "monthly_expenses": 3200.00,
  "monthly_savings": 1800.00,
  "savings_rate": 36.0,
  "time_to_goal": 8,
  "goal_target": 30000.00
}
```

**Projection (array):**
```json
[
  {
    "month": "February",
    "year": 2025,
    "balance": 16800.00,
    "projected_income": 5000.00,
    "projected_expenses": 3200.00
  }
]
```

---

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/income-vs-expenses` | Side-by-side comparison |
| GET | `/reports/category-breakdown` | Spending by category |
| GET | `/reports/monthly-trend` | Month-over-month trends |
| GET | `/reports/budget-performance` | Budget tracking results |

---

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | List notifications |
| GET | `/notifications/unread-count` | Unread count |
| PUT | `/notifications/{id}/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/{id}` | Dismiss |

Query params: `limit` (default 20, max 100), `unread_only`

Notifications are a mix of persisted (stored in DB) and dynamic (computed every time you fetch). The dynamic ones include:

- Budget alerts when you've used 90%+ of a budget
- Goal milestones when you hit 90%+ progress
- Bill reminders for recurring transactions due within 3 days
- Warning when your expenses exceed your income this month
- Insight about your top spending category (if it's 40%+ of total)
- Savings balance summary
- Nudges to create budgets or goals if you haven't yet
- Welcome message for new users (first 30 days)

---

### Search

| Method | Endpoint | Description |
|---|---|---|
| GET | `/search?q=...` | Search across everything |

Query params: `q` (required), `limit` (default 10, max 50)

Searches income, expenses, goals, budgets, investments, debts, and recurring transactions. Results sorted by relevance.

---

### Export

| Method | Endpoint | Description |
|---|---|---|
| GET | `/export?format=json` | All your data as JSON |
| GET | `/export?format=csv` | All your data as a CSV download |

Covers: income, expenses, budgets, goals, investments, debts, recurring transactions, savings accounts, savings transactions, business income.

---

### Admin

Requires admin role.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | System-wide statistics |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/{id}` | User details |
| PUT | `/admin/users/{id}` | Edit user (role, status, etc.) |
| DELETE | `/admin/users/{id}` | Delete user |
| GET | `/admin/settings` | System settings |
| PUT | `/admin/settings` | Update system settings |
| GET | `/admin/activity` | Activity log |
| GET | `/admin/alerts` | System alerts |

Query params for users: `skip`, `limit`, `search`, `status`

---

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns `{"status": "healthy"}` |
| POST | `/archive` | Archive transactions |

---

## Admin Creation

There's a page at `/create-admin` for creating administrator accounts. It **only works when accessed from localhost** (127.0.0.1 or ::1).

The backend checks the actual TCP socket source IP, not headers like `X-Forwarded-For`. This means it can't be spoofed from a remote machine. Even if someone finds the endpoint, they'll get a 403 from any non-local IP.

**If you're behind a reverse proxy** (Nginx, Caddy, etc.), all requests look like they come from the proxy's IP. You'd need to adjust the `_is_localhost()` function in `backend/app/api/v1/auth.py` for that setup.

---

## Security

- Passwords hashed with bcrypt
- JWTs signed with HS256, include expiration claims
- Email verification required on registration (verification link sent via SMTP, expires in 30 minutes)
- Optional IP binding ties tokens to the IP that created them (configurable in admin settings)
- First registered user auto-promoted to admin (skips verification)
- Admin creation locked to localhost at the TCP level (skips verification)
- CORS restricted to configured origins only
- Short-lived access tokens (30 min) paired with longer-lived refresh tokens (7 days)
- Password reset tokens are single-use and expire in 30 minutes

**For production, make sure you:**
1. Set a fixed `SECRET_KEY` (the auto-generated one changes on restart, which invalidates all tokens)
2. Switch to PostgreSQL
3. Set `CORS_ORIGINS` to your actual domain
4. Put it behind HTTPS

---

## Database

SQLite by default -- zero config, single file. Good enough for personal use.

To switch to PostgreSQL, just change the connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/finance
```

`psycopg2-binary` is already in requirements.txt.

Tables are created by `python init_db.py`. Uses SQLAlchemy, so switching databases is just a connection string change.

---

## Development

**Backend** (hot reload on file changes):
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (HMR via Vite):
```bash
cd frontend
npm run dev
```

Vite runs on port 5173 and proxies `/api` to `localhost:8000`.

**Production build:**
```bash
cd frontend
npm run build    # outputs to dist/
```

Serve `dist/` with any static file server. Point your API URL at the backend.

---

## Troubleshooting

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :8000
kill -9 <pid>
```

**Database issues:**
```bash
cd backend
# Just delete the file and recreate
del finance.db          # Windows
rm finance.db           # Linux/Mac
python init_db.py
```

**Module not found:**
```bash
# Backend -- make sure venv is activated
pip install -r requirements.txt

# Frontend
npm install
```

---

## About

This project was built as a benchmark to see what AI can really produce in about a week of casual work and testing. The entire codebase -- backend, frontend, database design, email system, auth flow, admin panel, all of it -- was generated using [Claude AI](https://claude.ai) by Anthropic.

---

## License

MIT
