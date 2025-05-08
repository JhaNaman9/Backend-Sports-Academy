/**
 * Generic validation middleware for requests
 * Uses Joi schemas to validate request body, query parameters, or URL parameters
 */

/**
 * Validate request body using a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
exports.validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errorMessages,
      });
    }
    
    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters using a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
exports.validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation error in query parameters',
        errors: errorMessages,
      });
    }
    
    // Replace request query with validated and sanitized data
    req.query = value;
    next();
  };
};

/**
 * Validate request URL parameters using a Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @returns {Function} Express middleware function
 */
exports.validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation error in URL parameters',
        errors: errorMessages,
      });
    }
    
    // Replace request params with validated and sanitized data
    req.params = value;
    next();
  };
}; 