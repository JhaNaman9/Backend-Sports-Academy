const mongoose = require('mongoose');

const dietPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A diet plan must have a title'],
      trim: true,
      maxlength: [100, 'Title must be less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    coach: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Diet plan must be created by a coach'],
    },
    targetWeight: Number,
    targetBodyFat: Number,
    caloriesPerDay: Number,
    proteinPerDay: Number,
    carbsPerDay: Number,
    fatPerDay: Number,
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months'],
        default: 'weeks',
      },
    },
    meals: [{
      name: {
        type: String,
        required: [true, 'Meal must have a name'],
      },
      time: String, // e.g. "7:00 AM"
      description: String,
      foods: [{
        name: String,
        quantity: String, // e.g. "100g" or "1 cup"
        calories: Number,
        protein: Number,
        carbs: Number, 
        fat: Number,
        notes: String,
      }],
      notes: String,
    }],
    hydration: {
      waterIntake: {
        amount: Number,
        unit: {
          type: String,
          enum: ['ml', 'liters', 'oz'],
          default: 'liters',
        },
      },
      recommendations: [String],
    },
    supplements: [{
      name: String,
      dosage: String,
      frequency: String,
      timing: String, // e.g. "Before workout", "With breakfast"
      notes: String,
    }],
    specialInstructions: [String],
    restrictions: [String], // e.g. "Gluten-free", "Dairy-free"
    suitableFor: {
      sportCategories: [{
        type: mongoose.Schema.ObjectId,
        ref: 'SportCategory',
      }],
      goals: [String], // e.g. "Weight loss", "Muscle gain", "Performance"
      dietaryPreferences: [String], // e.g. "Vegetarian", "Vegan" 
    },
    assignedStudents: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    isTemplate: {
      type: Boolean,
      default: false,
    },
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
dietPlanSchema.index({ coach: 1 });
dietPlanSchema.index({ assignedStudents: 1 });
dietPlanSchema.index({ 'suitableFor.sportCategories': 1 });

// Virtual field for total meal count
dietPlanSchema.virtual('mealCount').get(function() {
  return this.meals ? this.meals.length : 0;
});

// Virtual field for formatted daily calories
dietPlanSchema.virtual('formattedCalories').get(function() {
  return this.caloriesPerDay ? `${this.caloriesPerDay} kcal` : 'Not specified';
});

// Method to check if diet plan is suitable for a student based on profile
dietPlanSchema.methods.isSuitableFor = function(studentProfile) {
  // If no specific sport categories are set, it's suitable for all
  if (!this.suitableFor.sportCategories || this.suitableFor.sportCategories.length === 0) {
    return true;
  }
  
  // Check if student's sport preferences match with diet plan's suitable sports
  if (studentProfile.sportPreferences && studentProfile.sportPreferences.length > 0) {
    return studentProfile.sportPreferences.some(sport => 
      this.suitableFor.sportCategories.includes(sport.toString())
    );
  }
  
  return false;
};

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

module.exports = DietPlan; 