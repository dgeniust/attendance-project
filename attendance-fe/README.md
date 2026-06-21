# attendance-fe

Frontend service for the attendance project.

## Overview

This frontend is a React + TypeScript application built with Vite. It provides user authentication and a face attendance interface that captures webcam images and sends them to the backend for recognition.

## Features

- Login and registration for students
- Password reset flow
- Webcam-based face attendance capture
- Model selection for attendance: `resnet`, `retina`, `facenet`
- Toast notifications for user feedback

## Prerequisites

- Node.js 20 or later
- npm
- Backend running at `http://127.0.0.1:8000/api`

## Setup

1. Install dependencies in `attendance-fe`:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open the application in the browser using the URL shown by Vite.

## Project structure

- `src/App.tsx` - Route definitions and layout wrapper
- `src/pages/Auth.tsx` - Login, register, and forgot password interface
- `src/pages/FaceAttendance.tsx` - Webcam capture and attendance submission
- `src/services/attendance.ts` - Attendance API client
- `src/services/authService.ts` - Auth API client
- `src/utils/api.ts` - Fetch wrapper with JWT handling

## Important configuration

- The API base URL is set in `src/utils/api.ts`:

```ts
const BASE_URL = "http://127.0.0.1:8000/api";
```

- JWT access token is stored in `localStorage` under `access_token`.

## Available scripts

- `npm run dev` - Start development server
- `npm run build` - Build production files
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Usage

1. Register a new student account using the Auth page.
2. Login to obtain a JWT session.
3. Navigate to the face attendance page.
4. Allow webcam access.
5. Choose a model and click to capture the face for attendance.

## Notes

- The attendance capture flow extracts an image from the webcam video and sends it to the backend as `FormData`.
- The backend must be running and reachable at the configured API base URL.
- The `FaceAttendance` page redirects the user after a successful attendance check.
