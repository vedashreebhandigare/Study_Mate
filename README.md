# Study Mate

An AI-powered learning web application that helps students upload study material, generate adaptive quizzes and flashcards, chat with an AI tutor, and track learning progress in one place.

## Overview

Study Mate is a React + Vite frontend focused on personalized study workflows:

- Authentication and profile management with Supabase
- Document upload and analysis pipeline
- AI-generated quizzes with quality scoring
- AI-generated flashcards and review views
- AI tutor support for guided learning
- Concept map and roadmap-oriented learning support
- Redirect-based integration with an external Flask study-session service

## Key Features

### Learning Workflow

- Sign in and start a guided study session flow
- Upload documents (PDF/DOCX/text-supported flow in app components)
- Generate quizzes and flashcards from uploaded content
- Review progress from a unified dashboard

### AI Learning Tools

- Adaptive quiz generation and validation
- Flashcard generation and clustered review experience
- AI tutor module for contextual doubt clearing
- Concept map and roadmap modules for structured learning

### Platform Features

- Animated, responsive UI built with React and Motion
- Supabase-backed authentication and user-linked data access
- Hash-based page navigation with state-aware auth transitions
- Rate-limit and auth debug indicators included in UI

## Tech Stack

- Frontend: React 18, TypeScript, Vite 6
- UI: Radix UI primitives, custom UI components
- Animation: Motion
- Data/Auth: Supabase
- AI/Processing: Gemini integration utilities, Transformers.js, document parsing utilities
- Charts/Visuals: Recharts, force graph utilities, organizational/charting support

## Project Structure

```text
.
|-- index.html
|-- package.json
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   |-- components/
|   |   |-- HomePage.tsx
|   |   |-- Dashboard.tsx
|   |   |-- StudySessionPage.tsx
|   |   |-- DocumentUploader.tsx
|   |   |-- Quiz*.tsx
|   |   |-- Flashcard*.tsx
|   |   |-- AITutor*.tsx
|   |   |-- ConceptMap*.tsx
|   |   |-- ui/
|   |-- lib/
|   |   |-- supabase.ts
|   |   |-- database.ts
|   |   |-- quiz-generator-advanced.ts
|   |   |-- flashcard-generator-advanced.ts
|   |   |-- ai-tutor.ts
|   |   |-- concept-map-generator.ts
|   |   |-- adaptive-roadmap-engine.ts
|   |-- styles/
|-- vite.config.ts
```

## Getting Started

### 1. Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm
- A Supabase project
- Gemini API key
- (Optional) YouTube API key
- (Optional but used in study flow) local Flask backend for study session

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` in the project root (or copy from `.env.example`):

```env
VITE_FLASK_URL=http://localhost:5000
VITE_GEMINI_API_KEY=
VITE_YOUTUBE_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Environment variable notes:

- `VITE_FLASK_URL`: URL of the Flask app used by `StudySessionPage`
- `VITE_GEMINI_API_KEY`: API key for Gemini-powered generation features
- `VITE_YOUTUBE_API_KEY`: optional key for YouTube-backed functionality
- `VITE_SUPABASE_URL`: your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key

### 4. Run the App

```bash
npm run dev
```

Open the URL shown by Vite (typically `http://localhost:5173`).

### 5. Build for Production

```bash
npm run build
```

## Available Scripts

- `npm run dev`: starts Vite development server
- `npm run build`: creates production build output

## Authentication and Navigation Flow

- App checks Supabase session on load
- New sign-in routes users to `study-session`
- `StudySessionPage` stores return metadata in localStorage and redirects to Flask app
- Returning users can continue through dashboard/profile sections

## Security Notes

- Do not commit `.env` files or private API keys
- Use Supabase Row Level Security (RLS) for user-scoped data access
- Rotate keys if any credential leakage is suspected

## Deployment Notes

This project is a Vite static frontend. You can deploy the build output on:

- Vercel
- Netlify
- GitHub Pages (with appropriate base-path setup)
- Any static hosting/CDN

Make sure runtime environment variables are configured in your deployment platform.

## Current Status

- Core frontend and major AI-learning modules are present
- README is aligned with the current codebase structure and environment configuration

## License

No license file is currently included in this repository. Add a `LICENSE` file if you want to define usage rights explicitly.
