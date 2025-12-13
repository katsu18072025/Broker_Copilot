# Broker Copilot

An AI-powered insurance broker management platform that combines data orchestration, communication timeline tracking, and intelligent renewal pipeline management.

## Overview

Broker Copilot is a full-stack web application designed to help insurance brokers manage client renewals efficiently. It integrates with Google Workspace and HubSpot, provides AI-powered insights, and includes a "What-If" simulator for scenario planning.

## Features

- **Renewal Pipeline Management**: Track and manage insurance renewals with weighted priority scoring
- **AI-Powered Brief**: Generate intelligent summaries and insights using AI
- **Communication Timeline**: Track all customer interactions and communications
- **What-If Simulator**: Model different scenarios for renewal outcomes
- **Google & HubSpot Integration**: Connect with Google Calendar, Gmail, and HubSpot CRM
- **Real-time Status**: Monitor connector health and data synchronization status
- **QA Panel**: Review and validate AI-generated content

## Project Structure

```
Broker_Copilot/
├── backend/              # Node.js Express server
│   ├── src/
│   │   ├── config/      # OAuth and configuration
│   │   ├── connectors/  # Google & HubSpot integrations
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   ├── scripts/         # Testing and seeding scripts
│   ├── server.js        # Main server file
│   ├── package.json
│   └── requirements.txt
├── frontend/            # React + Vite application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Utilities
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- Python 3.7+ (for backend dependencies)
- Google OAuth 2.0 credentials
- HubSpot API key

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   HUBSPOT_API_KEY=your_hubspot_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

The backend server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

### Running Both Services

From the root directory, run:
```bash
./start.ps1  # Windows PowerShell
```

## API Endpoints

### Authentication
- `POST /auth/google` - Google OAuth authentication
- `POST /auth/logout` - Logout

### Debug
- `GET /debug/renewals` - Fetch all renewals
- `GET /debug/communications` - Get communication data
- `POST /debug/seed` - Seed test data

## Scripts

Available backend scripts:
- `seedGoogleEmails.js` - Populate Google email data
- `seedCalendarEvents.js` - Populate calendar events
- `seedHubSpot.js` - Populate HubSpot data
- `seedEmailScenarios.js` - Generate test email scenarios
- `testOrchestration.js` - Test data orchestration

## Tech Stack

### Backend
- **Framework**: Express.js
- **Language**: JavaScript (Node.js)
- **APIs**: Google Calendar API, Gmail API, HubSpot API
- **AI**: OpenAI API

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS
- **State Management**: React Hooks

## Development

For development tips and current work status, see:
- [ProcessToBeDone.md](ProcessToBeDone.md) - Upcoming features and tasks
- [PossibleProgress.md](PossibleProgress.md) - Progress tracking

## Troubleshooting

### Backend Won't Start
- Ensure Node.js is installed: `node --version`
- Check `.env` file exists with required credentials
- Clear node_modules and reinstall: `rm -r node_modules && npm install`

### Frontend Build Issues
- Clear cache: `rm -r node_modules && npm install`
- Check Node.js version compatibility

### Authentication Fails
- Verify OAuth credentials in `.env`
- Check that callback URLs are registered in Google OAuth console

## License

[Add your license here]

## Support

For issues and questions, please open an issue on GitHub.

## Contributors

- Jai Adithya
