const Joi = require('joi');

/**
 * Registration request validation schema
 */
exports.registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least {#limit} characters long',
      'string.max': 'Name cannot be longer than {#limit} characters',
      'any.required': 'Name is required',
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string().min(6).required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least {#limit} characters long',
      'any.required': 'Password is required',
    }),
  
  passwordConfirm: Joi.string().valid(Joi.ref('password')).optional()
    .messages({
      'string.base': 'Password confirmation must be a string',
      'string.empty': 'Password confirmation is required',
      'any.only': 'Passwords do not match',
    }),
  
  role: Joi.string().valid('coach', 'student').default('student')
    .messages({
      'string.base': 'Role must be a string',
      'any.only': 'Role must be either coach or student',
    }),
    
  userType: Joi.string().valid('coach', 'student').default('student')
    .messages({
      'string.base': 'User type must be a string',
      'any.only': 'User type must be either coach or student',
    }),
  
  phone: Joi.string().allow('').optional()
    .messages({
      'string.base': 'Phone number must be a string',
    }),
    
  contactNumber: Joi.string().allow('').optional()
    .messages({
      'string.base': 'Contact number must be a string',
    }),
    
  age: Joi.number().integer().min(5).max(100).optional()
    .messages({
      'number.base': 'Age must be a number',
      'number.integer': 'Age must be an integer',
      'number.min': 'Age must be at least {#limit}',
      'number.max': 'Age cannot be more than {#limit}',
    }),
    
  gender: Joi.string().valid('male', 'female', 'other', 'prefer not to say').optional()
    .messages({
      'string.base': 'Gender must be a string',
      'any.only': 'Gender must be one of: male, female, other, prefer not to say',
    }),
    
  sportsCategories: Joi.array().items(Joi.string()).optional()
    .messages({
      'array.base': 'Sports categories must be an array',
    }),
    
  sportPreferences: Joi.array().items(Joi.string()).optional()
    .messages({
      'array.base': 'Sport preferences must be an array',
    }),
    
}).options({ abortEarly: false });

/**
 * Login request validation schema
 */
exports.loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string().required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
}).options({ abortEarly: false });

/**
 * Forgot password request validation schema
 */
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
}).options({ abortEarly: false });

/**
 * Reset password request validation schema
 */
exports.resetPasswordSchema = Joi.object({
  token: Joi.string().required()
    .messages({
      'string.base': 'Token must be a string',
      'string.empty': 'Token is required',
      'any.required': 'Token is required',
    }),
  
  password: Joi.string().min(8).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'))
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least {#limit} characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
  
  passwordConfirm: Joi.string().valid(Joi.ref('password')).required()
    .messages({
      'string.base': 'Password confirmation must be a string',
      'string.empty': 'Password confirmation is required',
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
}).options({ abortEarly: false });

/**
 * Refresh token request validation schema
 */
exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
    .messages({
      'string.base': 'Refresh token must be a string',
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
}).options({ abortEarly: false });

/**
 * Change password request validation schema
 */
exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'string.base': 'Current password must be a string',
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),
  
  newPassword: Joi.string().min(8).required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'))
    .messages({
      'string.base': 'New password must be a string',
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least {#limit} characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required',
    }),
  
  newPasswordConfirm: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({
      'string.base': 'Password confirmation must be a string',
      'string.empty': 'Password confirmation is required',
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
}).options({ abortEarly: false }); 