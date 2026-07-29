# ABUAD Offline-First Attendance System

## Quick Start
1. Install Node.js 18+ and MySQL 8.0+
2. `mysql -u root -p < scripts/schema.sql`
3. Edit `.env` — set DB_PASSWORD
4. `npm install && npm start`
5. Open http://localhost:3000

## Default Accounts
| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@abuad.edu.ng       | Admin@123    |
| Lecturer | abiola@abuad.edu.ng      | Lecturer@123 |

## Student Flow
Login → Face Enrolment (once) → Mark Attendance (QR scan + liveness + face)

## Lecturer Flow
Login → Sessions → Create Session → Show QR → Students scan
