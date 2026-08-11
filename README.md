# Just Another Todo

Analytics-forward reminders inspired by Apple Reminders — lists, sharing, points, and friend dashboards.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- NextAuth.js (Auth.js) email/password credentials
- MongoDB + Mongoose
- Recharts for analytics

## Setup

1. Copy env and set MongoDB:

```bash
cp .env.example .env.local
```

2. Ensure MongoDB is running locally (or set an Atlas `MONGODB_URI`).

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Register / login with email + password
- Reminder lists (folders) with Apple-like glass UI
- Private lists (score counts, not shareable)
- Share lists as collaborator or viewer
- Points on completion (self vs peer)
- Daily / weekly / monthly analytics
- Friends + view each other&apos;s public dashboards
