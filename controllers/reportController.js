const StudentProfile = require('../models/studentProfileModel');
const CoachProfile = require('../models/coachProfileModel');
const Subscription = require('../models/subscriptionModel');
const Transaction = require('../models/transactionModel');
const SportCategory = require('../models/sportCategoryModel');
const Tournament = require('../models/tournamentModel');
const ExerciseCompletion = require('../models/exerciseCompletionModel');
const Attendance = require('../models/attendanceModel');

/**
 * @desc    Get total students report
 * @route   GET /api/v1/reports/students/total
 * @access  Private/Admin
 */
exports.getTotalStudentsReport = async (req, res, next) => {
  try {
    // Get total students
    const totalStudents = await StudentProfile.countDocuments();

    // Get students by sport
    const studentsBySport = await StudentProfile.aggregate([
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

    // Get new students in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newStudents = await StudentProfile.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get students by age group
    const studentsByAgeGroup = await StudentProfile.aggregate([
      {
        $project: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 12] }, then: 'Under 12' },
                { case: { $and: [{ $gte: ['$age', 12] }, { $lt: ['$age', 18] }] }, then: '12-17' },
                { case: { $and: [{ $gte: ['$age', 18] }, { $lt: ['$age', 25] }] }, then: '18-24' },
                { case: { $and: [{ $gte: ['$age', 25] }, { $lt: ['$age', 35] }] }, then: '25-34' },
                { case: { $gte: ['$age', 35] }, then: '35+' }
              ],
              default: 'Unknown'
            }
          }
        }
      },
      {
        $group: {
          _id: '$ageGroup',
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalStudents,
        newStudents,
        studentsBySport,
        studentsByAgeGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student engagement report
 * @route   GET /api/v1/reports/students/engagement
 * @access  Private/Admin
 */
exports.getStudentEngagementReport = async (req, res, next) => {
  try {
    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Get daily exercise completions
    const exerciseCompletions = await ExerciseCompletion.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' }
          },
          count: { $sum: 1 },
          uniqueStudents: { $addToSet: '$student' }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          uniqueStudentsCount: { $size: '$uniqueStudents' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Get attendance data
    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          status: '$_id.status',
          count: 1
        }
      },
      {
        $sort: { date: 1, status: 1 }
      }
    ]);

    // Get most engaged students (by exercise completions)
    const mostEngagedStudents = await ExerciseCompletion.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$student',
          completionCount: { $sum: 1 },
          averageTimeSpent: { $avg: { $toDouble: '$timeSpent' } }
        }
      },
      {
        $sort: { completionCount: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'studentprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      {
        $unwind: '$studentDetails'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentDetails.user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          studentId: '$_id',
          name: '$userDetails.name',
          completionCount: 1,
          averageTimeSpent: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        exerciseCompletions,
        attendanceData,
        mostEngagedStudents
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get coach performance report
 * @route   GET /api/v1/reports/coaches/performance
 * @access  Private/Admin
 */
exports.getCoachPerformanceReport = async (req, res, next) => {
  try {
    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Get all coaches
    const coaches = await CoachProfile.find()
      .populate('user', 'name email');

    // Get student count per coach
    const studentsPerCoach = await StudentProfile.aggregate([
      {
        $group: {
          _id: '$assignedCoach',
          studentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'coachprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'coachDetails'
        }
      },
      {
        $unwind: '$coachDetails'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'coachDetails.user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          coachId: '$_id',
          name: '$userDetails.name',
          studentCount: 1
        }
      },
      {
        $sort: { studentCount: -1 }
      }
    ]);

    // Get attendance rate per coach
    const attendancePerCoach = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            coach: '$coach',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.coach',
          totalSessions: { $sum: '$count' },
          attendedSessions: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'present'] }, '$count', 0]
            }
          }
        }
      },
      {
        $project: {
          coachId: '$_id',
          totalSessions: 1,
          attendedSessions: 1,
          attendanceRate: {
            $cond: [
              { $eq: ['$totalSessions', 0] },
              0,
              { $multiply: [{ $divide: ['$attendedSessions', '$totalSessions'] }, 100] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'coachprofiles',
          localField: 'coachId',
          foreignField: '_id',
          as: 'coachDetails'
        }
      },
      {
        $unwind: '$coachDetails'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'coachDetails.user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          coachId: 1,
          name: '$userDetails.name',
          totalSessions: 1,
          attendedSessions: 1,
          attendanceRate: 1
        }
      },
      {
        $sort: { attendanceRate: -1 }
      }
    ]);

    // Get all coaches with basic stats
    const coachStats = coaches.map(coach => {
      const students = studentsPerCoach.find(item => item.coachId.toString() === coach._id.toString());
      const attendance = attendancePerCoach.find(item => item.coachId.toString() === coach._id.toString());
      
      // Update to use sportsCategories (plural) and handle multiple categories
      const sportNames = coach.sportsCategories && coach.sportsCategories.length > 0
        ? coach.sportsCategories.map(sc => sc.name).join(', ')
        : 'Not assigned';
      
      return {
        id: coach._id,
        name: coach.user.name,
        email: coach.user.email,
        sport: sportNames, // Now using the plural form correctly
        studentCount: students ? students.studentCount : 0,
        totalSessions: attendance ? attendance.totalSessions : 0,
        attendedSessions: attendance ? attendance.attendedSessions : 0,
        attendanceRate: attendance ? attendance.attendanceRate : 0
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalCoaches: coaches.length,
        coachStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active subscriptions report
 * @route   GET /api/v1/reports/subscriptions/active
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

    // Get renewal rate
    const expired = await Subscription.find({
      endDate: { $lt: new Date() },
      status: { $ne: 'renewed' }
    });
    
    const renewed = await Subscription.find({
      status: 'renewed'
    });
    
    const renewalRate = expired.length > 0 
      ? (renewed.length / (expired.length + renewed.length)) * 100 
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalActive,
        expiringThisMonth,
        renewalRate,
        byPlan,
        bySport
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue report
 * @route   GET /api/v1/reports/subscriptions/revenue
 * @access  Private/Admin
 */
exports.getRevenueReport = async (req, res, next) => {
  try {
    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Aggregate the transaction data by day
    const dailyRevenue = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' },
            day: { $dayOfMonth: '$paymentDate' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalAmount: 1,
          count: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Aggregate by plan type
    const revenueByPlan = await Transaction.aggregate([
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
          _id: '$planDetails.name',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Calculate totals
    const totalRevenue = dailyRevenue.reduce((sum, entry) => sum + entry.totalAmount, 0);
    const totalTransactions = dailyRevenue.reduce((sum, entry) => sum + entry.count, 0);

    res.status(200).json({
      status: 'success',
      data: {
        totalRevenue,
        totalTransactions,
        dailyRevenue,
        revenueByPlan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get sports popularity report
 * @route   GET /api/v1/reports/sports/popularity
 * @access  Private/Admin
 */
exports.getSportsPopularityReport = async (req, res, next) => {
  try {
    // Get all sport categories
    const allSports = await SportCategory.find();
    
    // Get students per sport
    const studentsBySport = await StudentProfile.aggregate([
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
          _id: '$sportDetails._id',
          sportName: { $first: '$sportDetails.name' },
          studentCount: { $sum: 1 }
        }
      },
      {
        $sort: { studentCount: -1 }
      }
    ]);

    // Get subscriptions per sport
    const subscriptionsBySport = await Subscription.aggregate([
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
          _id: '$sportDetails._id',
          sportName: { $first: '$sportDetails.name' },
          subscriptionCount: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { subscriptionCount: -1 }
      }
    ]);

    // Get tournaments per sport
    const tournamentsBySport = await Tournament.aggregate([
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
          _id: '$sportDetails._id',
          sportName: { $first: '$sportDetails.name' },
          tournamentCount: { $sum: 1 },
          participantsCount: { $sum: { $size: '$participants' } }
        }
      },
      {
        $sort: { tournamentCount: -1 }
      }
    ]);

    // Combine all data
    const sportsPopularity = allSports.map(sport => {
      const students = studentsBySport.find(
        item => item._id.toString() === sport._id.toString()
      );
      
      const subscriptions = subscriptionsBySport.find(
        item => item._id.toString() === sport._id.toString()
      );
      
      const tournaments = tournamentsBySport.find(
        item => item._id.toString() === sport._id.toString()
      );

      return {
        id: sport._id,
        name: sport.name,
        studentCount: students ? students.studentCount : 0,
        subscriptionCount: subscriptions ? subscriptions.subscriptionCount : 0,
        revenue: subscriptions ? subscriptions.revenue : 0,
        tournamentCount: tournaments ? tournaments.tournamentCount : 0,
        participantsCount: tournaments ? tournaments.participantsCount : 0
      };
    });

    // Sort by student count
    sportsPopularity.sort((a, b) => b.studentCount - a.studentCount);

    res.status(200).json({
      status: 'success',
      data: {
        sportsPopularity
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get tournament participation report
 * @route   GET /api/v1/reports/tournaments/participation
 * @access  Private/Admin
 */
exports.getTournamentParticipationReport = async (req, res, next) => {
  try {
    // Get all tournaments
    const tournaments = await Tournament.find()
      .populate('sport', 'name')
      .sort({ startDate: -1 });

    // Get participation stats
    const participationStats = await Tournament.aggregate([
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
          _id: '$sportDetails._id',
          sportName: { $first: '$sportDetails.name' },
          tournamentCount: { $sum: 1 },
          totalParticipants: { $sum: { $size: '$participants' } }
        }
      },
      {
        $sort: { totalParticipants: -1 }
      }
    ]);

    // Get average participants per tournament
    const totalTournaments = tournaments.length;
    const totalParticipants = tournaments.reduce(
      (sum, tournament) => sum + tournament.participants.length,
      0
    );
    const averageParticipants = totalTournaments > 0 
      ? totalParticipants / totalTournaments 
      : 0;

    // Get tournaments with highest participation
    const topTournaments = [...tournaments]
      .sort((a, b) => b.participants.length - a.participants.length)
      .slice(0, 5)
      .map(tournament => ({
        id: tournament._id,
        name: tournament.name,
        sport: tournament.sport ? tournament.sport.name : 'Unknown',
        startDate: tournament.startDate,
        participantsCount: tournament.participants.length
      }));

    res.status(200).json({
      status: 'success',
      data: {
        totalTournaments,
        totalParticipants,
        averageParticipants,
        participationStats,
        topTournaments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard summary data
 * @route   GET /api/v1/reports/dashboard/summary
 * @access  Private/Admin
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    // Get total counts
    const totalStudents = await StudentProfile.countDocuments();
    const totalCoaches = await CoachProfile.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const upcomingTournaments = await Tournament.countDocuments({
      startDate: { $gte: new Date() }
    });

    // Get new students in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newStudents = await StudentProfile.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get revenue for the last 30 days
    const revenueLastMonth = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = revenueLastMonth.length > 0 ? revenueLastMonth[0].total : 0;

    // Get most popular sports
    const popularSports = await StudentProfile.aggregate([
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
          _id: '$sportDetails._id',
          name: { $first: '$sportDetails.name' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalStudents,
        totalCoaches,
        activeSubscriptions,
        upcomingTournaments,
        newStudents,
        totalRevenue,
        popularSports
      }
    });
  } catch (error) {
    next(error);
  }
}; 