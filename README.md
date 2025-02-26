# Budget App

A comprehensive personal finance management application built with Next.js, Prisma, and PostgreSQL.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/O8jlr9?referralCode=B5MxwU)

## Features

- **Dashboard**: Overview of your financial situation with charts and summaries
- **Expense Tracking**: Add, edit, and categorize your expenses
- **Recurring Expenses**: Set up and manage recurring expenses
- **Budget Planning**: Plan your budget and track your progress
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/budgetapp.git
cd budgetapp
```

2. Install dependencies

```bash
pnpm install
```

3. Set up environment variables

```bash
cp .env.example .env
```

Then edit the `.env` file with your database connection string and other configuration.

4. Run database migrations

```bash
pnpm prisma migrate dev
```

5. Start the development server

```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /api             # API Routes Next.js
  /(routes)        # Pages of the application
  /dashboard       # Main page
  /expenses        # Expense management
  /settings        # User settings
/components
  /ui              # Reusable UI components
  /forms           # Form components
  /dashboard       # Dashboard-specific components
  /expenses        # Expense-related components
/lib
  /actions         # Server-side actions
  /utils           # Utility functions
  /validators      # Validation schemas
/prisma
  schema.prisma    # Database schema
  /migrations      # Prisma migrations
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
