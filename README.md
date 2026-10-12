# EZSaldo • Financial management and analytics

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![pandas](https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo SDK 57](https://img.shields.io/badge/Expo-SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)

[![Live Demo](https://img.shields.io/badge/Live_Demo-EZSaldo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://ezsaldo.vercel.app)
[![Landing Page](https://img.shields.io/badge/Landing_Page-EZSaldo-35C2FF?style=for-the-badge&logo=githubpages&logoColor=white)](https://kiellzz.github.io/financial-tracker/)
[![Android Releases](https://img.shields.io/badge/Android-Releases-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/kiellzz/financial-tracker/releases)

**EZSaldo** is a full-stack financial application for tracking income and expenses, monitoring balance changes, and turning transaction history into clear insights. It is available as a [web app](https://ezsaldo.vercel.app) and an Android app built with Expo/React Native. Its product [landing page](https://kiellzz.github.io/financial-tracker/) is live on GitHub Pages.

In addition to traditional financial management, the project includes an independent Python service for statistical calculations, projections, and reports. It demonstrates a realistic, secure architecture designed to evolve.

## The product

- Registration, JWT authentication, and user profiles with avatars.
- Income and expenses organized by category and user.
- History filters by date, type, and amount, plus balance changes by period.
- Spending by category, monthly trends, and previous-month comparisons.
- IQR-based unusual expense detection and moving-average balance estimates.
- Monthly PDF reports, responsive layout, and a read-only demo account.
- Android app with transaction creation, editing and deletion; date, type and amount filters; financial analytics; and profile management.

## Financial analytics

![Financial analytics](./media/dataanalysis.png)

The analytics service is stateless and has no database access. Node authenticates the user, retrieves only their transactions, and sends Python only the fields required for analysis.

```text
Web / Android ── JWT ──> Node.js / Express ──> MongoDB
                              │
                              └── internal key ──> FastAPI + pandas
```

The browser never calls FastAPI directly. If the analytics service is unavailable, only this section displays an error; transactions, profile management, and balance tracking remain available.

### Technical decisions

- **Separate Python service:** pandas handles grouping, time series, and statistics without coupling these tasks to the authentication and CRUD backend.
- **IQR for unusual expenses:** it is less sensitive to extreme values than the mean and standard deviation. An expense is flagged above `Q3 + 1.5 × IQR`.
- **Moving average:** it uses the net result of the last 3 complete months. When data is insufficient, the API returns a warning instead of a misleading projection.
- **Security:** JWT protects the public API, an internal key protects Node → Python communication, and every query is scoped to the authenticated user ID.

## Stack

- **Frontend:** HTML5, CSS3, JavaScript, and Chart.js.
- **Mobile:** React Native, Expo SDK 57, React Native SVG, and EAS Build.
- **Landing page:** static HTML and CSS, deployed through GitHub Actions to GitHub Pages.
- **Backend:** Node.js, Express, Mongoose, JWT, and bcrypt.
- **Analytics:** Python, FastAPI, Pydantic, pandas, and ReportLab.
- **Data and infrastructure:** MongoDB, Docker Compose, and Vercel.

## Running locally

### Mobile app (Expo SDK 57 / React Native)

The Android app lives in [`mobile/`](./mobile) and uses the same Node API as the web frontend. It includes authentication, balance tracking, transaction creation/editing/deletion, transaction filters, financial analytics, and profile editing. Dates use a native calendar picker, and a negative amount is treated as an expense.

```powershell
cd mobile
npm install
npm start
```

The app points to the production API by default. Expo Go must match SDK 57. For a physical device connected to a locally running backend, set `EXPO_PUBLIC_API_URL` to the computer's LAN address before starting Expo. For Android Emulator, use `http://10.0.2.2:5000/api`. See [`mobile/README.md`](./mobile/README.md) for more details.

To build a directly installable Android APK (not a Play Store AAB), use the `preview` profile in [`mobile/eas.json`](./mobile/eas.json):

```powershell
cd mobile
eas build --platform android --profile preview
```

The resulting APK can be attached to a [GitHub Release](https://github.com/kiellzz/financial-tracker/releases) for sharing. Build files under `mobile/builds/` are ignored by Git; the repository does not contain the APK.

### Landing page

[`landing/`](./landing) is a buildless static site, published at **[kiellzz.github.io/financial-tracker](https://kiellzz.github.io/financial-tracker/)**. It links to the [web app](https://ezsaldo.vercel.app) and directly downloads the APK from the latest [GitHub Release](https://github.com/kiellzz/financial-tracker/releases). Open `landing/index.html` locally to inspect it. The workflow at [`.github/workflows/landing-pages.yml`](./.github/workflows/landing-pages.yml) deploys that directory on pushes to `master` that change the landing page, or by manual dispatch. Details are in [`landing/README.md`](./landing/README.md).

### Recommended: Docker Compose

Requirements: Docker Desktop running with Docker Compose available.

1. Create the environment file:

```powershell
Copy-Item .env.example .env
```

2. In `.env`, set long, different values for `JWT_SECRET` and `ANALYTICS_API_KEY`.

3. Build and start all services:

```powershell
docker compose up --build
```

4. Open:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- FastAPI is available only on the internal Compose network.

To stop the application:

```powershell
docker compose down
```

### Demo account

```text
Email:    demo.ezsaldo@example.test
Password: EZSaldo-Demo-2026
```

This account is read-only. The 70 synthetic transactions are restored to their original state when the backend starts and every 30 minutes while it remains active. Real accounts are never affected.

### Running without Docker

Start MongoDB and configure each service using its `.env.example`. Then run the following commands in separate terminals:

```powershell
# Node backend
cd backend
npm install
npm run dev
```

```powershell
# Python service
cd analytics-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Serve the `frontend/` directory on `localhost`. Use the same key for Node's `ANALYTICS_API_KEY` and Python's `INTERNAL_API_KEY`.

## Main configuration

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `ANALYTICS_SERVICE_URL` | Internal FastAPI URL |
| `ANALYTICS_API_KEY` | Key shared by Node and Python |
| `ANALYTICS_TIMEOUT_MS` | Analytics timeout; default: 5 seconds |
| `ANALYTICS_RETRY_WINDOW_MS` | Maximum cold-start retry window; default: 90 seconds |
| `DEMO_ACCOUNT_ENABLED` | Enables the demo account |
| `DEMO_ACCOUNT_RESET_INTERVAL_MINUTES` | Restore interval; default: 30 minutes |

`.env` files are not committed. The repository contains only examples without secrets.

## Screenshots

### Login

![Login](./media/login.png)

### Dashboard

![Dashboard](./media/dashboard.png)

### Profile editing

![Profile editing](./media/edituser.png)

### Avatar cropping

![Avatar cropping](./media/crop.png)

## Deployment

The web frontend is prepared for Vercel, the landing page for GitHub Pages, the Node backend for a web service, the database for MongoDB Atlas, and FastAPI for an independent Docker service. Android APKs are built with EAS and can be distributed through GitHub Releases once an APK is attached to a release. In production, keep FastAPI inaccessible to clients and configure every secret through the hosting provider's environment variables.
