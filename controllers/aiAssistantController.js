/**
 * @desc    Query sports AI assistant
 * @route   POST /api/v1/ai/query
 * @access  Private
 */
exports.querySportsAssistant = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        status: 'fail',
        message: 'Query is required'
      });
    }

    // Store user query in history (mock implementation)
    const userQuery = {
      id: Date.now().toString(),
      userId: req.user.id,
      query,
      timestamp: new Date()
    };

    // Process the query (mock AI response)
    // In a real implementation, this would call an external AI service
    const response = generateSportsResponse(query);

    // Return the response
    res.status(200).json({
      status: 'success',
      data: {
        query,
        response,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent AI queries for a user
 * @route   GET /api/v1/ai/recent-queries
 * @access  Private
 */
exports.getRecentQueries = async (req, res, next) => {
  try {
    // In a real implementation, this would fetch from a database
    // Mock response for demonstration
    const recentQueries = [
      {
        id: '1',
        query: 'What are the rules of cricket?',
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: '2',
        query: 'Who won the last World Cup?',
        timestamp: new Date(Date.now() - 7200000) // 2 hours ago
      },
      {
        id: '3',
        query: 'How to improve my tennis serve?',
        timestamp: new Date(Date.now() - 86400000) // 1 day ago
      }
    ];

    res.status(200).json({
      status: 'success',
      results: recentQueries.length,
      data: {
        queries: recentQueries
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a mock response for a sports query
 * In a real app, this would call an external AI service or use a more sophisticated NLP system
 * @param {string} query - The user's query
 * @returns {string} - The generated response
 */
function generateSportsResponse(query) {
  // Simple keyword-based response generator
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('cricket') && lowerQuery.includes('rule')) {
    return `Cricket is played between two teams of eleven players each. The game is played on a rectangular field with a 22-yard pitch in the center. The main objective is to score more runs than the opposing team. Here are some basic rules:
    
    1. The batting team tries to score runs, while the fielding team tries to dismiss batsmen.
    2. A match is divided into innings, where each team takes turns batting.
    3. The bowler delivers the ball to the batsman, who tries to hit it.
    4. Runs are scored by running between wickets or hitting boundaries.
    5. A team's innings ends when ten batsmen are out or the allotted overs are completed.`;
  } 
  else if (lowerQuery.includes('football') && lowerQuery.includes('rule')) {
    return `Football (or soccer) is played between two teams of eleven players. The objective is to score goals by getting the ball into the opposing team's goal. Basic rules include:
    
    1. The game is played on a rectangular field with a goal at each end.
    2. Players may use any part of their body except hands and arms (except for throw-ins).
    3. The goalkeeper is the only player allowed to handle the ball within their penalty area.
    4. A standard match consists of two 45-minute halves.
    5. The team that scores more goals wins.`;
  }
  else if (lowerQuery.includes('tennis') && (lowerQuery.includes('improve') || lowerQuery.includes('serve'))) {
    return `To improve your tennis serve, try these techniques:
    
    1. Perfect your grip - Continental grip is recommended for serves.
    2. Work on your stance and ball toss - Consistency is key.
    3. Practice proper body rotation to generate power.
    4. Focus on follow-through to maintain control and add spin.
    5. Start slow and gradually increase your speed as technique improves.
    6. Use video analysis to identify areas for improvement.
    7. Consider working with a coach for personalized feedback.`;
  }
  else if (lowerQuery.includes('world cup')) {
    return `For the most recent FIFA World Cup (2022), Argentina won by defeating France in the final match that went to penalties after a 3-3 draw.
    
    For the Cricket World Cup (2023), Australia won by defeating India in the final match.
    
    If you're asking about a different World Cup tournament, please specify the sport and I'll provide the most recent information.`;
  }
  else {
    return `I don't have specific information about that sports query. Please try asking about:
    
    1. Sport rules (e.g., cricket, football, tennis, basketball)
    2. Training techniques and improvement tips
    3. Recent tournament results
    4. Basic sports statistics
    
    I'm constantly learning and will have more information in the future!`;
  }
} 