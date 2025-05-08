const SportCategory = require('../models/sportCategoryModel');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/imageUtils');

/**
 * @desc    Get all sport categories
 * @route   GET /api/v1/sport-categories
 * @access  Public
 */
exports.getAllSportCategories = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.active === 'true') {
      query.isActive = true;
    }

    const sportCategories = await SportCategory.find(query)
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: sportCategories.length,
      data: {
        sportCategories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a sport category
 * @route   POST /api/v1/sport-categories
 * @access  Private/Admin
 */
exports.createSportCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    console.log('Creating sport category with data:', JSON.stringify(categoryData, null, 2));
    
    // Handle image upload to Cloudinary
    if (categoryData.sportImage) {
      console.log('Image data received, attempting to upload to Cloudinary');
      const uploadResult = await uploadToCloudinary(categoryData.sportImage, 'sport-categories');
      
      if (uploadResult && uploadResult.secure_url) {
        console.log('Image uploaded successfully:', uploadResult.secure_url);
        categoryData.sportImage = uploadResult.secure_url;
      } else {
        console.error('Failed to upload image to Cloudinary');
        categoryData.sportImage = null;
      }
    } else {
      console.log('No image data received');
    }

    // Create the sport category
    const newSportCategory = await SportCategory.create(categoryData);
    console.log('Sport category created successfully:', newSportCategory._id);
    
    res.status(201).json({
      status: 'success',
      data: { sportCategory: newSportCategory },
    });
  } catch (error) {
    console.error('Error creating sport category:', error);
    next(error);
  }
};

/**
 * @desc    Get a single sport category
 * @route   GET /api/v1/sport-categories/:id
 * @access  Public
 */
exports.getSportCategory = async (req, res, next) => {
  try {
    const sportCategory = await SportCategory.findById(req.params.id);
    
    if (!sportCategory) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sport category not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { sportCategory },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update sport category
 * @route   PATCH /api/v1/sport-categories/:id
 * @access  Private/Admin
 */
exports.updateSportCategory = async (req, res, next) => {
  try {
    console.log('Updating sport category ID:', req.params.id);
    
    const sportCategory = await SportCategory.findById(req.params.id);
    if (!sportCategory) {
      console.log('Sport category not found with ID:', req.params.id);
      return res.status(404).json({
        status: 'fail',
        message: 'Sport category not found',
      });
    }

    const categoryData = { ...req.body };
    console.log('Update data received:', JSON.stringify(categoryData, null, 2));

    // Handle sportImage
    if (categoryData.sportImage) {
      // Check if it's a new image (not a Cloudinary URL)
      if (categoryData.sportImage.includes('base64')) {
        console.log('New image received, uploading to Cloudinary');
        
        // Delete old image if it exists
        if (sportCategory.sportImage) {
          console.log('Deleting old image:', sportCategory.sportImage);
          await deleteFromCloudinary(sportCategory.sportImage);
        }
        
        // Upload new image
        const uploadResult = await uploadToCloudinary(categoryData.sportImage, 'sport-categories');
        
        if (uploadResult && uploadResult.secure_url) {
          console.log('Image uploaded successfully:', uploadResult.secure_url);
          categoryData.sportImage = uploadResult.secure_url;
        } else {
          console.error('Failed to upload new image');
          categoryData.sportImage = sportCategory.sportImage; // Keep old image
        }
      } else {
        console.log('Keeping existing image URL');
      }
    } else if (categoryData.sportImage === null) {
      // Explicitly set to null, remove image
      console.log('Image explicitly removed');
      if (sportCategory.sportImage) {
        await deleteFromCloudinary(sportCategory.sportImage);
      }
      categoryData.sportImage = null;
    }

    const updatedSportCategory = await SportCategory.findByIdAndUpdate(req.params.id, categoryData, {
      new: true,
      runValidators: true,
    });

    console.log('Sport category updated successfully');
    res.status(200).json({
      status: 'success',
      data: { sportCategory: updatedSportCategory },
    });
  } catch (error) {
    console.error('Error updating sport category:', error);
    next(error);
  }
};

/**
 * @desc    Delete sport category
 * @route   DELETE /api/v1/sport-categories/:id
 * @access  Private/Admin
 */
exports.deleteSportCategory = async (req, res, next) => {
  try {
    const sportCategory = await SportCategory.findById(req.params.id);
    if (!sportCategory) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sport category not found',
      });
    }

    // Delete the image from Cloudinary if it exists
    if (sportCategory.sportImage) {
      await deleteFromCloudinary(sportCategory.sportImage);
    }

    await SportCategory.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
}; 