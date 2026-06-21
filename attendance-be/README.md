# attendance-be

Backend service for the attendance project.

## Overview

This backend is a FastAPI application that provides authentication and face attendance APIs. It uses MongoDB for data storage and multiple face recognition models to register and verify student attendance.

## Features

- Student account registration and login with JWT authentication
- Password reset flow using email
- Face registration using uploaded images
- Face attendance verification with multiple model options
- Anti-spoofing protection using DeepFace
- Attendance records stored in MongoDB

## Prerequisites

- Python 3.11 or later
- MongoDB Atlas or MongoDB server accessible via URI
- SMTP mail account for password reset emails

## Setup

1. Create a Python virtual environment in `attendance-be`:

```bash
python -m venv .venv
```

2. Activate the environment:

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in `attendance-be` with the following variables:

```text
MONGO_USERNAME=your_mongo_username
MONGO_PASSWORD=your_mongo_password
CLUSTER_URL=your_cluster_url
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=your_email_address
SMTP_PORT=587
SMTP_SERVER=your_smtp_server
```

## Run the backend

From the `attendance-be` folder:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API base URL will be:

```text
http://127.0.0.1:8000/api
```

## API Endpoints

### Authentication

- `POST /api/auth/register`
  - Register a new student account
  - Body: `student_id`, `name`, `email`, `password`

- `POST /api/auth/login`
  - Login and receive JWT access token
  - Body: `student_id_or_email`, `password`

- `POST /api/auth/forgot-password`
  - Send password reset email
  - Body: `email`

- `POST /api/auth/reset-password`
  - Reset password using token
  - Body: `token`, `new_password`

### Face attendance

- `POST /api/ai/register`
  - Register face data for an existing student
  - Form data: `file`, `student_id`

- `POST /api/ai/attendance`
  - Submit a captured image for attendance check
  - Requires Bearer token in `Authorization` header
  - Form data: `file`, `model_type`
  - Query param: `threshold`

- `GET /api/attendance/check-today/{student_id}`
  - Check whether student has already checked in today

### Protected endpoint example

- `GET /api/students/me`
  - Returns current authenticated user profile
  - Requires Bearer token

## Notes

- The backend loads multiple face recognition adapters from `resnet`, `retina`, and `mtcnn_facenet_model` directories.
- Make sure MongoDB collections `students` and `checkins` exist or can be created automatically.
- The `attendance.py` service includes model-specific vector search logic and stores embeddings in MongoDB.
