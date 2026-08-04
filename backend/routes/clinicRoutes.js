const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { requireLogin, requireRole } = require('../middleware/auth');

// Auth routes (Public)
router.post('/auth/login', clinicController.login);
router.post('/auth/register', clinicController.register);
router.get('/auth/me', clinicController.getCurrentUser);
router.post('/auth/logout', clinicController.logout);

// Common Dashboard (Role-aware inside controller)
router.get('/dashboard', requireLogin, clinicController.getDashboardData);

// Appointments (Patients can book for self; Admin can book for any Patient)
router.post('/appointments/book', requireLogin, requireRole(['Patient', 'Admin']), clinicController.bookAppointment);
router.patch('/appointments/:id/status', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.updateAppointmentStatus);

// Beds (Doctors / Admins only)
router.post('/beds/allocate', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.allocateBed);
router.patch('/beds/allocations/:id/discharge', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.dischargePatient);
router.get('/beds/report', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.getBedsReport);
router.get('/beds/available', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.getAvailableBeds);

// Room / Bed Management (Admin only)
router.post('/rooms', requireLogin, requireRole(['Admin']), clinicController.addRoom);
router.get('/rooms', requireLogin, requireRole(['Admin', 'Doctor']), clinicController.getRooms);


// Doctors management (Roster is viewable by all authenticated users, editing/deleting is Admin only)
router.get('/doctors', requireLogin, requireRole(['Admin', 'Doctor', 'Patient']), clinicController.getDoctorsList);
router.post('/doctors', requireLogin, requireRole(['Admin']), clinicController.addDoctor);
router.patch('/doctors/:id', requireLogin, requireRole(['Admin']), clinicController.editDoctor);
router.delete('/doctors/:id', requireLogin, requireRole(['Admin']), clinicController.deleteDoctor);

// Patients directory (Admins and Doctors)
router.get('/patients', requireLogin, requireRole(['Admin', 'Doctor']), clinicController.getPatientsList);
router.post('/patients', requireLogin, requireRole(['Admin']), clinicController.addPatient);
router.patch('/patients/:id', requireLogin, requireRole(['Admin']), clinicController.editPatient);

// Patient EMR & profile detail (Restricted inside controller for Patients)
router.get('/patients/:id/profile', requireLogin, requireRole(['Admin', 'Doctor', 'Patient']), clinicController.getPatientProfile);

// EMR addition logs (Admins & Doctors write access)
router.post('/patients/emr/consultations', requireLogin, requireRole(['Doctor']), clinicController.addConsultation);
router.post('/patients/emr/prescriptions', requireLogin, requireRole(['Doctor']), clinicController.addPrescription);
router.post('/patients/emr/allergies', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.addAllergy);
router.post('/patients/emr/problems', requireLogin, requireRole(['Doctor', 'Admin']), clinicController.addProblem);

module.exports = router;