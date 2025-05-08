# Sports Academy Management System

A comprehensive backend API for managing a sports academy, handling students, coaches, subscriptions, tournaments, and more.

## Features

- **User Management**: Authentication, authorization, and role-based access control
- **Student Management**: Profiles, registrations, progress tracking
- **Coach Management**: Profiles, schedules, student assignments
- **Subscription System**: Plans, payments, transactions
- **Content Management**: Announcements, sports categories, policies
- **Tournament Management**: Create and manage tournaments, handle registrations
- **Reporting & Analytics**: Student engagement, coach performance, revenue reports
- **AI Sports Assistant**: Query sports rules, facts, and get training tips

## Technology Stack

- **Node.js** & **Express.js**: Backend framework
- **MongoDB**: Database
- **JWT**: Authentication
- **Mongoose**: ODM for MongoDB
- **Swagger**: API documentation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sports-academy-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   PORT=5000
   
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/sports-academy
   
   # JWT Authentication
   ACCESS_TOKEN_SECRET=your_access_token_secret_here
   REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   
   # Email Configuration (for future implementation)
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USERNAME=your_username
   EMAIL_PASSWORD=your_password
   EMAIL_FROM=noreply@sportsacademy.com
   
   # Upload Limits
   MAX_FILE_UPLOAD_SIZE=5000000
   ```

4. Initialize the system (creates admin user and checks environment setup):
   ```bash
   npm run init
   ```
   This will:
   - Create a default .env file if it doesn't exist
   - Create an admin user with the following credentials:
     - Email: admin@sportsacademy.com
     - Password: Admin@123

5. Start the development server:
   ```bash
   npm run dev
   ```

## Using the API

### Swagger UI

API documentation is available at `/api-docs` when the server is running. To access protected endpoints in Swagger UI:

1. Login using the admin credentials at `/auth/login` endpoint
2. Copy the `accessToken` from the response
3. Click the "Authorize" button at the top of Swagger UI
4. Enter `Bearer YOUR_TOKEN` in the value field
5. Click "Authorize" and close the popup
6. Now you can access the protected endpoints

### Admin API Helper

For scripting and easy access to admin endpoints, you can use the built-in admin API helper:

```javascript
// In your scripts
const adminApi = require('./scripts/adminApi');

// Get all students
adminApi.getAllStudents()
  .then(response => console.log(response.data.students))
  .catch(error => console.error(error));
```

You can also run the helper directly to see sample data:

```bash
npm run admin-api
```

## API Endpoints

The API is organized into the following main sections:

### Authentication
- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Log in a user
- `POST /api/v1/auth/logout`: Log out a user
- `GET /api/v1/auth/me`: Get current user information

### Users
- `GET /api/v1/users`: Get all users (admin only)
- `GET /api/v1/users/:id`: Get a single user
- `PATCH /api/v1/users/:id`: Update a user
- `DELETE /api/v1/users/:id`: Delete a user

### Students
- `GET /api/v1/students`: Get all students (admin only)
- `POST /api/v1/students`: Create a student profile
- `GET /api/v1/students/:id`: Get a single student
- `PATCH /api/v1/students/:id`: Update a student
- `DELETE /api/v1/students/:id`: Delete a student
- `GET /api/v1/students/:id/subscriptions`: Get student subscriptions
- `POST /api/v1/students/:id/subscriptions`: Create a subscription for a student
- `GET /api/v1/students/:id/progress`: Get student progress

### Coaches
- `GET /api/v1/coaches`: Get all coaches
- `POST /api/v1/coaches`: Create a coach profile (admin only)
- `GET /api/v1/coaches/:id`: Get a single coach
- `PATCH /api/v1/coaches/:id`: Update a coach
- `DELETE /api/v1/coaches/:id`: Delete a coach
- `GET /api/v1/coaches/:id/students`: Get students assigned to a coach
- `POST /api/v1/coaches/:id/exercise-plans`: Upload exercise plans

### Subscriptions
- `GET /api/v1/subscriptions/plans`: Get all subscription plans
- `POST /api/v1/subscriptions/plans`: Create a subscription plan (admin only)
- `GET /api/v1/subscriptions/plans/:id`: Get a single subscription plan
- `PATCH /api/v1/subscriptions/plans/:id`: Update a subscription plan (admin only)
- `DELETE /api/v1/subscriptions/plans/:id`: Delete a subscription plan (admin only)
- `GET /api/v1/subscriptions`: Get all subscriptions (admin only)
- `GET /api/v1/subscriptions/:id`: Get a single subscription

### Content
- `GET /api/v1/content/announcements`: Get all announcements
- `POST /api/v1/content/announcements`: Create an announcement (admin only)
- `GET /api/v1/content/sports`: Get all sports categories
- `POST /api/v1/content/sports`: Create a sports category (admin only)
- `GET /api/v1/content/policies`: Get all policies

### Tournaments
- `GET /api/v1/tournaments`: Get all tournaments
- `POST /api/v1/tournaments`: Create a tournament (admin only)
- `GET /api/v1/tournaments/:id`: Get a single tournament
- `PATCH /api/v1/tournaments/:id`: Update a tournament (admin only)
- `DELETE /api/v1/tournaments/:id`: Delete a tournament (admin only)
- `GET /api/v1/tournaments/:id/participants`: Get tournament participants

### AI Assistant
- `POST /api/v1/ai/query`: Query the sports assistant with a question
- `GET /api/v1/ai/recent-queries`: Get recent queries for the current user

### Reports
- `GET /api/v1/reports/dashboard/summary`: Get dashboard summary data (admin only)
- `GET /api/v1/reports/students/total`: Get total students report (admin only)
- `GET /api/v1/reports/students/engagement`: Get student engagement report (admin only)
- `GET /api/v1/reports/subscriptions/active`: Get active subscriptions report (admin only)
- `GET /api/v1/reports/subscriptions/revenue`: Get revenue report (admin only)

## Documentation

API documentation is available at `/api-docs` when the server is running.

## Error Handling

The API uses consistent error responses with appropriate HTTP status codes:

```json
{
  "status": "fail",
  "message": "Error message here"
}
```

For server errors:

```json
{
  "status": "error",
  "message": "Something went wrong"
}
```

## Development

### Running Tests

```bash
npm test
```

### Code Style

The project uses ESLint for code linting:

```bash
npm run lint
```

## Deployment

### Preparing for Production

1. Set the `NODE_ENV` environment variable to `production`
2. Configure a production MongoDB database
3. Set a strong JWT secret

### Docker Support

A Dockerfile and docker-compose.yml are included for containerization:

```bash
# Build the Docker image
docker build -t sports-academy-api .

# Run using Docker Compose
docker-compose up
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 