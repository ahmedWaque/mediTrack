# MediTrack

A comprehensive medical inventory tracking system designed for healthcare facilities. The system allows nurses, managers, and directors to track medicine inventory, request supplies, and generate audit reports with role-based access control and security flagging for suspicious inventory changes.

## Features

- **Role-Based Access Control**: Three user roles (Nurse, Manager, Director) with different permissions
- **Inventory Management**: Track medicine and supply quantities with real-time updates
- **Request System**: Nurses can request medicines that need restocking
- **Audit Reports**: Generate PDF audit reports for inventory tracking and compliance
- **Security Flagging**: Automatic detection and flagging of suspicious inventory changes (soft and critical alerts)
- **Activity Logging**: Comprehensive logging system with colored alert indicators
- **User Settings**: Customizable dashboard styles and session limits

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v14 or higher recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
  
- **npm** (comes with Node.js)
  - Verify installation: `npm --version`

- **PostgreSQL** (v12 or higher)
  - Download from [postgresql.org](https://www.postgresql.org/download/)
  - Make sure PostgreSQL is running on your system

## Installation & Setup

### 1. Database Setup

1. **Create a PostgreSQL database** for the application:

```sql
CREATE DATABASE meditrack;
```

2. **Run the schema file** to create all necessary tables:

```bash
# Using psql command line 
psql -U postgres -d meditrack -f db/meditrack_schema.sql

# Reccomended use pgAdmin : 
# Create a server 
# Open the file db/meditrack_schema.sql and execute it in your server to create the database 
```

This will create all necessary tables and insert initial data including:
- Default users (Director, Nurse, Manager)
- Sample inventory items
- Initial log entries

### 2. Backend Setup

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies :

```bash
npm install
```

3. Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=meditrack

# Server Configuration
PORT=5000

# JWT Secret (use a strong random string in production) #For my JWT Key I used a JWT key generator
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Important**: Replace the placeholder values with your actual PostgreSQL credentials and choose a strong JWT_SECRET for production use.

4. Start the server:

```bash
npm start
```

The server should now be running on `http://localhost:5000` (or the port you specified).

### 3. Frontend Setup

1. Open a new terminal window and navigate to the client directory:

```bash
cd client
```

2. Install dependencies :

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The React application will automatically open in your browser at `http://localhost:3000`.

## Default Login Credentials

Name    user_id   password
Susan : 28245800  s282$00    
Mark  : 68699800  m686$00   
Kayla : 48499800  k484$00   

## Available Scripts

### Backend (server/)

- `npm start` - Start the Express server

### Frontend (client/)

- `npm start` - Start the development server
- `npm build` - Build the app for production
- `npm test` - Run tests

## API Endpoints

The backend provides the following main API endpoints:

- `POST /login` - User authentication
- `GET /inventory` - Get all inventory items
- `PUT /inventory/:itemId` - Update inventory item
- `POST /inventory` - Add new inventory item (Manager/Director only)
- `DELETE /inventory/:itemId` - Delete inventory item (Director only)
- `GET /logs` - Get all activity logs
- `GET /requests` - Get all medicine requests
- `POST /requests` - Create a medicine request (Nurse only)
- `PUT /alert/:requestId` - Approve/deny request (Manager only)
- `GET /audit` - Get audit reports
- `POST /audit` - Generate audit report (Manager/Director only)
- `GET /settings` - Get user settings
- `PUT /settings` - Update user settings

## Security Features

### Alert System

The system automatically flags suspicious inventory changes:

- **Soft Alert** (Yellow border): Moderate quantity change (≥5 units OR ≥20% change)
- **Critical Alert** (Red border): Large quantity change (≥15 units OR ≥40% change)
- **Normal** (Green border): All other changes

Thresholds can be configured in `server/utils/securityConfig.js`.

## Technologies Used

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT (JSON Web Tokens)
- bcrypt (password hashing)
- PDFKit (audit report generation)

### Frontend
- React
- React Router
- Axios (HTTP client)
- Tailwind CSS (styling)




