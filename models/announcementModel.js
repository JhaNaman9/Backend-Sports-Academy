const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An announcement must have a title'],
      trim: true,
      maxlength: [100, 'Title must be less than 100 characters'],
    },
    content: {
      type: String,
      required: [true, 'An announcement must have content'],
      trim: true,
    },
    image: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'An announcement must have an author'],
    },
    targetAudience: {
      type: [String],
      enum: ['all', 'students', 'coaches', 'admins'],
      default: ['all'],
    },
    sportCategories: [{
      type: mongoose.Schema.ObjectId,
      ref: 'SportCategory',
    }],
    isImportant: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: Date,
    attachments: [{
      name: String,
      fileUrl: String,
      fileType: String,
    }],
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for better query performance
announcementSchema.index({ publishDate: -1 });
announcementSchema.index({ author: 1 });
announcementSchema.index({ isPublished: 1, publishDate: -1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ isImportant: 1 });
announcementSchema.index(
  { title: 'text', content: 'text', tags: 'text' },
  { name: 'announcement_text_index', weights: { title: 3, content: 2, tags: 1 } }
);

// Virtual field to check if announcement is active (current)
announcementSchema.virtual('isActive').get(function() {
  const now = new Date();
  if (!this.isPublished) return false;
  if (now < this.publishDate) return false;
  if (this.expiryDate && now > this.expiryDate) return false;
  return true;
});

// Virtual field to get time elapsed since publication
announcementSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const publishDate = new Date(this.publishDate);
  const diffTime = Math.abs(now - publishDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
});

// Populate author when the document is queried
announcementSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'author',
    select: 'name role',
  }).populate({
    path: 'sportCategories',
    select: 'name slug',
  });
  next();
});

// Query middleware to filter out unpublished announcements in most queries
announcementSchema.pre(/^find/, function(next) {
  // Skip this middleware for admin endpoints that need to see all announcements
  if (this.getQuery().includeUnpublished === true) {
    delete this.getQuery().includeUnpublished;
    return next();
  }
  
  this.find({ isPublished: true });
  this.find({
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } },
    ],
  });
  this.find({ publishDate: { $lte: new Date() } });
  
  next();
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement; 