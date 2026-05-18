import {
  getBulkOrderStats,
  getHeadingStats,
  getInventoryStats,
  getNormalOrderStats,
  getReplacementOrderStats,
  getRevenueStats,
  getUserStats,
} from './../../helper/dashboardHelper.js';
// Utility to generate date query based on filter
const getDateFilterQuery = (timeFilter, startDate, endDate) => {
  if (startDate && endDate) {
    return {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };
  }

  const now = new Date();
  let filterDate = new Date();
  filterDate.setHours(0, 0, 0, 0);

  // Force default to 'daily' if undefined/null/empty string
  const validFilter = timeFilter || 'daily';

  switch (validFilter) {
    case 'weekly':
      filterDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      filterDate.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      filterDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'daily':
    default:
      // Default is 'daily' (Start of today), so we do nothing.
      break;
  }

  return { createdAt: { $gte: filterDate, $lte: now } };
};

export const getDashboardData = async (req, res) => {
  try {
    const filter = req.query.filter || 'daily';
    const { startDate, endDate } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'

    console.log(`Fetching dashboard data with filter: ${filter}`);

    // 1. Create the Universal Date Filter
    const dateQuery = getDateFilterQuery(filter);

    // 2. Call Helper Functions (We use Promise.allSettled for safety)
    // As you add more helpers (graphs, top sellers), add them to this array.
    const results = await Promise.allSettled([
      getHeadingStats(dateQuery),
      getUserStats(dateQuery),
      getNormalOrderStats(dateQuery, filter),
      getBulkOrderStats(dateQuery, filter),
      getReplacementOrderStats(dateQuery, filter),
      getRevenueStats(dateQuery, filter),
      getInventoryStats(dateQuery, filter),
    ]);

    // 3. Process Results
    // If the helper fails, we return default 0s instead of crashing the whole API
    const headerStats =
      results[0].status === 'fulfilled' ? results[0].value : {};
    const userStats = results[1].status === 'fulfilled' ? results[1].value : {};
    const normalOrderStats =
      results[2].status === 'fulfilled' ? results[2].value : {};
    const bulkOrderStats =
      results[3].status === 'fulfilled' ? results[3].value : {};
    const replacementStats =
      results[4].status === 'fulfilled' ? results[4].value : {};
    const revenueStats =
      results[5].status === 'fulfilled' ? results[5].value : {};
    const inventoryStats =
      results[6].status === 'fulfilled' ? results[6].value : {};

    const data = {
      stats: headerStats,
      users: userStats,
      normal_orders: normalOrderStats,
      bulk_orders: bulkOrderStats,
      replacement_orders: replacementStats,
      revenue_graph: revenueStats,
      inventory_graph: inventoryStats,
    };

    // 4. Send Final Response
    return res.status(200).json({
      success: true,
      message: 'Dashboard data fetched successfully',
      data: data,
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};
