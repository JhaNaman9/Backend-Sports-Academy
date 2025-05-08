const Announcement = require('../models/announcementModel');
const SportCategory = require('../models/sportCategoryModel');
const fs = require('fs');
const path = require('path');
const { saveBase64Image, deleteImage } = require('../utils/imageUtils');

/**
 * @desc    Get all announcements
 * @route   GET /api/v1/content/announcements
 * @access  Public
 */
exports.getAllAnnouncements = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.active === 'true') {
      query.isActive = true;
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: announcements.length,
      data: {
        announcements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create an announcement
 * @route   POST /api/v1/content/announcements
 * @access  Private/Admin
 */
exports.createAnnouncement = async (req, res, next) => {
  try {
    // Add image path if a file was uploaded
    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }

    const newAnnouncement = await Announcement.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        announcement: newAnnouncement
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single announcement
 * @route   GET /api/v1/content/announcements/:id
 * @access  Public
 */
exports.getAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Announcement not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        announcement
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update announcement
 * @route   PATCH /api/v1/content/announcements/:id
 * @access  Private/Admin
 */
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Announcement not found'
      });
    }

    // Add image path if a file was uploaded
    if (req.file) {
      // Delete old image if it exists
      if (announcement.image) {
        const oldImagePath = path.join(__dirname, '..', 'public', announcement.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      req.body.image = `/uploads/${req.file.filename}`;
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        announcement: updatedAnnouncement
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/v1/content/announcements/:id
 * @access  Private/Admin
 */
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        status: 'fail',
        message: 'Announcement not found'
      });
    }

    // Delete image if it exists
    if (announcement.image) {
      const imagePath = path.join(__dirname, '..', 'public', announcement.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await announcement.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all sports categories
 * @route   GET /api/v1/content/sports
 * @access  Public
 */
exports.getAllSportsCategories = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.active === 'true') {
      query.isActive = true;
    }

    const categories = await SportCategory.find(query)
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a sports category
 * @route   POST /api/v1/content/sports
 * @access  Private/Admin
 */
exports.createSportsCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };
    
    // Handle Base64 image
    if (categoryData.image) {
      const imagePath = await saveBase64Image(
        categoryData.image, 
        'uploads/sport-categories',
        'sport'
      );
      
      if (imagePath) {
        categoryData.image = imagePath;
      } else {
        // If image processing failed, set to null
        categoryData.image = null;
      }
    }

    const newCategory = await SportCategory.create(categoryData);

    res.status(201).json({
      status: 'success',
      data: {
        category: newCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single sports category
 * @route   GET /api/v1/content/sports/:id
 * @access  Public
 */
exports.getSportsCategory = async (req, res, next) => {
  try {
    const category = await SportCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sports category not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update sports category
 * @route   PATCH /api/v1/content/sports/:id
 * @access  Private/Admin
 */
exports.updateSportsCategory = async (req, res, next) => {
  try {
    const category = await SportCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sports category not found'
      });
    }

    const categoryData = { ...req.body };
    let oldImagePath = null;

    // Handle Base64 image
    if (categoryData.image) {
      // Check if it's a new Base64 image (not a URL)
      if (categoryData.image.includes('base64') || !categoryData.image.includes('http')) {
        // If there was an old image, mark it for deletion
        if (category.image) {
          oldImagePath = category.image;
        }
        
        // Save the new Base64 image
        const imagePath = await saveBase64Image(
          categoryData.image, 
          'uploads/sport-categories',
          'sport'
        );
        
        if (imagePath) {
          categoryData.image = imagePath;
        } else {
          // If image processing failed, keep the old image
          categoryData.image = category.image;
        }
      }
    } else if (categoryData.image === null || categoryData.image === '') {
      // If image is explicitly set to null or empty string, remove the image
      if (category.image) {
        oldImagePath = category.image;
      }
      categoryData.image = null;
    }

    const updatedCategory = await SportCategory.findByIdAndUpdate(
      req.params.id,
      categoryData,
      {
        new: true,
        runValidators: true
      }
    );

    // Delete old image if exists and a new one was uploaded
    if (oldImagePath) {
      await deleteImage(oldImagePath);
    }

    res.status(200).json({
      status: 'success',
      data: {
        category: updatedCategory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete sports category
 * @route   DELETE /api/v1/content/sports/:id
 * @access  Private/Admin
 */
exports.deleteSportsCategory = async (req, res, next) => {
  try {
    const category = await SportCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'fail',
        message: 'Sports category not found'
      });
    }

    // Delete the image if it exists
    if (category.image) {
      await deleteImage(category.image);
    }

    await category.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all policies
 * @route   GET /api/v1/content/policies
 * @access  Public
 */
exports.getAllPolicies = async (req, res, next) => {
  try {
    // For policies, we'll just return a mock response since no model exists yet
    const policies = [
      {
        id: '1',
        title: 'Terms of Service',
        content: 'These are the terms of service for the Sports Academy Platform...',
        lastUpdated: new Date()
      },
      {
        id: '2',
        title: 'Privacy Policy',
        content: 'This Privacy Policy describes how your personal information is collected...',
        lastUpdated: new Date()
      },
      {
        id: '3',
        title: 'Refund Policy',
        content: 'The following outlines our refund policy for subscriptions and services...',
        lastUpdated: new Date()
      }
    ];

    res.status(200).json({
      status: 'success',
      results: policies.length,
      data: {
        policies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a policy
 * @route   POST /api/v1/content/policies
 * @access  Private/Admin
 */
exports.createPolicy = async (req, res, next) => {
  try {
    // Mock create policy response
    const newPolicy = {
      id: Date.now().toString(),
      title: req.body.title,
      content: req.body.content,
      lastUpdated: new Date()
    };

    res.status(201).json({
      status: 'success',
      data: {
        policy: newPolicy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single policy
 * @route   GET /api/v1/content/policies/:id
 * @access  Public
 */
exports.getPolicy = async (req, res, next) => {
  try {
    // Mock get policy response
    const policy = {
      id: req.params.id,
      title: 'Terms of Service',
      content: 'These are the terms of service for the Sports Academy Platform...',
      lastUpdated: new Date()
    };

    res.status(200).json({
      status: 'success',
      data: {
        policy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update policy
 * @route   PATCH /api/v1/content/policies/:id
 * @access  Private/Admin
 */
exports.updatePolicy = async (req, res, next) => {
  try {
    // Mock update policy response
    const updatedPolicy = {
      id: req.params.id,
      title: req.body.title || 'Terms of Service',
      content: req.body.content || 'Updated terms of service...',
      lastUpdated: new Date()
    };

    res.status(200).json({
      status: 'success',
      data: {
        policy: updatedPolicy
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete policy
 * @route   DELETE /api/v1/content/policies/:id
 * @access  Private/Admin
 */
exports.deletePolicy = async (req, res, next) => {
  try {
    // Mock delete policy response
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}; 