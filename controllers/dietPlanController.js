const DietPlan = require('../models/dietPlanModel');
const User = require('../models/userModel');
const StudentProfile = require('../models/studentProfileModel');

/**
 * @desc    Get all diet plans (filtered by coach for coaches, or assigned for students)
 * @route   GET /api/v1/diet-plans
 * @access  Private/Admin
 */
exports.getAllDietPlans = async (req, res, next) => {
  try {
    let query = {};
    
    // For coaches, show only their own diet plans
    if (req.user.role === 'coach') {
      query.coach = req.user._id;
    }
    
    // For students, show only diet plans assigned to them
    if (req.user.role === 'student') {
      query.assignedStudents = req.user._id;
    }
    
    const dietPlans = await DietPlan.find(query)
      .populate('coach', 'name email')
      .populate('assignedStudents', 'name email')
      .populate('suitableFor.sportCategories', 'name');

    res.status(200).json({
      status: 'success',
      results: dietPlans.length,
      data: {
        dietPlans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a diet plan (coaches only)
 * @route   POST /api/v1/diet-plans
 * @access  Private/Coach
 */
exports.createDietPlan = async (req, res, next) => {
  try {
    // Set coach to current user if coach role
    if (req.user.role === 'coach') {
      req.body.coach = req.user._id;
    }

    const newDietPlan = await DietPlan.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        dietPlan: newDietPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single diet plan
 * @route   GET /api/v1/diet-plans/:id
 * @access  Private
 */
exports.getDietPlan = async (req, res, next) => {
  try {
    const dietPlan = await DietPlan.findById(req.params.id)
      .populate('coach', 'name email')
      .populate('assignedStudents', 'name email')
      .populate('suitableFor.sportCategories', 'name');

    if (!dietPlan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Diet plan not found'
      });
    }

    // Check permission
    if (
      req.user.role === 'student' && 
      !dietPlan.assignedStudents.some(student => student._id.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view this diet plan'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        dietPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update diet plan
 * @route   PATCH /api/v1/diet-plans/:id
 * @access  Private/Coach
 */
exports.updateDietPlan = async (req, res, next) => {
  try {
    // Get the diet plan
    const dietPlan = await DietPlan.findById(req.params.id);

    if (!dietPlan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Diet plan not found'
      });
    }

    // Check if coach owns this diet plan
    if (req.user.role === 'coach' && dietPlan.coach.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update diet plans you created'
      });
    }

    // Update the diet plan
    const updatedDietPlan = await DietPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('coach', 'name email')
      .populate('assignedStudents', 'name email')
      .populate('suitableFor.sportCategories', 'name');

    res.status(200).json({
      status: 'success',
      data: {
        dietPlan: updatedDietPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete diet plan
 * @route   DELETE /api/v1/diet-plans/:id
 * @access  Private/Coach
 */
exports.deleteDietPlan = async (req, res, next) => {
  try {
    const dietPlan = await DietPlan.findById(req.params.id);

    if (!dietPlan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Diet plan not found'
      });
    }

    // Check if coach owns this diet plan
    if (req.user.role === 'coach' && dietPlan.coach.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only delete diet plans you created'
      });
    }

    await DietPlan.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign diet plan to student(s)
 * @route   PATCH /api/v1/diet-plans/:id/assign
 * @access  Private/Coach
 */
exports.assignDietPlan = async (req, res, next) => {
  try {
    const dietPlan = await DietPlan.findById(req.params.id);

    if (!dietPlan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Diet plan not found'
      });
    }

    // Check if coach owns this diet plan
    if (req.user.role === 'coach' && dietPlan.coach.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only assign diet plans you created'
      });
    }

    // Get student IDs to assign
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of student IDs'
      });
    }

    // Check if all students exist
    const studentsCount = await User.countDocuments({
      _id: { $in: studentIds },
      role: 'student'
    });

    if (studentsCount !== studentIds.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'One or more student IDs are invalid'
      });
    }

    // Add students to assignedStudents array without duplicates
    dietPlan.assignedStudents = [...new Set([
      ...dietPlan.assignedStudents.map(id => id.toString()),
      ...studentIds
    ])];

    await dietPlan.save();

    res.status(200).json({
      status: 'success',
      message: 'Diet plan assigned successfully',
      data: {
        dietPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create personalized diet plan based on student metrics
 * @route   POST /api/v1/students/:id/diet-plan
 * @access  Private/Coach
 */
exports.createPersonalizedDietPlan = async (req, res, next) => {
  try {
    // Find student profile
    const studentProfile = await StudentProfile.findOne({ user: req.params.id })
      .populate('user', 'name email')
      .populate('sportPreferences', 'name');

    if (!studentProfile) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student profile not found'
      });
    }

    // Check if student has weight and height data
    if (!studentProfile.progressMetrics.currentWeight || !studentProfile.progressMetrics.currentHeight) {
      return res.status(400).json({
        status: 'fail',
        message: 'Student must have current weight and height data for personalized diet plan'
      });
    }

    // Create new diet plan based on student metrics
    const dietPlanData = {
      title: `Personalized Diet Plan for ${studentProfile.user.name}`,
      description: `Custom diet plan based on ${studentProfile.user.name}'s profile metrics`,
      coach: req.user._id,
      assignedStudents: [req.params.id],
      suitableFor: {
        sportCategories: studentProfile.sportPreferences.map(sport => sport._id),
        goals: req.body.goals || ['Performance improvement'],
        dietaryPreferences: req.body.dietaryPreferences || []
      },
      caloriesPerDay: calculateCalorieNeeds(studentProfile),
      ...req.body // Allow overriding with provided data
    };

    const newDietPlan = await DietPlan.create(dietPlanData);

    res.status(201).json({
      status: 'success',
      data: {
        dietPlan: newDietPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to calculate calorie needs based on student metrics
 * This is a simple implementation - in a real app this would be more sophisticated
 * @param {Object} studentProfile - Student profile with metrics
 * @returns {Number} - Estimated daily calorie needs
 */
function calculateCalorieNeeds(studentProfile) {
  const metrics = studentProfile.progressMetrics;
  let weight = metrics.currentWeight;
  let height = metrics.currentHeight;
  
  // Convert to kg/cm if needed
  if (metrics.weightUnit === 'lb') {
    weight = weight * 0.453592; // convert lb to kg
  }
  
  if (metrics.heightUnit === 'in') {
    height = height * 2.54; // convert inches to cm
  }
  
  // Simple BMR calculation using Harris-Benedict equation
  // This is a basic implementation - real app would use more factors
  const age = studentProfile.age || 25; // default to 25 if age not available
  const isMale = studentProfile.gender === 'male';
  
  let bmr;
  if (isMale) {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  // Assume highly active for athletes (activity factor 1.725)
  return Math.round(bmr * 1.725);
} 