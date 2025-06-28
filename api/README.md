# MediZap AI Healthcare Management API

A comprehensive RESTful API for healthcare management system with appointment booking, doctor management, walk-in patient registration, and clinic administration.

## 🚀 Features

- **Doctor Management**: CRUD operations for doctors with specialties and availability
- **Appointment System**: Schedule, modify, and cancel appointments
- **Clinic Management**: Multi-clinic support with role-based access
- **Walk-in Registration**: Queue management for walk-in patients
- **Department Management**: Organize doctors by medical departments
- **Authentication & Authorization**: Secure JWT-based authentication
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Rate Limiting**: Protection against abuse
- **Comprehensive Logging**: Winston-based logging system
- **Input Validation**: Joi-based request validation
- **Pagination**: Efficient data pagination
- **Error Handling**: Standardized error responses

## 📋 Prerequisites

- Node.js 16+ 
- Supabase account and project
- PostgreSQL database (via Supabase)

## 🛠 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd api
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

4. **Configure environment variables**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

5. **Create logs directory**
```bash
mkdir logs
```

6. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

Once the server is running, visit:
- **Interactive Documentation**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs/openapi.json`

## 🔐 Authentication

All API endpoints (except `/health` and `/api-docs`) require authentication using Bearer tokens from Supabase Auth.

### Headers Required:
```
Authorization: Bearer <your-supabase-jwt-token>
Content-Type: application/json
```

### Getting a Token:
Use Supabase Auth to sign in and get a JWT token:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session.access_token;
```

## 🏥 API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify token validity
- `GET /api/auth/profile` - Get user profile

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/{id}` - Get doctor details
- `POST /api/doctors` - Add new doctor
- `PUT /api/doctors/{id}` - Update doctor
- `DELETE /api/doctors/{id}` - Remove doctor

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Schedule appointment
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Cancel appointment
- `GET /api/appointments/doctor/{doctorId}` - Get doctor's schedule
- `GET /api/appointments/date/{date}` - Get appointments by date

### Clinics
- `GET /api/clinics` - List clinics
- `GET /api/clinics/{id}` - Get clinic details
- `GET /api/clinics/{id}/doctors` - Get clinic doctors
- `POST /api/clinics` - Add new clinic
- `PUT /api/clinics/{id}` - Update clinic

### Walk-ins
- `GET /api/walk-ins` - List walk-in queue
- `POST /api/walk-ins` - Register walk-in patient
- `PUT /api/walk-ins/{id}/status` - Update walk-in status
- `DELETE /api/walk-ins/{id}` - Remove from queue

### Departments
- `GET /api/departments` - List departments
- `GET /api/departments/{id}/doctors` - Get department doctors
- `POST /api/departments` - Add department
- `PUT /api/departments/{id}` - Update department

## 📊 Query Parameters

### Pagination
```
?page=1&limit=20&sort=created_at&order=desc
```

### Filtering
```
?clinic_id=uuid&status=pending&search=john
```

### Date Filtering
```
?date=2024-01-15&doctor_id=uuid
```

## 📝 Request/Response Examples

### Create Doctor
```bash
POST /api/doctors
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Dr. John Smith",
  "phone": "+1234567890",
  "department_id": "D1001",
  "clinic_id": "clinic-uuid",
  "available_days": ["Monday", "Tuesday", "Wednesday"],
  "available_times": ["09:00", "10:00", "11:00", "14:00"]
}
```

### Schedule Appointment
```bash
POST /api/appointments
Content-Type: application/json
Authorization: Bearer <token>

{
  "patient_name": "Jane Doe",
  "phone_number": "+1234567890",
  "email": "jane@example.com",
  "doctor_id": "doctor-uuid",
  "department_id": "D1001",
  "clinic_id": "clinic-uuid",
  "appointment_date": "2024-01-15",
  "appointment_time": "10:00",
  "notes": "Regular checkup"
}
```

### Register Walk-in
```bash
POST /api/walk-ins
Content-Type: application/json
Authorization: Bearer <token>

{
  "patient_name": "Bob Wilson",
  "contact_number": "+1234567890",
  "date_of_birth": "1990-01-01",
  "Gender": "Male",
  "reason_for_visit": "Fever and headache",
  "clinic_id": "clinic-uuid"
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin, staff, and doctor roles
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: Security headers and protection
- **SQL Injection Protection**: Parameterized queries via Supabase

## 📈 Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "field_name",
      "message": "Validation error message"
    }
  ]
}
```

### Common Error Codes:
- `UNAUTHORIZED` - Missing or invalid token
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `ACCESS_DENIED` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring & Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development

Log levels: `error`, `warn`, `info`, `debug`

## 🚀 Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
ALLOWED_ORIGINS=https://yourdomain.com
LOG_LEVEL=warn
```

### Docker Deployment:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Check the API documentation at `/api-docs`
- Review the error codes and messages
- Check the logs for detailed error information
- Contact the development team

---

Built with ❤️ for modern healthcare management