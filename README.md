# Hedge Stores POS

A full-featured Point of Sale system for Hedge Stores.
Stack: React + Vite + Tailwind CSS v4 + Supabase + jsPDF + Recharts

## Features
- Auth (cashier & admin roles)
- Dashboard with live stats and revenue chart
- Checkout with cart, discounts, M-Pesa STK Push
- Inventory: full CRUD, stock tracking, low-stock alerts
- Customer records with purchase history
- Sales history with filters and PDF export
- Reports: revenue charts, top products, payment breakdown
- Receipt & Invoice PDF generation

## Setup

### 1. Create Supabase Project
Go to supabase.com → New Project → name it "Hedge Stores POS"

### 2. Run the Schema
Supabase → SQL Editor → paste supabase/schema.sql → Run

### 3. Add Environment Variables
Copy .env.example to .env and fill in your Supabase URL and anon key.
Get them from: Supabase Dashboard → Settings → API

### 4. Install and Run
npm install
npm run dev

## M-Pesa
Create a Supabase Edge Function at supabase/functions/mpesa/index.ts
Add Daraja API secrets via Supabase secrets manager.
See README for full details.

## Electron Desktop App
npm install -D electron electron-builder concurrently wait-on
Then add the electron scripts to package.json as shown in README.
