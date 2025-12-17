# Broker Copilot 🚀

Broker Copilot is a clinical-grade, AI-driven insurance brokerage management system. It orchestrates data from **HubSpot CRM** and **Google Workspace (Gmail & Calendar)** to provide a unified, prioritized view of insurance renewals, enriched with deep communication history and AI-generated insights.

---

## 🌟 Core Features

### 📊 Intelligent Renewal Analytics
- **Multi-Factor Priority Scoring**: Dynamic scores (1-100) based on Time Urgency, Deal Value, Engagement Level, Deal Stage, and Contact Quality.
- **Visual Breakdown**: Intuitive progress bars in the UI explain exactly *why* a renewal is high priority.
- **What-If Simulator**: Model different scenarios by adjusting variables (premium, days left) to see real-time priority impacts.

### 🔄 Seamless Data Orchestration
- **HubSpot Integration**: Real-time sync of deals and contact properties.
- **Google Workspace Sync**: Intelligent matching of Gmail threads and Calendar events to HubSpot deals via email, domain, and keyword analysis.
- **Incognito Persistence**: Secure AES-256 encryption for session tokens. By default, the system operates in **Incognito Mode**, wiping tokens from disk upon server shutdown for maximum security.

### 🤖 AI-Powered Workflow
- **One-Page Briefs**: Gemini-powered summaries of deal status, risks (e.g., "Ghosting" detection), and recommended next steps.
- **Smart Outreach**: Auto-generated email templates personalized with policy details and recent interaction context.
- **PDF Generation**: Instantly generate professional PDF briefs to attach to client communications.

### 📅 Integrated Scheduling & Communication
- **Meeting Scheduler**: Check calendar availability and suggest/book meeting slots directly from the renewal dashboard.
- **Communication Timeline**: A centralized view of all emails and meetings related to a specific client.
- **Manual/Auto Emailing**: Choose between automatic recipient detection or manual entry for flexible outreach.

---

## 🛠️ Project Structure

```text
Broker_Copilot/
├── backend/                # Node.js Express Server
│   ├── src/
│   │   ├── connectors/     # HubSpot & Google API Logic
│   │   ├── services/       # Data Orchestrator & AI Logic
│   │   ├── utils/          # Score Calculator & PDF Generator
│   │   └── routes/         # API Endpoints & OAuth
│   ├── tests/              # Comprehensive Test Suite (15 Tests)
│   └── data/               # Persistent Storage (Encrypted during session)
├── frontend/               # React (Vite) Frontend
│   ├── src/
│   │   ├── components/     # UI Components (Dashboard, Timeline, etc.)
│   │   └── hooks/          # Data Fetching & State
└── start.ps1               # Portable Startup Script
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **API Keys**: Google OAuth Client ID/Secret, HubSpot Client ID/Secret, and a Gemini API Key.

### 2. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
PORT=4000
ENCRYPTION_KEY=your_32_byte_hex_key  # Run 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
HUBSPOT_CLIENT_ID=...
HUBSPOT_CLIENT_SECRET=...
HUBSPOT_REDIRECT_URI=http://localhost:4000/auth/hubspot/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
GEMINI_API_KEY=...
FRONTEND_URL=http://localhost:3000
```

### 3. Installation & Startup
Use the provided PowerShell script for a one-click start:
```powershell
./start.ps1
```
This will launch the Backend (Port 4000) and Frontend (Port 3000) in separate windows.

---

## 🧪 Verification & Testing
The system includes a robust test suite covering 100% of core business logic.

**Run All Tests:**
```bash
cd backend
npm test
```
*Current Coverage: 15/15 passing (Scoring, Matching, Encryption, PDF, API).*

---

## 🎓 Summary of Completion
The Broker Copilot is now a fully functional, end-to-end solution. All key milestones have been met:
- ✅ **Secure Auth**: Encrypted token handling with automatic cleanup (Incognito Mode).
- ✅ **Intelligent Matching**: Email and Calendar matching logic verified.
- ✅ **UI/UX excellence**: Responsive dashboard, detailed breakdowns, and AI-assisted workflows.
- ✅ **Stability**: 15 integrated tests ensuring zero-regression during future updates.

---

**Lead Developers**: Jai Adithya A , Kiran Soorya R S , Veeresh , Arya Chigare

**Status**: 100% Completed

