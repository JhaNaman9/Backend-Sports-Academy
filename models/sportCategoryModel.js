const mongoose = require('mongoose');
const slugify = require('slugify');

const sportCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A sport category must have a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'A sport category name must have less or equal to 50 characters'],
      minlength: [2, 'A sport category name must have more or equal to 2 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    icon: {
      type: String,
      default: 'SportsSoccer', // Default icon if not provided
    },
    sportImage: {
      type: String, // URL to the uploaded image
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Field for custom properties specific to a sport
    customFields: [
      {
        fieldName: String,
        fieldType: {
          type: String,
          enum: ['text', 'number', 'date', 'boolean', 'select'],
        },
        options: [String], // For 'select' type
        isRequired: Boolean,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create index for better query performance
sportCategorySchema.index({ slug: 1 });
sportCategorySchema.index({ name: 'text' });

// Virtual populate for related coaches
sportCategorySchema.virtual('coaches', {
  ref: 'CoachProfile',
  foreignField: 'sportsCategories',
  localField: '_id',
});

// Pre-save hook to create slug from name and capitalize first letter
sportCategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

// Add pre-update hook to update slug when name changes
sportCategorySchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.name) {
    update.slug = slugify(update.name, { lower: true });
  }
  next();
});

const SportCategory = mongoose.model('SportCategory', sportCategorySchema);

module.exports = SportCategory; 