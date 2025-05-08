# Sports Academy Management System - Developer Guide

This guide provides detailed information for developers working on the Sports Academy Management System backend project.

## Project Architecture

This project follows a layered architecture with clear separation of concerns:

1. **Presentation Layer (Controllers)** - Handles HTTP requests/responses
2. **Business Logic Layer (Services)** - Contains the business logic
3. **Data Access Layer (Models)** - Manages data storage and retrieval
4. **Middlewares** - Cross-cutting concerns like authentication, error handling
5. **Utils** - Reusable utility functions

## Directory Structure

```
/sports-academy-backend
├── config/                 # Configuration files
│   ├── database.js         # Database connection setup
│   └── ...
├── controllers/            # Request handlers
│   ├── authController.js   # Authentication operations
│   ├── userController.js   # User management
│   └── ...
├── models/                 # Database models
│   ├── userModel.js        # User schema and methods
│   ├── coachProfileModel.js
│   └── ...
├── routes/                 # API routes
│   ├── authRoutes.js       # Authentication routes
│   ├── userRoutes.js       # User management routes
│   └── ...
├── middlewares/            # Custom middlewares
│   ├── authMiddleware.js   # Authentication & authorization middleware
│   ├── errorMiddleware.js  # Error handling middleware
│   └── ...
├── utils/                  # Utility functions
│   ├── jwtUtils.js         # JWT token utilities
│   ├── passwordUtils.js    # Password hashing and comparison
│   └── ...
├── docs/                   # API documentation
│   ├── swagger.yaml        # Swagger API specification
│   └── ...
├── validations/            # Data validation schemas
│   ├── authValidation.js   # Authentication validation schemas
│   └── ...
├── services/               # Business logic services
│   └── ...
├── public/                 # Static files
│   └── uploads/            # Uploaded files storage
├── app.js                  # Express app setup
├── server.js               # Server entry point
└── .env                    # Environment variables
```

## Code Structure and Standards

### Controllers

Controllers are responsible for:
- Processing HTTP requests and responses
- Input validation
- Invoking appropriate service methods
- Formatting responses

Example structure:
```javascript
// Function signature with route documentation
/**
 * Login user
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = catchAsync(async (req, res) => {
  // Input extraction
  const { email, password } = req.body;
  
  // Business logic
  const user = await User.findOne({ email }).select('+password');
  
  // Response handling
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});
```

### Models

Models define the data structure using Mongoose schemas with:
- Field validations
- Middleware hooks (pre/post)
- Instance and static methods
- Virtuals and query helpers

### Middlewares

- **Error Handling** - Central error processing
- **Authentication** - JWT verification
- **Validation** - Request data validation
- **Upload** - File upload handling

### Utilities

- **JWT** - Token generation and verification
- **Password** - Hashing and comparison
- **Email** - Email sending (placeholder)

## Authentication Flow

1. User registers or logs in
2. Server validates credentials and generates JWT tokens
3. Client includes token in Authorization header
4. `authMiddleware.protect()` verifies token
5. `authMiddleware.restrictTo()` checks permissions

## Data Model Relationships

Models are related through MongoDB references:

- `User` (base model) 
  - Has one `StudentProfile` or `CoachProfile` depending on role
  - Referenced in many models (created by, updated by)

- `StudentProfile`
  - References `User` (owns the profile)
  - References many `User`s with `coach` role (assigned coaches)
  - Referenced in `Attendance`, `ExerciseCompletion`, etc.

- `CoachProfile`
  - References `User` (owns the profile)
  - References many `User`s with `student` role (assigned students)

## Error Handling

The application uses a centralized error handling approach:

1. Operational errors (expected errors) vs Programming errors (bugs)
2. `catchAsync` wrapper for all async controller functions
3. Global error middleware to format responses

## Validation

Input validation uses Joi schemas:
1. Define schema in `validations/` folder
2. Use `validateBody` middleware in routes

## Development Workflow

1. **Setup**: Clone repo and install dependencies
2. **Run**: Start server with `npm run dev`
3. **Test API**: Access Swagger docs at `/api-docs`
4. **Implement**: Follow layered architecture

## Adding New Features

To add a new feature:

1. Define models in `models/`
2. Create validation schemas in `validations/`
3. Implement controllers in `controllers/`
4. Define routes in `routes/`
5. Update Swagger docs in `docs/swagger.yaml`
6. Update app.js to include new routes

## Security Considerations

- JWT tokens for authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation
- Rate limiting
- Security HTTP headers (Helmet)
- CORS protection
- Environment variables for secrets

## Deployment Considerations

- Set NODE_ENV to 'production'
- Configure MongoDB production connection string
- Set secure JWT secrets
- Enable additional security in `app.js` 