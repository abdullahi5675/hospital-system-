const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Session Auth Controllers
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND delete_status = \'Active\'', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    req.session.user = {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: { id: user.user_id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) { next(error); }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, gender, mobile_no, address, city, education, experience, invitationCode } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required.' });
    }

    // Validate role value
    if (!['Admin', 'Doctor', 'Patient'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }

    // Verify invitation code for Admin and Doctor
    if (role === 'Admin') {
      const adminCode = process.env.ADMIN_REGISTRATION_CODE || 'admin123';
      if (!invitationCode || invitationCode !== adminCode) {
        return res.status(403).json({ success: false, message: 'Invalid invitation code for Admin registration.' });
      }
    }

    if (role === 'Doctor') {
      const doctorCode = process.env.DOCTOR_REGISTRATION_CODE || 'doctor123';
      if (!invitationCode || invitationCode !== doctorCode) {
        return res.status(403).json({ success: false, message: 'Invalid invitation code for Doctor registration.' });
      }
    }

    // Check for duplicate email
    const check = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (check.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    let result;
    if (role === 'Doctor') {
      result = await db.query(
        `INSERT INTO users (name, email, password_hash, role, mobile_no, education, experience, doctor_status)
         VALUES ($1, $2, $3, 'Doctor', $4, $5, $6, 'Active') RETURNING user_id, name, email, role`,
        [name, email, hash, mobile_no || null, education || null, experience || null]
      );
    } else if (role === 'Admin') {
      result = await db.query(
        `INSERT INTO users (name, email, password_hash, role, gender)
         VALUES ($1, $2, $3, 'Admin', $4) RETURNING user_id, name, email, role`,
        [name, email, hash, gender || null]
      );
    } else {
      result = await db.query(
        `INSERT INTO users (name, email, password_hash, role, gender, mobile_no, address, city)
         VALUES ($1, $2, $3, 'Patient', $4, $5, $6, $7) RETURNING user_id, name, email, role`,
        [name, email, hash, gender || null, mobile_no || null, address || null, city || null]
      );
    }

    return res.status(201).json({ success: true, message: `${role} account created successfully.`, data: result.rows[0] });
  } catch (error) { next(error); }
};


exports.getCurrentUser = (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({ success: true, user: req.session.user });
  }
  return res.status(401).json({ success: false, message: 'Not logged in.' });
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Could not log out.' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  });
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check the email exists
    const user = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (user.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'No account found with that email address.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

    return res.status(200).json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (error) { next(error); }
};


// 2. Dashboard Controllers (Authenticated & Role-aware)
exports.getDashboardData = async (req, res, next) => {
  try {
    const { role, id } = req.session.user;
    
    if (role === 'Admin') {
      const stats = {
        totalDoctors: (await db.query('SELECT COUNT(*) FROM users WHERE role = \'Doctor\' AND delete_status = \'Active\'')).rows[0].count,
        totalPatients: (await db.query('SELECT COUNT(*) FROM users WHERE role = \'Patient\'')).rows[0].count,
        totalBeds: (await db.query('SELECT COUNT(*) FROM beds')).rows[0].count,
        occupiedBeds: (await db.query('SELECT COUNT(*) FROM beds WHERE status = \'Occupied\'')).rows[0].count,
        pendingAppointments: (await db.query('SELECT COUNT(*) FROM appointments WHERE status = \'Pending\'')).rows[0].count,
      };
      
      const appts = await db.query(
        `SELECT a.*, p.name as patient_name, d.name as doctor_name
         FROM appointments a
         JOIN users p ON a.patient_id = p.user_id
         LEFT JOIN users d ON a.doctor_id = d.user_id
         ORDER BY
           CASE WHEN a.status = 'Pending' THEN 0 ELSE 1 END ASC,
           a.created_at DESC
         LIMIT 20`
      );
      
      const beds = await db.query('SELECT * FROM beds ORDER BY bed_number ASC');
      return res.status(200).json({ success: true, stats, appointments: appts.rows, beds: beds.rows });
    }

    if (role === 'Doctor') {
      const stats = {
        myPending: (await db.query('SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = \'Pending\'', [id])).rows[0].count,
        myApproved: (await db.query('SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = \'Approved\'', [id])).rows[0].count,
      };

      const appts = await db.query(
        'SELECT a.*, p.name as patient_name, d.name as doctor_name FROM appointments a JOIN users p ON a.patient_id = p.user_id LEFT JOIN users d ON a.doctor_id = d.user_id WHERE a.doctor_id = $1 ORDER BY a.appointment_date DESC, a.appointment_time DESC',
        [id]
      );

      const beds = await db.query('SELECT * FROM beds ORDER BY bed_number ASC');
      return res.status(200).json({ success: true, stats, appointments: appts.rows, beds: beds.rows });
    }

    if (role === 'Patient') {
      const stats = {
        myPending: (await db.query('SELECT COUNT(*) FROM appointments WHERE patient_id = $1 AND status = \'Pending\'', [id])).rows[0].count,
        myPrescriptions: (await db.query('SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1', [id])).rows[0].count,
      };

      const appts = await db.query(
        'SELECT a.*, p.name as patient_name, d.name as doctor_name FROM appointments a JOIN users p ON a.patient_id = p.user_id LEFT JOIN users d ON a.doctor_id = d.user_id WHERE a.patient_id = $1 ORDER BY a.appointment_date DESC, a.appointment_time DESC',
        [id]
      );

      const allocations = await db.query(
        'SELECT b.*, bd.bed_number, bd.ward_name, bd.room FROM bed_allocations b JOIN beds bd ON b.bed_id = bd.bed_id WHERE b.patient_id = $1 ORDER BY b.allocated_at DESC',
        [id]
      );

      return res.status(200).json({ success: true, stats, appointments: appts.rows, allocations: allocations.rows });
    }
  } catch (error) { next(error); }
};

// 3. Appointments Management
exports.bookAppointment = async (req, res, next) => {
  try {
    const { appointment_type, appointment_reason } = req.body;

    // Patients book for themselves only
    if (req.session.user.role !== 'Patient') {
      return res.status(403).json({ success: false, message: 'Only patients can submit appointment requests.' });
    }

    const patientId = req.session.user.id;

    // Insert request — doctor/date/time are NULL until Admin assigns them
    const result = await db.query(
      `INSERT INTO appointments (patient_id, appointment_type, appointment_reason, status)
       VALUES ($1, $2, $3, 'Pending') RETURNING *`,
      [patientId, appointment_type || 'Regular', appointment_reason || null]
    );

    return res.status(201).json({ success: true, message: 'Appointment request submitted. Admin will assign your doctor and schedule.', data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, disapprove_reason, doctor_id, appointment_date, appointment_time } = req.body;

    if (!['Approved', 'Disapproved', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transformation.' });
    }

    // When Admin approves, they must supply doctor_id, date and time
    if (status === 'Approved' && req.session.user.role === 'Admin') {
      if (!doctor_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ success: false, message: 'Doctor, date and time are required to approve an appointment.' });
      }
      const result = await db.query(
        `UPDATE appointments
         SET status = 'Approved', doctor_id = $1, appointment_date = $2, appointment_time = $3, disapprove_reason = NULL
         WHERE appointment_id = $4 RETURNING *`,
        [doctor_id, appointment_date, appointment_time, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });
      return res.status(200).json({ success: true, message: 'Appointment approved and scheduled.', data: result.rows[0] });
    }

    // Doctors can mark Completed, or Disapprove
    const result = await db.query(
      'UPDATE appointments SET status = $1, disapprove_reason = $2 WHERE appointment_id = $3 RETURNING *',
      [status, status === 'Disapproved' ? disapprove_reason || 'Disapproved by medical staff' : null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    return res.status(200).json({ success: true, message: `Appointment status set to ${status}.`, data: result.rows[0] });
  } catch (error) { next(error); }

};

// 4. Bed Occupancy & Allocations
exports.allocateBed = async (req, res, next) => {
  try {
    const { patient_id, bed_id } = req.body;
    if (!patient_id || !bed_id) {
      return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const bedCheck = await db.query('SELECT status FROM beds WHERE bed_id = $1', [bed_id]);
    if (bedCheck.rowCount === 0) return res.status(404).json({ success: false, message: 'Bed not found.' });
    if (bedCheck.rows[0].status !== 'Available') return res.status(400).json({ success: false, message: 'Bed is currently occupied.' });

    await db.query("UPDATE beds SET status = 'Occupied' WHERE bed_id = $1", [bed_id]);
    const result = await db.query(
      "INSERT INTO bed_allocations (patient_id, bed_id, alloc_status) VALUES ($1, $2, 'Allocated') RETURNING *",
      [patient_id, bed_id]
    );

    return res.status(201).json({ success: true, message: 'Bed allocated successfully.', data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.dischargePatient = async (req, res, next) => {
  try {
    const { id } = req.params; // allocation_id
    
    // Find allocation & bed
    const allocResult = await db.query('SELECT * FROM bed_allocations WHERE allocation_id = $1', [id]);
    if (allocResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Allocation records not found.' });
    }
    
    const alloc = allocResult.rows[0];
    await db.query("UPDATE beds SET status = 'Available' WHERE bed_id = $1", [alloc.bed_id]);
    await db.query(
      "UPDATE bed_allocations SET discharged_at = NOW(), alloc_status = 'Discharged' WHERE allocation_id = $1",
      [id]
    );

    return res.status(200).json({ success: true, message: 'Patient discharged and bed released successfully.' });
  } catch (error) { next(error); }
};

exports.getBedsReport = async (req, res, next) => {
  try {
    const totalBeds = await db.query('SELECT COUNT(*) FROM beds');
    const occupied = await db.query("SELECT COUNT(*) FROM beds WHERE status = 'Occupied'");
    const beds = await db.query(
      `SELECT b.*, ba.allocation_id, ba.patient_id, u.name as patient_name, ba.allocated_at 
       FROM beds b 
       LEFT JOIN bed_allocations ba ON b.bed_id = ba.bed_id AND ba.alloc_status = 'Allocated'
       LEFT JOIN users u ON ba.patient_id = u.user_id 
       ORDER BY b.bed_number ASC`
    );

    return res.status(200).json({
      success: true,
      report: {
        total: parseInt(totalBeds.rows[0].count),
        occupied: parseInt(occupied.rows[0].count),
        available: parseInt(totalBeds.rows[0].count) - parseInt(occupied.rows[0].count)
      },
      beds: beds.rows
    });
  } catch (error) { next(error); }
};

// Get only Available beds (for allocation modal)
exports.getAvailableBeds = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT bed_id, bed_number, ward_name, room FROM beds WHERE status = 'Available' ORDER BY ward_name, bed_number ASC`
    );
    return res.status(200).json({ success: true, beds: result.rows });
  } catch (error) { next(error); }
};

// Add a new room/ward with a specified number of beds
exports.addRoom = async (req, res, next) => {
  try {
    const { ward_name, room, bed_count } = req.body;
    if (!ward_name || !room || !bed_count || bed_count < 1) {
      return res.status(400).json({ success: false, message: 'Ward name, room name, and at least 1 bed are required.' });
    }

    const count = parseInt(bed_count);
    if (isNaN(count) || count > 50) {
      return res.status(400).json({ success: false, message: 'Bed count must be a number between 1 and 50.' });
    }

    // Generate bed numbers based on ward prefix + existing beds in that ward
    const existingBeds = await db.query(
      'SELECT COUNT(*) FROM beds WHERE ward_name = $1',
      [ward_name]
    );
    const startIndex = parseInt(existingBeds.rows[0].count) + 1;

    // Create a short prefix from the ward name
    const prefix = ward_name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    const roomPrefix = room.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);

    const created = [];
    for (let i = 0; i < count; i++) {
      const bedNumber = `${prefix}-${roomPrefix}${String(startIndex + i).padStart(2, '0')}`;
      // Skip if bed number already exists
      const exists = await db.query('SELECT bed_id FROM beds WHERE bed_number = $1', [bedNumber]);
      if (exists.rowCount > 0) continue;
      const result = await db.query(
        `INSERT INTO beds (ward_name, bed_number, room, status) VALUES ($1, $2, $3, 'Available') RETURNING *`,
        [ward_name, bedNumber, room]
      );
      created.push(result.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${created.length} bed(s) added to "${ward_name}" — ${room}.`,
      beds: created
    });
  } catch (error) { next(error); }
};

// Get list of all distinct wards/rooms
exports.getRooms = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ward_name, room, COUNT(*) as total_beds,
              SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
              SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied
       FROM beds
       GROUP BY ward_name, room
       ORDER BY ward_name, room`
    );
    return res.status(200).json({ success: true, rooms: result.rows });
  } catch (error) { next(error); }
};


// 5. Doctor Directory Management (Admin only)
exports.getDoctorsList = async (req, res, next) => {
  try {
    const result = await db.query('SELECT user_id, name, email, mobile_no, education, experience, doctor_status FROM users WHERE role = \'Doctor\' AND delete_status = \'Active\' ORDER BY name ASC');
    return res.status(200).json({ success: true, doctors: result.rows });
  } catch (error) { next(error); }
};

exports.addDoctor = async (req, res, next) => {
  try {
    const { name, email, password, mobile_no, education, experience } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const check = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (check.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Email is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, mobile_no, education, experience, doctor_status) 
       VALUES ($1, $2, $3, 'Doctor', $4, $5, $6, 'Active') RETURNING user_id, name, email`,
      [name, email, hash, mobile_no || null, education || null, experience || null]
    );

    return res.status(201).json({ success: true, message: 'Doctor added successfully.', doctor: result.rows[0] });
  } catch (error) { next(error); }
};

exports.editDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, mobile_no, education, experience, doctor_status } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET name = $1, mobile_no = $2, education = $3, experience = $4, doctor_status = $5
       WHERE user_id = $6 AND role = 'Doctor' RETURNING user_id, name, email`,
      [name, mobile_no, education, experience, doctor_status || 'Active', id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.status(200).json({ success: true, message: 'Doctor details updated successfully.', doctor: result.rows[0] });
  } catch (error) { next(error); }
};

exports.deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Soft delete by setting delete_status to 'Deleted'
    const result = await db.query(
      'UPDATE users SET delete_status = \'Deleted\' WHERE user_id = $1 AND role = \'Doctor\' RETURNING user_id',
      [id]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.status(200).json({ success: true, message: 'Doctor deleted successfully.' });
  } catch (error) { next(error); }
};

// 6. Patient Directory Management
exports.getPatientsList = async (req, res, next) => {
  try {
    const result = await db.query('SELECT user_id, name, email, gender, mobile_no, address, city, created_at FROM users WHERE role = \'Patient\' ORDER BY name ASC');
    return res.status(200).json({ success: true, patients: result.rows });
  } catch (error) { next(error); }
};

exports.addPatient = async (req, res, next) => {
  try {
    const { name, email, password, gender, mobile_no, address, city } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const check = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (check.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Email is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, gender, mobile_no, address, city) 
       VALUES ($1, $2, $3, 'Patient', $4, $5, $6, $7) RETURNING user_id, name, email`,
      [name, email, hash, gender || null, mobile_no || null, address || null, city || null]
    );

    return res.status(201).json({ success: true, message: 'Patient added successfully.', patient: result.rows[0] });
  } catch (error) { next(error); }
};

exports.editPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, gender, mobile_no, address, city } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET name = $1, gender = $2, mobile_no = $3, address = $4, city = $5
       WHERE user_id = $6 AND role = 'Patient' RETURNING user_id, name, email`,
      [name, gender, mobile_no, address, city, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
    return res.status(200).json({ success: true, message: 'Patient details updated successfully.', patient: result.rows[0] });
  } catch (error) { next(error); }
};

// Get single patient view together with their EMR details + current bed
exports.getPatientProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetId = (req.session.user.role === 'Patient') ? req.session.user.id : id;

    const profileResult = await db.query('SELECT user_id, name, email, role, gender, mobile_no, address, city, created_at FROM users WHERE user_id = $1', [targetId]);
    if (profileResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const patient = profileResult.rows[0];
    if (patient.role !== 'Patient') {
      return res.status(400).json({ success: false, message: 'Selected user is not a Patient.' });
    }

    const allergies = await db.query('SELECT * FROM allergies WHERE patient_id = $1 ORDER BY created_at DESC', [targetId]);
    const problems = await db.query('SELECT * FROM active_problems WHERE patient_id = $1 ORDER BY created_at DESC', [targetId]);
    const prescriptions = await db.query(
      `SELECT p.*, d.name as doctor_name 
       FROM prescriptions p 
       LEFT JOIN users d ON p.doctor_id = d.user_id 
       WHERE p.patient_id = $1 ORDER BY p.created_at DESC`,
      [targetId]
    );
    const history = await db.query(
      `SELECT c.*, d.name as doctor_name 
       FROM consultations c 
       LEFT JOIN users d ON c.doctor_id = d.user_id 
       WHERE c.patient_id = $1 ORDER BY c.consultation_date DESC`,
      [targetId]
    );

    // Current active bed allocation for this patient
    const bedAlloc = await db.query(
      `SELECT ba.allocation_id, ba.allocated_at, ba.alloc_status,
              b.bed_number, b.ward_name, b.room, b.bed_id
       FROM bed_allocations ba
       JOIN beds b ON ba.bed_id = b.bed_id
       WHERE ba.patient_id = $1 AND ba.alloc_status = 'Allocated'
       ORDER BY ba.allocated_at DESC LIMIT 1`,
      [targetId]
    );

    return res.status(200).json({
      success: true,
      profile: patient,
      allergies: allergies.rows,
      problems: problems.rows,
      prescriptions: prescriptions.rows,
      history: history.rows,
      currentBed: bedAlloc.rowCount > 0 ? bedAlloc.rows[0] : null
    });
  } catch (error) { next(error); }
};

// 7. Add EMR Logs (Consultations, Prescriptions, Allergies, Problems) -- Protected
exports.addConsultation = async (req, res, next) => {
  try {
    const { patient_id, diagnosis, treatment } = req.body;
    const doctor_id = req.session.user.id; // From logged in doctor session

    if (!patient_id || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Patient ID and diagnosis are required.' });
    }

    const result = await db.query(
      'INSERT INTO consultations (patient_id, doctor_id, diagnosis, treatment) VALUES ($1, $2, $3, $4) RETURNING *',
      [patient_id, doctor_id, diagnosis, treatment || null]
    );

    return res.status(201).json({ success: true, message: 'Consultation note logged.', data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.addPrescription = async (req, res, next) => {
  try {
    const { patient_id, medication, dosage } = req.body;
    const doctor_id = req.session.user.id;

    if (!patient_id || !medication) {
      return res.status(400).json({ success: false, message: 'Patient ID and medication name are required.' });
    }

    const result = await db.query(
      'INSERT INTO prescriptions (patient_id, doctor_id, medication, dosage) VALUES ($1, $2, $3, $4) RETURNING *',
      [patient_id, doctor_id, medication, dosage || null]
    );

    return res.status(201).json({ success: true, message: 'Prescription added.', data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.addAllergy = async (req, res, next) => {
  try {
    const { patient_id, allergy_name, reaction } = req.body;
    if (!patient_id || !allergy_name) {
      return res.status(400).json({ success: false, message: 'Patient ID and allergy name are required.' });
    }

    const result = await db.query(
      'INSERT INTO allergies (patient_id, allergy_name, reaction) VALUES ($1, $2, $3) RETURNING *',
      [patient_id, allergy_name, reaction || null]
    );

    return res.status(201).json({ success: true, message: 'Allergy logger successfully.', data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.addProblem = async (req, res, next) => {
  try {
    const { patient_id, problem_name } = req.body;
    if (!patient_id || !problem_name) {
      return res.status(400).json({ success: false, message: 'Patient ID and problem name are required.' });
    }

    const result = await db.query(
      'INSERT INTO active_problems (patient_id, problem_name) VALUES ($1, $2) RETURNING *',
      [patient_id, problem_name]
    );

    return res.status(201).json({ success: true, message: 'Active problem logged.', data: result.rows[0] });
  } catch (error) { next(error); }
};