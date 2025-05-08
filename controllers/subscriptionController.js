const SubscriptionPlan = require('../models/subscriptionPlanModel');
const Subscription = require('../models/subscriptionModel');
const Transaction = require('../models/transactionModel');
const StudentProfile = require('../models/studentProfileModel');

/**
 * @desc    Get all subscription plans
 * @route   GET /api/v1/subscriptions/plans
 * @access  Public
 */
exports.getAllPlans = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.active === 'true') {
      query.isActive = true;
    }

    const plans = await SubscriptionPlan.find(query)
      .sort({ price: 1 });

    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: {
        plans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a subscription plan
 * @route   POST /api/v1/subscriptions/plans
 * @access  Private/Admin
 */
exports.createPlan = async (req, res, next) => {
  try {
    const newPlan = await SubscriptionPlan.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        plan: newPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single subscription plan
 * @route   GET /api/v1/subscriptions/plans/:id
 * @access  Public
 */
exports.getPlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription plan not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update subscription plan
 * @route   PATCH /api/v1/subscriptions/plans/:id
 * @access  Private/Admin
 */
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription plan not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        plan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete subscription plan
 * @route   DELETE /api/v1/subscriptions/plans/:id
 * @access  Private/Admin
 */
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription plan not found'
      });
    }

    // Check if there are active subscriptions using this plan
    const activeSubscriptions = await Subscription.countDocuments({
      plan: req.params.id,
      status: 'active'
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `This plan cannot be deleted because it has ${activeSubscriptions} active subscriptions`
      });
    }

    await plan.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all subscriptions
 * @route   GET /api/v1/subscriptions
 * @access  Private/Admin
 */
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.sport) {
      query.sport = req.query.sport;
    }

    const subscriptions = await Subscription.find(query)
      .populate('student', 'user')
      .populate('plan', 'name price duration')
      .populate('sport', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: subscriptions.length,
      data: {
        subscriptions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single subscription
 * @route   GET /api/v1/subscriptions/:id
 * @access  Private
 */
exports.getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate({
        path: 'student',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('plan', 'name description price duration')
      .populate('sport', 'name description');

    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription not found'
      });
    }

    // Check permissions - admin can view any subscription, students can only view their own
    if (
      req.user.role === 'student' && 
      subscription.student.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own subscriptions'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update subscription
 * @route   PATCH /api/v1/subscriptions/:id
 * @access  Private/Admin
 */
exports.updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete subscription
 * @route   DELETE /api/v1/subscriptions/:id
 * @access  Private/Admin
 */
exports.deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription not found'
      });
    }

    // Check if there are active transactions for this subscription
    const activeTransactions = await Transaction.countDocuments({
      subscription: req.params.id,
      status: { $ne: 'refunded' }
    });

    if (activeTransactions > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `This subscription has ${activeTransactions} active transactions and cannot be deleted`
      });
    }

    await subscription.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions
 * @route   GET /api/v1/subscriptions/transactions
 * @access  Private/Admin
 */
exports.getAllTransactions = async (req, res, next) => {
  try {
    let query = {};
    
    // Add filtering options
    if (req.query.status) {
      query.status = req.query.status;
    }

    const transactions = await Transaction.find(query)
      .populate({
        path: 'subscription',
        populate: [
          { path: 'student', select: 'user' },
          { path: 'plan', select: 'name price' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: {
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single transaction
 * @route   GET /api/v1/subscriptions/transactions/:id
 * @access  Private
 */
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate({
        path: 'subscription',
        populate: [
          { 
            path: 'student',
            populate: {
              path: 'user',
              select: 'name email'
            }
          },
          { path: 'plan', select: 'name description price duration' }
        ]
      });

    if (!transaction) {
      return res.status(404).json({
        status: 'fail',
        message: 'Transaction not found'
      });
    }

    // Check permissions - admin can view any transaction, students can only view their own
    if (
      req.user.role === 'student' && 
      transaction.subscription.student.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own transactions'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a transaction for a subscription
 * @route   POST /api/v1/subscriptions/transactions/:subscriptionId
 * @access  Private
 */
exports.createTransaction = async (req, res, next) => {
  try {
    // Find the subscription
    const subscription = await Subscription.findById(req.params.subscriptionId)
      .populate('plan')
      .populate({
        path: 'student',
        populate: {
          path: 'user'
        }
      });

    if (!subscription) {
      return res.status(404).json({
        status: 'fail',
        message: 'Subscription not found'
      });
    }

    // Check permissions - admin can create any transaction, students can only create for their own subscriptions
    if (
      req.user.role === 'student' && 
      subscription.student.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only create transactions for your own subscriptions'
      });
    }

    // Set the subscription and amount in the request body
    req.body.subscription = req.params.subscriptionId;
    req.body.amount = subscription.plan.price;
    req.body.status = 'completed';
    req.body.paymentDate = new Date();

    // Create the transaction
    const transaction = await Transaction.create(req.body);

    // Update subscription status to active if needed
    if (subscription.status !== 'active') {
      subscription.status = 'active';
      await subscription.save();
    }

    res.status(201).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue report
 * @route   GET /api/v1/subscriptions/reports/revenue
 * @access  Private/Admin
 */
exports.getRevenueReport = async (req, res, next) => {
  try {
    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Aggregate the transaction data
    const report = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription',
          foreignField: '_id',
          as: 'subscriptionDetails'
        }
      },
      {
        $unwind: '$subscriptionDetails'
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscriptionDetails.plan',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      {
        $unwind: '$planDetails'
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: { $dayOfMonth: '$paymentDate' },
            planName: '$planDetails.name'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1
        }
      }
    ]);

    // Calculate totals
    const totalRevenue = report.reduce((sum, entry) => sum + entry.totalAmount, 0);
    const totalTransactions = report.reduce((sum, entry) => sum + entry.count, 0);

    res.status(200).json({
      status: 'success',
      data: {
        report,
        summary: {
          startDate,
          endDate,
          totalRevenue,
          totalTransactions
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active subscriptions report
 * @route   GET /api/v1/subscriptions/reports/active
 * @access  Private/Admin
 */
exports.getActiveSubscriptionsReport = async (req, res, next) => {
  try {
    // Aggregate subscriptions by plan and sport
    const byPlan = await Subscription.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'plan',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      {
        $unwind: '$planDetails'
      },
      {
        $group: {
          _id: '$planDetails.name',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$planDetails.price' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const bySport = await Subscription.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $lookup: {
          from: 'sportcategories',
          localField: 'sport',
          foreignField: '_id',
          as: 'sportDetails'
        }
      },
      {
        $unwind: '$sportDetails'
      },
      {
        $group: {
          _id: '$sportDetails.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get total count and revenue
    const totalActive = await Subscription.countDocuments({ status: 'active' });
    const expiringThisMonth = await Subscription.countDocuments({
      status: 'active',
      endDate: {
        $gte: new Date(),
        $lte: new Date(new Date().setMonth(new Date().getMonth() + 1))
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalActive,
        expiringThisMonth,
        byPlan,
        bySport
      }
    });
  } catch (error) {
    next(error);
  }
}; 