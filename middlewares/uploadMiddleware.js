const multer = require('multer');
const path = require('path');

// Define storage destination and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Define file filter - which files to accept
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, PDF, and DOC/DOCX files are allowed.'
      ),
      false
    );
  }
};

// Create upload instances for different file types
const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
});

const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for documents
  },
});

// Default upload instance for general use
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB default limit
  },
});

// Upload middleware for specific file types
const uploadProfileImage = uploadImage.single('profileImage');
const uploadAnnouncementImage = uploadImage.single('announcementImage');
const uploadTournamentImage = uploadImage.single('tournamentImage');
const uploadExercisePlan = uploadDocument.single('exercisePlan');
const uploadTrainingSchedule = uploadDocument.single('trainingSchedule');
const uploadTournamentDoc = uploadDocument.single('tournamentDocument');

// Handle upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    }
    return res.status(400).json({
      status: 'error',
      message,
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }
  
  // No error occurred, continue
  next();
};

// Export all middleware functions
module.exports = {
  upload,
  uploadImage,
  uploadDocument,
  uploadProfileImage,
  uploadAnnouncementImage,
  uploadTournamentImage,
  uploadExercisePlan,
  uploadTrainingSchedule,
  uploadTournamentDoc,
  handleUploadError
}; 