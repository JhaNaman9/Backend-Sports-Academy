const cloudinary = require('../config/cloudinaryConfig');

/**
 * Upload an image to Cloudinary
 * @param {string} imageData - Base64 encoded image
 * @param {string} folder - Folder to upload to
 * @returns {Promise<Object>} - Cloudinary upload response or null
 */
exports.uploadToCloudinary = async (imageData, folder = 'uploads') => {
  try {
    if (!imageData) return null;
    console.log('Uploading image to Cloudinary folder:', folder);
    
    const uploadOptions = {
      folder: folder,
      resource_type: 'image'
    };

    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imageData, uploadOptions);
    console.log('Image uploaded successfully to Cloudinary:', result.secure_url);
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} imageUrl - Cloudinary image URL
 * @returns {Promise<boolean>} - Success status
 */
exports.deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return false;
    
    // Extract public ID from URL
    const publicId = this.extractPublicId(imageUrl);
    if (!publicId) return false;
    
    console.log('Deleting image from Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Get Cloudinary URL for an image
 * @param {string} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - Cloudinary URL
 */
exports.getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, options);
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID or null
 */
exports.extractPublicId = (url) => {
  try {
    if (!url || !url.includes('cloudinary.com')) return null;
    
    // Simple extraction for Cloudinary URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
      // Get everything after 'upload', potentially including version
      const afterUpload = urlParts.slice(uploadIndex + 1);
      
      // Remove version number if it exists (e.g. v1, v12345, etc.)
      let publicIdParts = afterUpload;
      if (afterUpload[0] && /^v\d+$/.test(afterUpload[0])) {
        publicIdParts = afterUpload.slice(1); // Skip the version
      }
      
      // Handle file extension if present
      const lastPartIndex = publicIdParts.length - 1;
      if (lastPartIndex >= 0) {
        const lastPart = publicIdParts[lastPartIndex];
        const dotIndex = lastPart.lastIndexOf('.');
        if (dotIndex !== -1) {
          publicIdParts[lastPartIndex] = lastPart.substring(0, dotIndex);
        }
      }
      
      return publicIdParts.join('/');
    }
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}; 