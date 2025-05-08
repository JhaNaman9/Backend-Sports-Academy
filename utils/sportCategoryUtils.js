const SportCategory = require('../models/sportCategoryModel');

/**
 * Find sport category by name or create if it doesn't exist
 * @param {string} name - The name of the sport category 
 * @returns {Promise<Object>} - Returns the sport category document
 */
exports.findOrCreateSportCategory = async (name) => {
  try {
    // Normalize name (trim whitespace, convert to lowercase)
    const normalizedName = name.trim().toLowerCase();
    
    // First check if the category exists
    let sportCategory = await SportCategory.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });
    
    // If not found, create it
    if (!sportCategory) {
      sportCategory = await SportCategory.create({
        name: name.trim(),
        icon: 'SportsSoccer', // Default icon
        description: `${name.trim()} sport category`,
      });
    }
    
    return sportCategory;
  } catch (error) {
    console.error('Error in findOrCreateSportCategory:', error);
    throw error;
  }
};

/**
 * Process sport categories from registration
 * @param {Array|string} categories - Sport categories from registration form
 * @returns {Promise<Array>} - Returns array of sport category IDs
 */
exports.processSportCategories = async (categories) => {
  try {
    // Handle different input formats
    let categoryNames = [];
    
    if (Array.isArray(categories)) {
      // If it's already an array
      categoryNames = categories;
    } else if (typeof categories === 'string') {
      try {
        // Try to parse if it's a JSON string
        const parsed = JSON.parse(categories);
        categoryNames = Array.isArray(parsed) ? parsed : [categories];
      } catch (e) {
        // If not a valid JSON string, split by comma or treat as single value
        categoryNames = categories.includes(',') 
          ? categories.split(',').map(name => name.trim())
          : [categories];
      }
    }
    
    // Process each category name
    const sportCategoryIds = [];
    for (const name of categoryNames) {
      // Skip empty strings
      if (!name || name.trim() === '') continue;
      
      // Check if it's already a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(name)) {
        // It's likely an ObjectId, verify it exists
        const exists = await SportCategory.exists({ _id: name });
        if (exists) {
          sportCategoryIds.push(name);
          continue;
        }
      }
      
      // Otherwise treat as a name and find or create
      const category = await exports.findOrCreateSportCategory(name);
      sportCategoryIds.push(category._id);
    }
    
    return sportCategoryIds;
  } catch (error) {
    console.error('Error processing sport categories:', error);
    return []; // Return empty array on error
  }
}; 