const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

// Import custom middleware
const { errorHandler } = require('./middlewares/errorMiddleware');

// Initialize express app
const app = express();

// Load environment variables
require('dotenv').config();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Create a log stream for production
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Limit requests from same IP
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // default: 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // default: 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Ensure placeholder image exists in Cloudinary
try {
  const { createPlaceholderImage } = require('./utils/createPlaceholderImage');
  createPlaceholderImage().then(url => {
    console.log('Placeholder image URL:', url);
  }).catch(error => {
    console.error('Error creating placeholder image:', error);
  });
} catch (error) {
  console.error('Error requiring createPlaceholderImage:', error);
}

// Swagger Documentation
try {
  // Try to load the simple swagger file first
  const simpleSwaggerPath = path.join(__dirname, 'docs', 'swagger_simple.yaml');
  console.log('Looking for Swagger file at:', simpleSwaggerPath);
  
  if (fs.existsSync(simpleSwaggerPath)) {
    const swaggerDocument = YAML.load(simpleSwaggerPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true
    }));
    console.log('Swagger documentation available at /api-docs using simplified schema');
  } else {
    // Fallback to the full swagger file
    const fullSwaggerPath = path.join(__dirname, 'docs', 'swagger.yaml');
    console.log('Simple swagger not found, trying full swagger at:', fullSwaggerPath);
    
    if (fs.existsSync(fullSwaggerPath)) {
      try {
        const swaggerDocument = YAML.load(fullSwaggerPath);
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
          explorer: true
        }));
        console.log('Swagger documentation available at /api-docs using full schema');
      } catch (parseError) {
        console.error('Error parsing full swagger file:', parseError);
        // Create a minimal swagger doc for testing
        const minimalSwagger = {
          openapi: '3.0.0',
          info: {
            title: 'Sports Academy API',
            version: '1.0.0',
            description: 'Basic API documentation for testing'
          },
          paths: {
            '/auth/register': {
              post: {
                summary: 'Register a new user',
                responses: {
                  '201': {
                    description: 'Registration successful'
                  }
                }
              }
            },
            '/auth/login': {
              post: {
                summary: 'Login a user',
                responses: {
                  '200': {
                    description: 'Login successful'
                  }
                }
              }
            }
          }
        };
        
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(minimalSwagger, {
          explorer: true
        }));
        console.log('Minimal Swagger documentation available for testing at /api-docs');
      }
    } else {
      console.log('No swagger files found. API docs will not be available.');
    }
  }
} catch (error) {
  console.error('Error setting up Swagger:', error);
  
  // Last resort - provide a minimal swagger doc inline
  const minimalSwagger = {
    openapi: '3.0.0',
    info: {
      title: 'Sports Academy API',
      version: '1.0.0',
      description: 'Fallback API documentation'
    },
    paths: {
      '/auth/register': {
        post: {
          summary: 'Register a new user',
          responses: {
            '201': {
              description: 'Registration successful'
            }
          }
        }
      }
    }
  };
  
  try {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(minimalSwagger, {
      explorer: true
    }));
    console.log('Fallback Swagger documentation available at /api-docs');
  } catch (swaggerError) {
    console.error('Failed to setup fallback Swagger:', swaggerError);
  }
}

// MongoDB connection test route
app.get('/api/v1/test-db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    let status;
    
    switch(dbState) {
      case 0:
        status = 'Disconnected';
        break;
      case 1:
        status = 'Connected';
        break;
      case 2:
        status = 'Connecting';
        break;
      case 3:
        status = 'Disconnecting';
        break;
      default:
        status = 'Unknown';
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        dbStatus: status,
        mongoURI: process.env.MONGO_URI.replace(/:([^:@]+)@/, ':****@'), // Hide password in response
        readyState: dbState
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const contentRoutes = require('./routes/contentRoutes');
const coachRoutes = require('./routes/coachRoutes');
const studentRoutes = require('./routes/studentRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiAssistantRoutes = require('./routes/aiAssistantRoutes');
const dietPlanRoutes = require('./routes/dietPlanRoutes');
const activityRoutes = require('./routes/activityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const sportCategoryRoutes = require('./routes/sportCategoryRoutes');

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/coaches', coachRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/ai', aiAssistantRoutes);
app.use('/api/v1/diet-plans', dietPlanRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/sport-categories', sportCategoryRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date()
  });
});

// 404 route for undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app; 