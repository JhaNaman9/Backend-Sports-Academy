const cloudinary = require('../config/cloudinaryConfig');

/**
 * Create a placeholder image in Cloudinary if it doesn't exist already
 * This will check if the placeholder image exists in Cloudinary and create it if it doesn't
 */
const createPlaceholderImage = async () => {
  try {
    // Public ID for the placeholder image
    const placeholderPublicId = 'placeholder';
    const folder = 'defaults';
    const fullPublicId = `${folder}/${placeholderPublicId}`;
    
    console.log('Checking for placeholder image in Cloudinary...');
    
    // Try to get the image directly first
    try {
      const result = await cloudinary.api.resource(fullPublicId);
      console.log('Placeholder image exists in Cloudinary:', result.secure_url);
      return result.secure_url;
    } catch (err) {
      // Image doesn't exist, we'll create it
      console.log('Placeholder image not found, creating new one...');
    }
    
    // Simple gray placeholder image data
    // If the image doesn't exist, create a new one
    console.log('Creating placeholder image in Cloudinary...');

    // Simple gray placeholder image data
    const grayPlaceholderBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAEsASwDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//EABwQAAEEAwEAAAAAAAAAAAAAAAMBAgQREhMAIP/aAAgBAQABBQKckcMk5ycZW8VvFbxy9oM3aTY//8QAFBEBAAAAAAAAAAAAAAAAAAAAgP/aAAgBAwEBPwFA/8QAFBEBAAAAAAAAAAAAAAAAAAAAgP/aAAgBAgEBPwFA/8QAFBAAAAAAAAAAAAAAAAAAAAAAkP/aAAgBAQAGPwJI/8QAFBABAAAAAAAAAAAAAAAAAAAAsP/aAAgBAQABPyFh/9oADAMBAAIAAwAAABDzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/xAAUEQEAAAAAAAAAAAAAAAAAAACA/9oACAEDAQE/EED/xAAUEQEAAAAAAAAAAAAAAAAAAACA/9oACAECAQE/EED/xAAUEAEAAAAAAAAAAAAAAAAAAADQ/9oACAEBAAE/EGH/2Q==';
    
    // Upload the placeholder image to Cloudinary
    const result = await cloudinary.uploader.upload(grayPlaceholderBase64, {
      folder: folder,
      public_id: placeholderPublicId,
      overwrite: true
    });
    
    console.log(`Placeholder image created in Cloudinary with URL: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error('Error creating placeholder image in Cloudinary:', error);
    return null;
  }
};

// Execute immediately to create the placeholder if it doesn't exist
createPlaceholderImage().catch(console.error);

module.exports = { createPlaceholderImage }; 