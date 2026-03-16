# CourtCheck

A crowdsourced tennis court directory and conditions reporter. Find courts near you and see real-time condition reports from the community.

## Features

- **Court Directory** — Browse all courts, filter by state and city, search by name
- **Add a Court** — Submit new courts without an account
- **Condition Reports** — Report court conditions (Great, Wet/Puddles, Cracked, Busy/Long Wait, Closed)
- **Photo Uploads** — Attach up to 3 photos per condition report
- **Flag Reports** — Flag inaccurate reports; 3+ flags show a warning label
- **Mobile-First** — Designed for quick use on your phone at the courts

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

## Setup

1. **Create a PostgreSQL database:**

   ```bash
   createdb courtcheck
   ```

2. **Initialize the schema and seed data:**

   ```bash
   psql postgresql://username:password@localhost:5432/courtcheck -f schema.sql
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your `DATABASE_URL`:

   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/courtcheck
   PORT=3000
   ```

4. **Install dependencies and start:**

   ```bash
   npm install
   npm start
   ```

The app runs at [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL via pg
- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)
- **Uploads:** Multer, stored in `/uploads`
