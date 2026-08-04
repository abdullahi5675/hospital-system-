# Citizen's Clinic — Patient Management & EMR System

A secure, web-based **Electronic Medical Record (EMR)** system for **Citizen's Clinic**. It replaces paper-based patient records with a centralized digital platform accessible by Admins, Doctors, and Patients.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Demo Accounts](#demo-accounts)

---

## Project Overview

| Detail              | Description                                      |
| ------------------- | ------------------------------------------------ |
| **Project Type**    | Final Year Project — Patient Management System   |
| **Client**          | Citizen's Clinic                                 |
| **Purpose**         | Automate and digitize patient records management |
| **Supported Roles** | Admin, Doctor, Patient                           |

---

## Technology Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| **Backend**        | Node.js + Express.js                              |
| **Database**       | PostgreSQL (`pg` module)                          |
| **Authentication** | `express-session` + `bcryptjs` (password hashing) |
| **Frontend**       | HTML5, CSS3, Vanilla JavaScript                   |
| **Env Config**     | `dotenv`                                          |

---

## Project Structure

```
clinic-emr-system/
│
├── backend/
│   ├── config/
│   │   └── db.js                  # PostgreSQL connection pool
│   ├── controllers/
│   │   └── clinicController.js    # All business logic (auth, EMR, beds, appointments)
│   ├── middleware/
│   │   ├── auth.js                # requireLogin / requireRole guards
│   │   └── errorHandler.js        # Global error fallback handler
│   ├── routes/
│   │   └── clinicRoutes.js        # All /api/* route definitions
│   └── server.js                  # Express app entry point
│
├── database/
│   ├── schema.sql                 # Full PostgreSQL table definitions + seed data
│   └── init_db.js                 # Run this to initialize the database
│
├── frontend/
│   ├── css/
│   │   └── style.css              # Full design system (theme, cards, badges, tables)
│   ├── js/
│   │   └── app.js                 # Shared utilities (auth check, logout, notifications)
│   │
│   ├── login.html                 # Login page (all roles)
│   ├── register.html              # Patient self-registration
│   ├── index.html                 # Admin Dashboard
│   ├── doctors.html               # Admin: view/edit/delete doctors roster
│   ├── add_doctor.html            # Admin: register new doctor
│   ├── patients.html              # Admin/Doctor: view patients directory
│   ├── add_patient.html           # Admin: register new patient
│   ├── patient_profile.html       # EMR chart view (allergies, prescriptions, history)
│   ├── add_treatment.html         # Doctor: log consultation diagnosis
│   ├── prescriptions.html         # Doctor: write medication prescription
│   ├── doctor.html                # Doctor Dashboard
│   ├── patient.html               # Patient Dashboard
│   ├── book_appointment.html      # Patient: book a consultation
│   └── view_patients.html         # All roles: read-only registry view
│
├── .env                           # Environment variables (DB URL, session secret, port)
├── package.json                   # Node.js project config and dependencies
└── README.md                      # This file
```

---

## User Roles

### Admin

- Add, edit and delete doctor profiles
- Add and edit patient profiles
- Book appointments on behalf of patients
- Allocate and discharge patients from beds
- View all appointments and live ward occupancy

### Doctor

- View own scheduled appointments
- Approve or disapprove appointments (with reason)
- Open patient EMR profiles
- Log consultation notes (diagnosis + treatment)
- Write medication prescriptions
- Log allergies and active health problems
- Allocate and discharge patients from beds

### Patient

- Self-register via public registration page
- Log in to view personal dashboard
- Book consultation appointments
- View appointment status and disapproval reasons
- View own EMR (prescriptions, allergies, consultations, problems)
- View bed allocation history

---

## Database Schema

| Table             | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `users`           | All system users (Admin, Doctor, Patient) with hashed passwords |
| `beds`            | Clinic bed registry with availability status                    |
| `appointments`    | Patient booking records with status tracking                    |
| `bed_allocations` | Tracks which patient is in which bed, and when discharged       |
| `allergies`       | Known patient allergic reactions                                |
| `active_problems` | Ongoing patient health conditions                               |
| `prescriptions`   | Doctor-prescribed medications                                   |
| `consultations`   | Doctor encounter notes (diagnosis + treatment)                  |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) (running locally on port 5432)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit the `.env` file at the project root with your credentials:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/clinic_db
SESSION_SECRET=your_secret_key_here
```

### 3. Initialize the Database

This command creates the `clinic_db` database, all tables, and seeds demo accounts:

```bash
node database/init_db.js
```

### 4. Start the Server

```bash
node backend/server.js
```

Then open your browser at: **http://localhost:3000/login.html**

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method   | Endpoint                          | Role Access      | Description                 |
| -------- | --------------------------------- | ---------------- | --------------------------- |
| `POST`   | `/auth/login`                     | Public           | Log in                      |
| `POST`   | `/auth/register`                  | Public           | Patient self-registration   |
| `GET`    | `/auth/me`                        | Public           | Get current session user    |
| `POST`   | `/auth/logout`                    | Any              | Log out                     |
| `GET`    | `/dashboard`                      | Any (role-aware) | Fetch dashboard data        |
| `POST`   | `/appointments/book`              | Patient, Admin   | Book an appointment         |
| `PATCH`  | `/appointments/:id/status`        | Doctor, Admin    | Approve/Disapprove/Complete |
| `GET`    | `/beds/report`                    | Doctor, Admin    | Full ward occupancy report  |
| `POST`   | `/beds/allocate`                  | Doctor, Admin    | Allocate a bed              |
| `PATCH`  | `/beds/allocations/:id/discharge` | Doctor, Admin    | Discharge a patient         |
| `GET`    | `/doctors`                        | All              | List active doctors         |
| `POST`   | `/doctors`                        | Admin            | Add a new doctor            |
| `PATCH`  | `/doctors/:id`                    | Admin            | Edit doctor details         |
| `DELETE` | `/doctors/:id`                    | Admin            | Soft-delete a doctor        |
| `GET`    | `/patients`                       | Admin, Doctor    | List all patients           |
| `POST`   | `/patients`                       | Admin            | Add a new patient           |
| `PATCH`  | `/patients/:id`                   | Admin            | Edit patient bio-data       |
| `GET`    | `/patients/:id/profile`           | All              | Get full EMR profile        |
| `POST`   | `/patients/emr/consultations`     | Doctor           | Log consultation note       |
| `POST`   | `/patients/emr/prescriptions`     | Doctor           | Write a prescription        |
| `POST`   | `/patients/emr/allergies`         | Doctor, Admin    | Log an allergy              |
| `POST`   | `/patients/emr/problems`          | Doctor, Admin    | Log an active problem       |

---

## Demo Accounts

These accounts are seeded automatically when you run `node database/init_db.js`:

| Role    | Email                | Password      |
| ------- | -------------------- | ------------- |
| Admin   | `admin@clinic.com`   | `password123` |
| Doctor  | `doctor@clinic.com`  | `password123` |
| Patient | `patient@clinic.com` | `password123` |

---

## Multi-Role Registration & Invitation Codes

The registration page (`/register.html`) supports all three user roles:

| Role    | Registration | Invitation Code Required |
| ------- | ------------ | ------------------------ |
| Patient | Open         | None                     |
| Doctor  | Protected    | Set via `DOCTOR_REGISTRATION_CODE` in `.env` (default: `doctor123`) |
| Admin   | Protected    | Set via `ADMIN_REGISTRATION_CODE` in `.env` (default: `admin123`)   |

To change the codes, edit your `.env` file:
```env
ADMIN_REGISTRATION_CODE=YourSecretAdminCode
DOCTOR_REGISTRATION_CODE=YourSecretDoctorCode
```

---

## UI Features

| Feature              | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| **Dark / Light Mode**| Toggle using the 🌙/☀️ button in the topbar. Preference is saved across sessions. |
| **Collapsible Sidebar** | Click the ☰ hamburger button on desktop to collapse/expand the sidebar. |
| **Mobile Responsive**| On screens ≤768px, the sidebar slides in as a drawer over the content.  |

