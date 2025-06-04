# Hazri System Backend

This is the backend API for the Hazri System, a teacher attendance tracking application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the backend directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/hazri-system
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=8h
   ```

3. Start the server:
   ```
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/email and password
- `POST /api/auth/admin-setup` - Set up admin account
- `GET /api/auth/user` - Get current authenticated user

### Teachers
- `GET /api/teachers` - Get all teachers (admin only)
- `GET /api/teachers/:id` - Get a specific teacher
- `POST /api/teachers` - Add a new teacher (admin only)
- `PUT /api/teachers/:id` - Update a teacher (admin only)
- `PUT /api/teachers/:id/password` - Update teacher password
- `DELETE /api/teachers/:id` - Delete a teacher (admin only)

### Attendance
- `GET /api/attendance` - Get all attendance records (admin only)
- `GET /api/attendance/teacher/:teacherId` - Get attendance for a specific teacher
- `POST /api/attendance` - Add or update an attendance record
- `DELETE /api/attendance/:id` - Delete an attendance record (admin only)
- `GET /api/attendance/summary/teacher/:teacherId` - Get attendance summary by month/year

## MongoDB Collections

### Teachers Collection
- `name`: String
- `username`: String (unique)
- `email`: String
- `password`: String (hashed)
- `phoneNumber`: String
- `address`: String
- `joiningDate`: Date
- `active`: Boolean
- `createdAt`: Date

### Attendance Collection
- `teacherId`: ObjectId (ref: 'Teacher')
- `teacherName`: String
- `date`: String
- `status`: String (enum: 'present', 'absent', 'leave', 'half-day', 'late')
- `timeIn`: String
- `timeOut`: String
- `comments`: String
- `workHours`: Number
- `salaryDeduction`: Number
- `createdAt`: Date
- `updatedAt`: Date 