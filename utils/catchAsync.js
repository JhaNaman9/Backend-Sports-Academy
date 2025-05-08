/**
 * Wraps async controller functions to handle errors without try-catch blocks
 * @param {Function} fn - The async controller function
 * @returns {Function} - Express middleware function with error handling
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}; 