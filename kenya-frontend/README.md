# FSFVI Kenya Frontend

Food System Financial Vulnerability Index Platform for Kenya

## Overview

FSFVI Kenya is a specialized platform designed to help Kenya's government assess food system vulnerabilities, optimize budget allocation, and develop strategic plans for food security.

## Features

- 🎯 **Vulnerability Assessment**: Analyze vulnerabilities across 6 food system components
- 📊 **Budget Optimization**: AI-powered recommendations for resource allocation
- 📈 **Multi-Year Planning**: Strategic roadmap for progressive improvement
- 🔍 **Evidence-Based Insights**: Data-driven policy recommendations

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with glassmorphism design
- **Icons**: Lucide React
- **Deployment**: Optimized for Vercel/Node.js

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
cd kenya-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

### Development

Run the development server:

```bash
# Default port 3000
npm run dev

# Custom port
npm run dev:custom-port
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

Build for production:

```bash
npm run build
```

Run production server:

```bash
npm start
```

## Environment Configuration

### Development (.env.local)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FSFVI Kenya
NEXT_PUBLIC_APP_DOMAIN=kenya.fsfvi.ai
```

### Production (.env.production)
```env
NEXT_PUBLIC_APP_URL=https://kenya.fsfvi.ai
NEXT_PUBLIC_APP_NAME=FSFVI Kenya
NEXT_PUBLIC_APP_DOMAIN=kenya.fsfvi.ai
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Set custom domain to `kenya.fsfvi.ai`

### Deploy to Other Platforms

The app can be deployed to any Node.js hosting platform:

```bash
# Build the app
npm run build

# Start with custom port
PORT=3000 npm run start:prod
```

## Project Structure

```
kenya-frontend/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with header/footer
│   ├── page.tsx           # Home page
│   ├── about/             # About page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Header.tsx         # Sticky header
│   └── Footer.tsx         # Footer with date
├── public/                # Static assets
└── tailwind.config.ts     # Tailwind configuration
```

## Design System

### Colors
- **Kenya Green**: #006600
- **Kenya Red**: #BB0000
- **Kenya Black**: #000000
- **Kenya White**: #FFFFFF

### UI Components
- Glassmorphism design with backdrop blur
- Kenya flag color gradients
- Responsive grid layouts
- Animated floating elements

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run clean` - Clean build artifacts

## Pages

### Home (/)
- Platform introduction
- How it works guide
- Getting started instructions
- Coming soon features

### About (/about)
- Mission and vision
- Platform capabilities
- FSFVI explanation
- Team information
- Project timeline

## Contributing

This project is currently in development. For contributions or inquiries, contact kenya@fsfvi.ai

## License

© 2024 FSFVI.ai - All rights reserved

## Support

For support and questions:
- Email: kenya@fsfvi.ai
- Website: https://kenya.fsfvi.ai
