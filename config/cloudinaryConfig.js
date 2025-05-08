const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: 'dfc2einlx',
  api_key: '831747728647967',
  api_secret: 'ujSXH3x6f1GloPGAJloJe_X115M',
  secure: true // Use HTTPS
});

module.exports = cloudinary; 