CREATE DATABASE IF NOT EXISTS attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_db;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','lecturer','student') NOT NULL DEFAULT 'student',
  matric_no VARCHAR(30) NULL,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL,
  course_title VARCHAR(150) NOT NULL,
  lecturer_id INT NOT NULL,
  credit_units INT DEFAULT 2,
  semester VARCHAR(40) DEFAULT '2024/2025 First Semester',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecturer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrolments (
  enrolment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrolment (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS embeddings (
  embedding_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  device_hash VARCHAR(64),
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lecturer_id INT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(100) DEFAULT 'Main Campus',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (lecturer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  token_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  token_uuid VARCHAR(36) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (used_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
  record_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  token_uuid VARCHAR(36),
  recognition_score FLOAT,
  liveness_score FLOAT,
  marked_at DATETIME NOT NULL,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance (student_id, session_id),
  FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE
);

-- Admin password: Admin@123
INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES
('System Administrator','admin@abuad.edu.ng','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhr6','admin');

-- Lecturer password: Lecturer@123
INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES
('Dr. Oluwatoyin Abiola','abiola@abuad.edu.ng','$2b$10$rIC/7TK9zPTF4GRMnV5K8.a6LxeFoFVUuQlzMKXRm4GH4PdF8MJkW','lecturer');
