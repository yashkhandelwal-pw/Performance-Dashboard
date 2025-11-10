# Performance Dashboard

A responsive, mobile-first dashboard application for tracking sample requests and employee performance.

## Features

- 📱 Mobile-first responsive design
- 🔐 Email-based OTP authentication via Supabase
- 📊 Real-time KPI dashboards
- 📦 Sample request management
- 👥 Hierarchical user roles (Employee, Reporting Manager, Zonal Manager)
- 📊 Data tables with expandable rows
- 📥 Excel export functionality
- 🎨 Modern UI with TailwindCSS and Framer Motion

## Tech Stack

- **React** - UI library
- **React Router** - Navigation
- **TailwindCSS** - Styling
- **Supabase** - Backend & Authentication
- **Zustand** - State management
- **XLSX** - Excel export
- **Framer Motion** - Animations
- **Vite** - Build tool

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
  /pages
    - Login.jsx
    - Dashboard.jsx
    - Sample.jsx
    - Profile.jsx
  /components
    - KPIcard.jsx
    - MultiKPI.jsx
    - FilterBar.jsx
    - DataTable.jsx
    - BottomNav.jsx
  /hooks
    - useSupabase.js
  /services
    - fetchData.js
    - exportExcel.js
  /utils
    - auth.js
```

## User Roles

- **Employee**: Can view only their own data
- **Reporting Manager**: Can view data for employees under them
- **Zonal Manager**: Can view data across all reporting managers and employees

## Supabase Configuration

The app connects to Supabase with the following credentials:
- URL: `https://kfkcohosbpaeuzxuohrm.supabase.co`
- API Key: Configured in `src/hooks/useSupabase.js`

## Notes

- For development, mock OTP verification is enabled if Supabase OTP is not configured
- Session is stored in localStorage via Zustand persist middleware
- Filters automatically refresh data on change


