-- Database Schema for Secure Patient Management System
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS active_problems CASCADE;
DROP TABLE IF EXISTS allergies CASCADE;
DROP TABLE IF EXISTS bed_allocations CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Patient')),
    gender VARCHAR(20),
    mobile_no VARCHAR(20),
    address VARCHAR(200),
    city VARCHAR(100),
    education TEXT,
    experience TEXT,
    doctor_status VARCHAR(20) DEFAULT 'Active',
    delete_status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beds (
    bed_id SERIAL PRIMARY KEY,
    ward_name VARCHAR(50) NOT NULL,
    bed_number VARCHAR(10) NOT NULL UNIQUE,
    room VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Occupied', 'Maintenance'))
);

CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    appointment_type VARCHAR(50) DEFAULT 'Regular',
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    appointment_date DATE,
    appointment_time TIME,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Disapproved', 'Completed')),
    appointment_reason TEXT,
    disapprove_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bed_allocations (
    allocation_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    bed_id INT REFERENCES beds(bed_id) ON DELETE CASCADE,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMP NULL,
    alloc_status VARCHAR(20) DEFAULT 'Allocated'
);

CREATE TABLE allergies (
    allergy_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    allergy_name VARCHAR(100) NOT NULL,
    reaction VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE active_problems (
    problem_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    problem_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consultations (
    consultation_id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed defaults with hashed passwords (bcrypt for 'password123')
INSERT INTO users (name, email, password_hash, role, gender, mobile_no, address, city) VALUES
('System Administrator', 'admin@clinic.com', '$2a$10$e0MYz4x2z4bA68q.Y4i3nO.eI2N28P2C9pS5vjK7JNzrCe.9B/tqO', 'Admin', 'Male', '1234567890', '123 Admin St', 'HQ City')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, mobile_no, education, experience, doctor_status) VALUES
('Dr. Smith', 'doctor@clinic.com', '$2a$10$e0MYz4x2z4bA68q.Y4i3nO.eI2N28P2C9pS5vjK7JNzrCe.9B/tqO', 'Doctor', '5551234', 'MBBS, MD Cardiology', '10 Years Cardiology Practice', 'Active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role, gender, mobile_no, address, city) VALUES
('John Doe', 'patient@clinic.com', '$2a$10$e0MYz4x2z4bA68q.Y4i3nO.eI2N28P2C9pS5vjK7JNzrCe.9B/tqO', 'Patient', 'Male', '5556789', '456 Patient Rd', 'Metropolis')
ON CONFLICT (email) DO NOTHING;

-- Seed beds
INSERT INTO beds (ward_name, bed_number, room, status) VALUES
('ICU', 'ICU-101', 'Room 1', 'Available'),
('ICU', 'ICU-102', 'Room 2', 'Available'),
('General Ward A', 'GEN-A01', 'Ward Room A', 'Available'),
('General Ward A', 'GEN-A02', 'Ward Room A', 'Available'),
('Pediatric Ward', 'PED-201', 'Children Room', 'Available')
ON CONFLICT (bed_number) DO NOTHING;