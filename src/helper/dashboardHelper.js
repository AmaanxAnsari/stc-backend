import { User } from './../models/app/user.js';
import AppOrder from './../models/admin/AppOrderModel.js';
import AdminInventory from './../models/admin/InventoryModel.js';
import BulkOrder from './../models/admin/BulkOrderModel.js';
import ReplacementRequest from './../models/admin/ReplacementOrderModel.js';
import SpotOrder from './../models/admin/SpotOrderModel.js';

/**
 * Helper to fetch the 4 main KPI cards: Users, Inventory, Revenue, Orders
 * @param {Object} dateQuery - The MongoDB date filter (e.g., { createdAt: { $gte: ... } })
 */
export const getHeadingStats = async (dateQuery) => {
  try {
    // --- 1. COUNT QUERIES (Users, Inventory, Order Counts) ---
    const usersPromise = User.countDocuments(dateQuery);
    const inventoryPromise = AdminInventory.countDocuments({
      status: 'in_stock',
    });

    const normalCountPromise = AppOrder.countDocuments(dateQuery);
    const bulkCountPromise = BulkOrder.countDocuments(dateQuery);
    const replacementCountPromise =
      ReplacementRequest.countDocuments(dateQuery);
    const spotCountPromise = SpotOrder.countDocuments(dateQuery);

    // --- 2. REVENUE QUERIES (For Normal, Bulk, Spot) ---
    // Helper to create the aggregation pipeline for any Order Model
    const getRevenuePipeline = (model) => {
      return model.aggregate([
        {
          $match: {
            ...dateQuery,
            status: 'delivered', // Only counts delivered orders
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }, // Ensure field name is 'totalAmount' in all models
          },
        },
      ]);
    };

    const normalRevPromise = getRevenuePipeline(AppOrder);
    const bulkRevPromise = getRevenuePipeline(BulkOrder);
    const spotRevPromise = getRevenuePipeline(SpotOrder);
    // Note: ReplacementRequest usually doesn't generate revenue (it's a loss/neutral), so skipping it.

    // --- 3. EXECUTE ALL IN PARALLEL ---
    const [
      users,
      inventory,
      normalCount,
      bulkCount,
      replacementCount,
      spotCount,
      normalRevResult,
      bulkRevResult,
      spotRevResult,
    ] = await Promise.all([
      usersPromise,
      inventoryPromise,
      normalCountPromise,
      bulkCountPromise,
      replacementCountPromise,
      spotCountPromise,
      normalRevPromise,
      bulkRevPromise,
      spotRevPromise,
    ]);

    // --- 4. CALCULATE TOTALS ---
    const totalOrders = normalCount + bulkCount + replacementCount + spotCount;

    // Helper to safely extract number from aggregate result
    const extractRev = (res) => (res.length > 0 ? res[0].totalRevenue : 0);

    const totalRevenue =
      extractRev(normalRevResult) +
      extractRev(bulkRevResult) +
      extractRev(spotRevResult);

    return {
      users,
      inventory,
      revenue: totalRevenue, // Grand Total of Normal + Bulk + Spot
      orders: totalOrders,
    };
  } catch (error) {
    console.error('Error in getHeadingStats:', error);
    throw error;
  }
};

/**
 * Advanced Helper to fetch User Stats combining App, Bulk, and Spot orders.
 */
export const getUserStats = async (dateQuery) => {
  try {
    console.log('--- getUserStats START (Advanced) ---');

    // 1. Define Roles & Counts (Same as before)
    const roles = [
      'consumer',
      'retailer',
      'wholesaler',
      'distributor',
      'super_stocker',
      'delivery_officer',
    ];
    const countPromises = roles.map((role) =>
      User.countDocuments({
        role: role,
        isActive: true,
        isDeleted: false,
        ...dateQuery,
      }),
    );

    // --- 2. AGGREGATION PIPELINES ---

    // A. App Order Pipeline (Standard)
    // Matches createdByRole
    const getAppOrderStats = () => {
      return AppOrder.aggregate([
        {
          $match: {
            ...dateQuery,
            status: 'delivered', // Only completed orders
            createdByRole: { $in: roles }, // Fetch all relevant roles
          },
        },
        {
          $group: {
            _id: {
              userId: '$createdBy',
              role: '$createdByRole', // Group by Role too so we know where to put them
            },
            totalValue: { $sum: '$totalAmount' },
          },
        },
      ]);
    };

    // B. Bulk Order Pipeline
    // Matches createdByRole (Only for Ret/Whole/Dist/Super)
    const getBulkOrderStats = () => {
      const bulkRoles = [
        'retailer',
        'wholesaler',
        'distributor',
        'super_stocker',
      ];
      return BulkOrder.aggregate([
        {
          $match: {
            ...dateQuery,
            status: 'delivered',
            createdByRole: { $in: bulkRoles },
          },
        },
        {
          $group: {
            _id: {
              userId: '$createdBy',
              role: '$createdByRole',
            },
            totalValue: { $sum: '$totalAmount' },
          },
        },
      ]);
    };

    // C. Spot Order Pipeline (Delivery Officers ONLY)
    // Uses 'driverId' instead of 'createdBy'
    const getSpotOrderStats = () => {
      return SpotOrder.aggregate([
        {
          $match: {
            ...dateQuery,
            status: 'delivered',
          },
        },
        {
          $group: {
            _id: {
              userId: '$driverId', // Use driverId here!
              role: 'delivery_officer', // Hardcode role since Spot is only for drivers
            },
            totalValue: { $sum: '$totalAmount' },
          },
        },
      ]);
    };

    // --- 3. EXECUTE ALL ---
    const [countsResult, appResults, bulkResults, spotResults] =
      await Promise.all([
        Promise.all(countPromises),
        getAppOrderStats(),
        getBulkOrderStats(),
        getSpotOrderStats(),
      ]);

    // --- 4. MERGE LOGIC (The "Combiner") ---

    // We use a Map to merge totals:  "userId" -> { totalValue, role }
    // If a retailer has ₹100 in App and ₹500 in Bulk, they become ₹600.
    const mergedData = {};

    // Helper to merge
    const mergeIntoMap = (results) => {
      results.forEach((item) => {
        // Safety check for null IDs
        if (!item._id?.userId) return;

        const userId = item._id.userId.toString();
        const role = item._id.role;
        const amount = item.totalValue;

        if (!mergedData[userId]) {
          mergedData[userId] = { role, totalValue: 0, _id: item._id.userId };
        }
        mergedData[userId].totalValue += amount;
      });
    };

    // Merge all 3 sources
    mergeIntoMap(appResults);
    mergeIntoMap(bulkResults);
    mergeIntoMap(spotResults);

    // --- 5. FETCH NAMES ---
    const allUserIds = Object.keys(mergedData);

    const usersDetails = await User.find({ _id: { $in: allUserIds } })
      .select('fullName')
      .lean();

    const nameMap = {};
    usersDetails.forEach((u) => {
      nameMap[u._id.toString()] = u.fullName;
    });

    // --- 6. SORT & FORMAT ---
    const topLists = {
      consumer: [],
      retailer: [],
      wholesaler: [],
      distributor: [],
      super_stocker: [],
      delivery_officer: [],
    };

    // Convert merged map to array and sort
    Object.values(mergedData).forEach((user) => {
      if (topLists[user.role]) {
        topLists[user.role].push({
          _id: user._id,
          name: nameMap[user._id.toString()] || 'Unknown User',
          totalValue: user.totalValue,
        });
      }
    });

    // Sort each list DESC and take top 5
    Object.keys(topLists).forEach((role) => {
      topLists[role].sort((a, b) => b.totalValue - a.totalValue); // Highest first
      topLists[role] = topLists[role].slice(0, 5); // Keep Top 5
    });

    // Format Counts
    const counts = {};
    roles.forEach((role, index) => {
      counts[role] = countsResult[index];
    });

    console.log('--- getUserStats END ---');
    return {
      counts,
      topLists,
    };
  } catch (error) {
    console.error('Error in getUserStats:', error);
    throw error;
  }
};


// export const getNormalOrderStats = async (dateQuery, filter = 'daily') => {
//   try {
//     console.log(`--- getNormalOrderStats START (Filter: ${filter}) ---`);

//     // --- PART 1: STATUS COUNTS (For Cards) ---
//     // These always run because cards need total counts for the selected period
//     const statusPromises = [
//       AppOrder.countDocuments({ ...dateQuery, status: 'pending' }),
//       AppOrder.countDocuments({ ...dateQuery, status: 'out_for_delivery' }),
//       AppOrder.countDocuments({ ...dateQuery, status: 'delivered' }),
//       AppOrder.countDocuments({ ...dateQuery, status: 'cancelled' }),
//     ];

//     // --- PART 2: GRAPH DATA (Conditional) ---
//     let graphResult = null;
//     let categories = [];
//     let lookupMap = null;

//     // A. Daily: 4-Hour Intervals
//     if (filter === 'daily') {
//       const startOfToday = new Date();
//       startOfToday.setHours(0, 0, 0, 0);
//       graphResult = await AppOrder.aggregate([
//         { $match: { createdAt: { $gte: startOfToday } } },
//         {
//           $group: {
//             _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
//             pending: {
//               $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
//             },
//             outForDelivery: {
//               $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
//             },
//             delivered: {
//               $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
//             },
//             cancelled: {
//               $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
//             },
//           },
//         },
//       ]);
//       categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
//       lookupMap = {
//         0: '00:00',
//         1: '04:00',
//         2: '08:00',
//         3: '12:00',
//         4: '16:00',
//         5: '20:00',
//       };
//     }

//     // B. Weekly: Day Names
//     else if (filter === 'weekly') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       graphResult = await AppOrder.aggregate([
//         { $match: { createdAt: { $gte: sevenDaysAgo } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%w', date: '$createdAt' } },
//             delivered: {
//               $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
//             },
//             cancelled: {
//               $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
//             },
//             pending: {
//               $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
//             },
//             outForDelivery: {
//               $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
//             },
//           },
//         },
//       ]);
//       categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//       lookupMap = {
//         1: 'Sun',
//         2: 'Mon',
//         3: 'Tue',
//         4: 'Wed',
//         5: 'Thu',
//         6: 'Fri',
//         7: 'Sat',
//       };
//     }

//     // C. Monthly: Month Names
//     else if (filter === 'monthly') {
//       const startOfYear = new Date(new Date().getFullYear(), 0, 1);
//       graphResult = await AppOrder.aggregate([
//         { $match: { createdAt: { $gte: startOfYear } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%m', date: '$createdAt' } },
//             delivered: {
//               $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
//             },
//             cancelled: {
//               $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
//             },
//             pending: {
//               $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
//             },
//             outForDelivery: {
//               $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
//             },
//           },
//         },
//       ]);
//       categories = [
//         'Jan',
//         'Feb',
//         'Mar',
//         'Apr',
//         'May',
//         'Jun',
//         'Jul',
//         'Aug',
//         'Sep',
//         'Oct',
//         'Nov',
//         'Dec',
//       ];
//       lookupMap = {
//         '01': 'Jan',
//         '02': 'Feb',
//         '03': 'Mar',
//         '04': 'Apr',
//         '05': 'May',
//         '06': 'Jun',
//         '07': 'Jul',
//         '08': 'Aug',
//         '09': 'Sep',
//         10: 'Oct',
//         11: 'Nov',
//         12: 'Dec',
//       };
//     }

//     // D. Yearly: Year Numbers
//     else if (filter === 'yearly') {
//       graphResult = await AppOrder.aggregate([
//         {
//           $group: {
//             _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
//             delivered: {
//               $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
//             },
//             cancelled: {
//               $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
//             },
//             pending: {
//               $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
//             },
//             outForDelivery: {
//               $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
//             },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]);
//       categories = graphResult.map((y) => y._id); // Dynamic
//       lookupMap = null; // Use ID directly
//     }

//     // --- EXECUTE STATUS COUNTS ---
//     const [pending, outForDelivery, delivered, cancelled] =
//       await Promise.all(statusPromises);

//     // --- FORMAT GRAPH ---
//     const formatGraph = (rawData, cats, map) => {
//       const dataMap = {};
//       rawData.forEach((item) => {
//         const key = map ? map[item._id] : item._id;
//         if (key) dataMap[key] = item;
//       });

//       const deliveredData = [];
//       const cancelledData = [];
//       const outForDeliveryData = [];
//       const pendingData = [];

//       cats.forEach((cat) => {
//         const item = dataMap[cat] || {
//           delivered: 0,
//           cancelled: 0,
//           pending: 0,
//           outForDelivery: 0,
//         };
//         deliveredData.push(item.delivered);
//         cancelledData.push(item.cancelled);
//         outForDeliveryData.push(item.outForDelivery);
//         pendingData.push(item.pending);
//       });

//       return {
//         categories: cats,
//         series: [
//           { name: 'Pending', data: pendingData },
//           { name: 'Out for Delivery', data: outForDeliveryData },
//           { name: 'Delivered', data: deliveredData },
//           { name: 'Cancelled', data: cancelledData },
//         ],
//       };
//     };

//     const finalGraphData = formatGraph(
//       graphResult || [],
//       categories,
//       lookupMap,
//     );

//     console.log('--- getNormalOrderStats END ---');

//     // Structure response so Frontend finds data under [filter] key
//     // e.g. normal_orders.daily or normal_orders.weekly
//     return {
//       cards: {
//         pending,
//         out_for_delivery: outForDelivery,
//         delivered,
//         cancelled,
//       },
//       graph: {
//         'normal_orders': {
//           [filter]: finalGraphData, // Only populate the requested key!
//         },
//       },
//     };
//   } catch (error) {
//     console.error('Error in getNormalOrderStats:', error);
//     throw error;
//   }
// };

export const getNormalOrderStats = async (dateQuery, filter = 'daily') => {
  try {
    console.log(`--- getNormalOrderStats START (Filter: ${filter}) ---`);

    // --- PART 1: STATUS COUNTS (For Cards) ---
    const statusPromises = [
      AppOrder.countDocuments({ ...dateQuery, status: 'pending' }),
      AppOrder.countDocuments({ ...dateQuery, status: 'out_for_delivery' }),
      AppOrder.countDocuments({ ...dateQuery, status: 'delivered' }),
      AppOrder.countDocuments({ ...dateQuery, status: 'cancelled' }),
    ];

    // --- PART 2: GRAPH DATA (Conditional) ---
    let graphResult = null;
    let categories = [];
    let lookupMap = null;

    // A. Daily: 4-Hour Intervals
    if (filter === 'daily') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      graphResult = await AppOrder.aggregate([
        { $match: { createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            outForDelivery: {
              $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
            },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
          },
        },
      ]);
      categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      lookupMap = {
        0: '00:00',
        1: '04:00',
        2: '08:00',
        3: '12:00',
        4: '16:00',
        5: '20:00',
      };
    }

    // B. Weekly: Day Names
    else if (filter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      graphResult = await AppOrder.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%w', date: '$createdAt' } },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            outForDelivery: {
              $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
            },
          },
        },
      ]);
      categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      lookupMap = {
        1: 'Sun',
        2: 'Mon',
        3: 'Tue',
        4: 'Wed',
        5: 'Thu',
        6: 'Fri',
        7: 'Sat',
      };
    }

    // C. Monthly: Month Names
    else if (filter === 'monthly') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      graphResult = await AppOrder.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $group: {
            _id: { $dateToString: { format: '%m', date: '$createdAt' } },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            outForDelivery: {
              $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
            },
          },
        },
      ]);
      categories = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      lookupMap = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Aug',
        '09': 'Sep',
        10: 'Oct',
        11: 'Nov',
        12: 'Dec',
      };
    }

    // D. Yearly: Year Numbers (FIXED)
    else if (filter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(currentYear - 4); // Range: Current-4 to Current (5 years total)

      graphResult = await AppOrder.aggregate([
        {
          $match: { createdAt: { $gte: fiveYearsAgo } },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            outForDelivery: {
              $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // EXPLICIT CATEGORIES: [ "2021", "2022", "2023", "2024", "2025" ]
      categories = [
        (currentYear - 4).toString(),
        (currentYear - 3).toString(),
        (currentYear - 2).toString(),
        (currentYear - 1).toString(),
        currentYear.toString(),
      ];
      lookupMap = null;
    }

    // --- EXECUTE STATUS COUNTS ---
    const [pending, outForDelivery, delivered, cancelled] =
      await Promise.all(statusPromises);

    // --- FORMAT GRAPH ---
    const formatGraph = (rawData, cats, map) => {
      const dataMap = {};
      rawData.forEach((item) => {
        const key = map ? map[item._id] : item._id;
        if (key) dataMap[key] = item;
      });

      const deliveredData = [];
      const cancelledData = [];
      const outForDeliveryData = [];
      const pendingData = [];

      cats.forEach((cat) => {
        const item = dataMap[cat] || {
          delivered: 0,
          cancelled: 0,
          pending: 0,
          outForDelivery: 0,
        };
        deliveredData.push(item.delivered);
        cancelledData.push(item.cancelled);
        outForDeliveryData.push(item.outForDelivery);
        pendingData.push(item.pending);
      });

      return {
        categories: cats,
        series: [
          { name: 'Pending', data: pendingData },
          { name: 'Out for Delivery', data: outForDeliveryData },
          { name: 'Delivered', data: deliveredData },
          { name: 'Cancelled', data: cancelledData },
        ],
      };
    };

    // REMOVED: categories = graphResult.map(...) - This dynamic overwrite is gone now.

    const finalGraphData = formatGraph(
      graphResult || [],
      categories,
      lookupMap,
    );

    console.log('--- getNormalOrderStats END ---');

    return {
      cards: {
        pending,
        out_for_delivery: outForDelivery,
        delivered,
        cancelled,
      },
      graph: {
        normal_orders: {
          [filter]: finalGraphData,
        },
      },
    };
  } catch (error) {
    console.error('Error in getNormalOrderStats:', error);
    throw error;
  }
};


/**
 * Helper to fetch Bulk Order Stats.
 * Structure matches getNormalOrderStats exactly.
 */
// export const getBulkOrderStats = async (dateQuery, filter = 'daily') => {
//   try {
//     console.log(`--- getBulkOrderStats START (Filter: ${filter}) ---`);

//     // --- PART 1: STATUS COUNTS (For Cards) ---
//     const statusPromises = [
//       BulkOrder.countDocuments({ ...dateQuery, status: 'pending' }),
//       BulkOrder.countDocuments({ ...dateQuery, status: 'out_for_delivery' }),
//       BulkOrder.countDocuments({ ...dateQuery, status: 'delivered' }),
//       BulkOrder.countDocuments({ ...dateQuery, status: 'cancelled' }),
//     ];

//     // --- PART 2: GRAPH DATA (Conditional) ---
//     let graphResult = null;
//     let categories = [];
//     let lookupMap = null;

//     // A. Daily
//     if (filter === 'daily') {
//       const startOfToday = new Date();
//       startOfToday.setHours(0, 0, 0, 0);
//       graphResult = await BulkOrder.aggregate([
//         { $match: { createdAt: { $gte: startOfToday } } },
//         {
//           $group: {
//             _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
//       lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
//     }

//     // B. Weekly
//     else if (filter === 'weekly') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       graphResult = await BulkOrder.aggregate([
//         { $match: { createdAt: { $gte: sevenDaysAgo } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%w', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//       lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
//     }

//     // C. Monthly
//     else if (filter === 'monthly') {
//       const startOfYear = new Date(new Date().getFullYear(), 0, 1);
//       graphResult = await BulkOrder.aggregate([
//         { $match: { createdAt: { $gte: startOfYear } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%m', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//       lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
//     }

//     // D. Yearly
//     else if (filter === 'yearly') {
//       graphResult = await BulkOrder.aggregate([
//         {
//           $group: {
//             _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]);
//       categories = graphResult.map((y) => y._id);
//       lookupMap = null;
//     }

//     // --- EXECUTE STATUS COUNTS ---
//     const [pending, outForDelivery, delivered, cancelled] = await Promise.all(statusPromises);

//     // --- FORMAT GRAPH ---
//     const formatGraph = (rawData, cats, map) => {
//       const dataMap = {};
//       rawData.forEach((item) => {
//         const key = map ? map[item._id] : item._id;
//         if (key) dataMap[key] = item;
//       });

//       const deliveredData = [];
//       const cancelledData = [];
//       const outForDeliveryData = [];
//       const pendingData = [];

//       cats.forEach((cat) => {
//         const item = dataMap[cat] || { delivered: 0, cancelled: 0, pending: 0, outForDelivery: 0 };
//         deliveredData.push(item.delivered);
//         cancelledData.push(item.cancelled);
//         outForDeliveryData.push(item.outForDelivery);
//         pendingData.push(item.pending);
//       });

//       return {
//         categories: cats,
//         series: [
//           { name: 'Pending', data: pendingData },
//           { name: 'Out for Delivery', data: outForDeliveryData },
//           { name: 'Delivered', data: deliveredData },
//           { name: 'Cancelled', data: cancelledData },
//         ],
//       };
//     };

//     const finalGraphData = formatGraph(graphResult || [], categories, lookupMap);

//     // Structure response for UI (using key "bulk orders")
//     const emptyPlaceholder = { categories: [], series: [] };
//     const graphResponse = {
//       [filter]: finalGraphData, // Populate only active
//     };
//     // const graphResponse = {
//     //   daily: emptyPlaceholder,
//     //   weekly: emptyPlaceholder,
//     //   monthly: emptyPlaceholder,
//     //   yearly: emptyPlaceholder,
//     //   [filter]: finalGraphData, // Populate only active
//     // };

//     console.log('--- getBulkOrderStats END ---');
    
//     return {
//       cards: {
//         pending,
//         out_for_delivery: outForDelivery,
//         delivered,
//         cancelled,
//       },
//       graph: {
//         'bulk_orders': graphResponse, // <--- Correct Key
//       },
//     };

//   } catch (error) {
//     console.error('Error in getBulkOrderStats:', error);
//     throw error;
//   }
// };


/**
 * Helper to fetch Bulk Order Stats.
 * Structure matches getNormalOrderStats exactly.
 */
export const getBulkOrderStats = async (dateQuery, filter = 'daily') => {
  try {
    console.log(`--- getBulkOrderStats START (Filter: ${filter}) ---`);

    // --- PART 1: STATUS COUNTS (For Cards) ---
    const statusPromises = [
      BulkOrder.countDocuments({ ...dateQuery, status: 'pending' }),
      BulkOrder.countDocuments({ ...dateQuery, status: 'out_for_delivery' }),
      BulkOrder.countDocuments({ ...dateQuery, status: 'delivered' }),
      BulkOrder.countDocuments({ ...dateQuery, status: 'cancelled' }),
    ];

    // --- PART 2: GRAPH DATA (Conditional) ---
    let graphResult = null;
    let categories = [];
    let lookupMap = null;

    // A. Daily
    if (filter === 'daily') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      graphResult = await BulkOrder.aggregate([
        { $match: { createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
    }

    // B. Weekly
    else if (filter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      graphResult = await BulkOrder.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%w', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    }

    // C. Monthly
    else if (filter === 'monthly') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      graphResult = await BulkOrder.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $group: {
            _id: { $dateToString: { format: '%m', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
    }

    // D. Yearly (FIXED)
    else if (filter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(currentYear - 4); // 5-year range

      graphResult = await BulkOrder.aggregate([
        {
          $match: { createdAt: { $gte: fiveYearsAgo } } // Ensure match uses 5-year range
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      // Explicitly set 5 years
      categories = [
        (currentYear - 4).toString(),
        (currentYear - 3).toString(),
        (currentYear - 2).toString(),
        (currentYear - 1).toString(),
        currentYear.toString()
      ];
      lookupMap = null;
    }

    // --- EXECUTE STATUS COUNTS ---
    const [pending, outForDelivery, delivered, cancelled] = await Promise.all(statusPromises);

    // --- FORMAT GRAPH ---
    const formatGraph = (rawData, cats, map) => {
      const dataMap = {};
      rawData.forEach((item) => {
        const key = map ? map[item._id] : item._id;
        if (key) dataMap[key] = item;
      });

      const deliveredData = [];
      const cancelledData = [];
      const outForDeliveryData = [];
      const pendingData = [];

      cats.forEach((cat) => {
        const item = dataMap[cat] || { delivered: 0, cancelled: 0, pending: 0, outForDelivery: 0 };
        deliveredData.push(item.delivered);
        cancelledData.push(item.cancelled);
        outForDeliveryData.push(item.outForDelivery);
        pendingData.push(item.pending);
      });

      return {
        categories: cats,
        series: [
          { name: 'Pending', data: pendingData },
          { name: 'Out for Delivery', data: outForDeliveryData },
          { name: 'Delivered', data: deliveredData },
          { name: 'Cancelled', data: cancelledData },
        ],
      };
    };

    // Removed the dynamic categories overwrite logic
    const finalGraphData = formatGraph(graphResult || [], categories, lookupMap);

    // Structure response for UI (using key "bulk_orders")
    const graphResponse = {
      [filter]: finalGraphData, // Populate only active
    };

    console.log('--- getBulkOrderStats END ---');
    
    return {
      cards: {
        pending,
        out_for_delivery: outForDelivery,
        delivered,
        cancelled,
      },
      graph: {
        'bulk_orders': graphResponse, 
      },
    };

  } catch (error) {
    console.error('Error in getBulkOrderStats:', error);
    throw error;
  }
};

/**
 * Helper to fetch Replacement Request Stats.
 * Structure matches getNormalOrderStats exactly.
 */
// export const getReplacementOrderStats = async (dateQuery, filter = 'daily') => {
//   try {
//     console.log(`--- getReplacementOrderStats START (Filter: ${filter}) ---`);

//     // --- PART 1: STATUS COUNTS (For Cards) ---
//     // Note: 'out_for_delivery' OR 'dispatched' both count towards the "Out for Delivery" card
//     const statusPromises = [
//       ReplacementRequest.countDocuments({ ...dateQuery, status: 'pending' }),
//       ReplacementRequest.countDocuments({ 
//           ...dateQuery, 
//           status: { $in: ['out_for_delivery', 'dispatched'] } 
//       }),
//       ReplacementRequest.countDocuments({ ...dateQuery, status: 'delivered' }),
//       ReplacementRequest.countDocuments({ ...dateQuery, status: 'cancelled' }),
//     ];

//     // --- PART 2: GRAPH DATA (Conditional) ---
//     let graphResult = null;
//     let categories = [];
//     let lookupMap = null;

//     // A. Daily
//     if (filter === 'daily') {
//       const startOfToday = new Date();
//       startOfToday.setHours(0, 0, 0, 0);
//       graphResult = await ReplacementRequest.aggregate([
//         { $match: { createdAt: { $gte: startOfToday } } },
//         {
//           $group: {
//             _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { 
//                 $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
//             },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
//       lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
//     }

//     // B. Weekly
//     else if (filter === 'weekly') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       graphResult = await ReplacementRequest.aggregate([
//         { $match: { createdAt: { $gte: sevenDaysAgo } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%w', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { 
//                 $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
//             },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//       lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
//     }

//     // C. Monthly
//     else if (filter === 'monthly') {
//       const startOfYear = new Date(new Date().getFullYear(), 0, 1);
//       graphResult = await ReplacementRequest.aggregate([
//         { $match: { createdAt: { $gte: startOfYear } } },
//         {
//           $group: {
//             _id: { $dateToString: { format: '%m', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { 
//                 $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
//             },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//       ]);
//       categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//       lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
//     }

//     // D. Yearly
//     else if (filter === 'yearly') {
//       graphResult = await ReplacementRequest.aggregate([
//         {
//           $group: {
//             _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
//             pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
//             outForDelivery: { 
//                 $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
//             },
//             delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
//             cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]);
//       categories = graphResult.map((y) => y._id);
//       lookupMap = null;
//     }

//     // --- EXECUTE STATUS COUNTS ---
//     const [pending, outForDelivery, delivered, cancelled] = await Promise.all(statusPromises);

//     // --- FORMAT GRAPH ---
//     const formatGraph = (rawData, cats, map) => {
//       const dataMap = {};
//       rawData.forEach((item) => {
//         const key = map ? map[item._id] : item._id;
//         if (key) dataMap[key] = item;
//       });

//       const deliveredData = [];
//       const cancelledData = [];
//       const outForDeliveryData = [];
//       const pendingData = [];

//       cats.forEach((cat) => {
//         const item = dataMap[cat] || { delivered: 0, cancelled: 0, pending: 0, outForDelivery: 0 };
//         deliveredData.push(item.delivered);
//         cancelledData.push(item.cancelled);
//         outForDeliveryData.push(item.outForDelivery);
//         pendingData.push(item.pending);
//       });

//       return {
//         categories: cats,
//         series: [
//           { name: 'Pending', data: pendingData },
//           { name: 'Out for Delivery', data: outForDeliveryData },
//           { name: 'Delivered', data: deliveredData },
//           { name: 'Cancelled', data: cancelledData },
//         ],
//       };
//     };

//     const finalGraphData = formatGraph(graphResult || [], categories, lookupMap);

//     console.log('--- getReplacementOrderStats END ---');

//     return {
//       cards: {
//         pending,
//         out_for_delivery: outForDelivery,
//         delivered,
//         cancelled,
//       },
//       graph: {
//         'replacement_orders': { // <--- Key for UI
//           [filter]: finalGraphData,
//         },
//       },
//     };

//   } catch (error) {
//     console.error('Error in getReplacementOrderStats:', error);
//     throw error;
//   }
// };
/**
 * Helper to fetch Replacement Request Stats.
 * Structure matches getNormalOrderStats exactly.
 */
export const getReplacementOrderStats = async (dateQuery, filter = 'daily') => {
  try {
    console.log(`--- getReplacementOrderStats START (Filter: ${filter}) ---`);

    // --- PART 1: STATUS COUNTS (For Cards) ---
    // Note: 'out_for_delivery' OR 'dispatched' both count towards the "Out for Delivery" card
    const statusPromises = [
      ReplacementRequest.countDocuments({ ...dateQuery, status: 'pending' }),
      ReplacementRequest.countDocuments({ 
          ...dateQuery, 
          status: { $in: ['out_for_delivery', 'dispatched'] } 
      }),
      ReplacementRequest.countDocuments({ ...dateQuery, status: 'delivered' }),
      ReplacementRequest.countDocuments({ ...dateQuery, status: 'cancelled' }),
    ];

    // --- PART 2: GRAPH DATA (Conditional) ---
    let graphResult = null;
    let categories = [];
    let lookupMap = null;

    // A. Daily
    if (filter === 'daily') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      graphResult = await ReplacementRequest.aggregate([
        { $match: { createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { 
                $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
            },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
    }

    // B. Weekly
    else if (filter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      graphResult = await ReplacementRequest.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%w', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { 
                $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
            },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    }

    // C. Monthly
    else if (filter === 'monthly') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      graphResult = await ReplacementRequest.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        {
          $group: {
            _id: { $dateToString: { format: '%m', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { 
                $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
            },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]);
      categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
    }

    // D. Yearly (FIXED)
    else if (filter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(currentYear - 4);

      graphResult = await ReplacementRequest.aggregate([
        { 
          $match: { createdAt: { $gte: fiveYearsAgo } } // Filter 5 years
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y', date: '$createdAt' } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            outForDelivery: { 
                $sum: { $cond: [{ $in: ['$status', ['out_for_delivery', 'dispatched']] }, 1, 0] } 
            },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      // Explicit 5 years
      categories = [
        (currentYear - 4).toString(),
        (currentYear - 3).toString(),
        (currentYear - 2).toString(),
        (currentYear - 1).toString(),
        currentYear.toString()
      ];
      lookupMap = null;
    }

    // --- EXECUTE STATUS COUNTS ---
    const [pending, outForDelivery, delivered, cancelled] = await Promise.all(statusPromises);

    // --- FORMAT GRAPH ---
    const formatGraph = (rawData, cats, map) => {
      const dataMap = {};
      rawData.forEach((item) => {
        const key = map ? map[item._id] : item._id;
        if (key) dataMap[key] = item;
      });

      const deliveredData = [];
      const cancelledData = [];
      const outForDeliveryData = [];
      const pendingData = [];

      cats.forEach((cat) => {
        const item = dataMap[cat] || { delivered: 0, cancelled: 0, pending: 0, outForDelivery: 0 };
        deliveredData.push(item.delivered);
        cancelledData.push(item.cancelled);
        outForDeliveryData.push(item.outForDelivery);
        pendingData.push(item.pending);
      });

      return {
        categories: cats,
        series: [
          { name: 'Pending', data: pendingData },
          { name: 'Out for Delivery', data: outForDeliveryData },
          { name: 'Delivered', data: deliveredData },
          { name: 'Cancelled', data: cancelledData },
        ],
      };
    };

    // REMOVED: categories = graphResult.map(...) - Dynamic overwrite gone.

    const finalGraphData = formatGraph(graphResult || [], categories, lookupMap);

    console.log('--- getReplacementOrderStats END ---');

    return {
      cards: {
        pending,
        out_for_delivery: outForDelivery,
        delivered,
        cancelled,
      },
      graph: {
        'replacement_orders': { // <--- Key for UI
          [filter]: finalGraphData,
        },
      },
    };

  } catch (error) {
    console.error('Error in getReplacementOrderStats:', error);
    throw error;
  }
};


/**
 * Helper to fetch Total Revenue Stats from App, Bulk, and Spot orders.
 * Only fetches the graph data requested by 'filter'.
 */
// export const getRevenueStats = async (dateQuery, filter = 'daily') => {
//   try {
//     console.log(`--- getRevenueStats START (Filter: ${filter}) ---`);

//     let graphResult = { categories: [], series: [] };

//     // --- AGGREGATION PIPELINE BUILDER ---
//     // Since the logic for grouping dates is the same for all 3 models,
//     // we create a reusable function to generate the pipeline.
//     const buildPipeline = (matchStage, groupId) => [
//       { $match: matchStage },
//       {
//         $group: {
//           _id: groupId,
//           revenue: { $sum: "$totalAmount" } // Ensure field is 'totalAmount' in all DBs
//         }
//       }
//     ];

//     // --- DATE & GROUPING LOGIC ---
//     let matchStage = { status: 'delivered' }; // Base filter
//     let groupId = {};
//     let categories = [];
//     let lookupMap = null;

//     if (filter === 'daily') {
//       const startOfToday = new Date();
//       startOfToday.setHours(0, 0, 0, 0);
//       matchStage.createdAt = { $gte: startOfToday };
      
//       // Group by 4-hour blocks: 0, 1, 2, 3, 4, 5
//       groupId = { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } };
      
//       categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
//       lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
//     } 
//     else if (filter === 'weekly') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       matchStage.createdAt = { $gte: sevenDaysAgo };
      
//       // Group by Day of Week: 1=Sun, 7=Sat
//       groupId = { $dateToString: { format: '%w', date: '$createdAt' } };
      
//       categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//       lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
//     } 
//     else if (filter === 'monthly') {
//       const startOfYear = new Date(new Date().getFullYear(), 0, 1);
//       matchStage.createdAt = { $gte: startOfYear };
      
//       // Group by Month: "01", "02"
//       groupId = { $dateToString: { format: '%m', date: '$createdAt' } };
      
//       categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//       lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
//     } 
//     else if (filter === 'yearly') {
//       // Last 5 Years
//       const fiveYearsAgo = new Date();
//       fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
//       matchStage.createdAt = { $gte: fiveYearsAgo };

//       // Group by Year: "2024", "2025"
//       groupId = { $dateToString: { format: '%Y', date: '$createdAt' } };
      
//       categories = []; // Dynamic
//       lookupMap = null; // Use ID directly
//     }

//     // --- EXECUTE 3 PARALLEL AGGREGATIONS ---
//     const [appRev, bulkRev, spotRev] = await Promise.all([
//       AppOrder.aggregate(buildPipeline(matchStage, groupId)),
//       BulkOrder.aggregate(buildPipeline(matchStage, groupId)),
//       SpotOrder.aggregate(buildPipeline(matchStage, groupId))
//     ]);

//     // --- MERGE RESULTS ---
//     // We need to sum up revenue from all 3 sources into a single map
//     const revenueMap = {};

//     const mergeData = (data) => {
//       data.forEach(item => {
//         const key = item._id;
//         if (!revenueMap[key]) revenueMap[key] = 0;
//         revenueMap[key] += item.revenue;
//       });
//     };

//     mergeData(appRev);
//     mergeData(bulkRev);
//     mergeData(spotRev);

//     // --- FORMAT FOR UI ---
    
//     // If dynamic categories (Yearly), extract them from map keys and sort
//     if (filter === 'yearly') {
//        categories = Object.keys(revenueMap).sort();
//     }

//     const seriesData = categories.map(cat => {
//       // Find matching key. If lookupMap exists, cat is Value ("Jan"), we need Key ("01")
//       // Actually, our map logic is reversed here compared to previous functions. 
//       // It's easier to iterate categories and find the data.
      
//       let amount = 0;
      
//       if (lookupMap) {
//         // Reverse lookup: Find the ID (0, 1, "01") that matches the Label ("00:00", "Sun")
//         // This is O(N^2) but N is tiny (7 or 12), so it's fine.
//         const id = Object.keys(lookupMap).find(key => lookupMap[key] === cat);
//         amount = revenueMap[id] || 0;
//       } else {
//         // Direct lookup (Yearly)
//         amount = revenueMap[cat] || 0;
//       }
      
//       return amount;
//     });

//     const finalGraphData = {
//       categories: categories,
//       series: [{ name: "Revenue", data: seriesData }]
//     };

//     // Return structure (matches your request to have only active filter populated)
//     const emptyPlaceholder = { categories: [], series: [] };
//     const graphResponse = {
//     //   daily: emptyPlaceholder,
//     //   weekly: emptyPlaceholder,
//     //   monthly: emptyPlaceholder,
//     //   yearly: emptyPlaceholder,
//       [filter]: finalGraphData
//     };

//     console.log('--- getRevenueStats END ---');
//     return graphResponse;

//   } catch (error) {
//     console.error('Error in getRevenueStats:', error);
//     throw error;
//   }
// };
/**
 * Helper to fetch Total Revenue Stats from App, Bulk, and Spot orders.
 * Forces 5-year view for 'yearly' filter.
 */
export const getRevenueStats = async (dateQuery, filter = 'daily') => {
  try {
    console.log(`--- getRevenueStats START (Filter: ${filter}) ---`);

    // --- AGGREGATION PIPELINE BUILDER ---
    const buildPipeline = (matchStage, groupId) => [
      { $match: matchStage },
      {
        $group: {
          _id: groupId,
          revenue: { $sum: "$totalAmount" }
        }
      }
    ];

    // --- DATE & GROUPING LOGIC ---
    let matchStage = { status: 'delivered' }; 
    let groupId = {};
    let categories = [];
    let lookupMap = null;

    if (filter === 'daily') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      matchStage.createdAt = { $gte: startOfToday };
      
      groupId = { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } };
      
      categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      lookupMap = { 0: '00:00', 1: '04:00', 2: '08:00', 3: '12:00', 4: '16:00', 5: '20:00' };
    } 
    else if (filter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchStage.createdAt = { $gte: sevenDaysAgo };
      
      groupId = { $dateToString: { format: '%w', date: '$createdAt' } };
      
      categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      lookupMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    } 
    else if (filter === 'monthly') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      matchStage.createdAt = { $gte: startOfYear };
      
      groupId = { $dateToString: { format: '%m', date: '$createdAt' } };
      
      categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      lookupMap = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
    } 
    else if (filter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(currentYear - 4);
      
      matchStage.createdAt = { $gte: fiveYearsAgo };
      groupId = { $dateToString: { format: '%Y', date: '$createdAt' } };
      
      // FIXED: Explicit 5 years
      categories = [
         (currentYear - 4).toString(),
         (currentYear - 3).toString(),
         (currentYear - 2).toString(),
         (currentYear - 1).toString(),
         currentYear.toString()
      ];
      lookupMap = null;
    }

    // --- EXECUTE AGGREGATIONS ---
    const [appRev, bulkRev, spotRev] = await Promise.all([
      AppOrder.aggregate(buildPipeline(matchStage, groupId)),
      BulkOrder.aggregate(buildPipeline(matchStage, groupId)),
      SpotOrder.aggregate(buildPipeline(matchStage, groupId))
    ]);

    // --- MERGE RESULTS ---
    const revenueMap = {};

    const mergeData = (data) => {
      data.forEach(item => {
        const key = item._id;
        if (!revenueMap[key]) revenueMap[key] = 0;
        revenueMap[key] += item.revenue;
      });
    };

    mergeData(appRev);
    mergeData(bulkRev);
    mergeData(spotRev);

    // --- FORMAT FOR UI ---
    
    // REMOVED: if (filter === 'yearly') categories = Object.keys(...).sort();
    // This line was overwriting the fixed categories. It is now gone.

    const seriesData = categories.map(cat => {
      let amount = 0;
      
      if (lookupMap) {
        const id = Object.keys(lookupMap).find(key => lookupMap[key] === cat);
        amount = revenueMap[id] || 0;
      } else {
        amount = revenueMap[cat] || 0;
      }
      
      return amount;
    });

    const finalGraphData = {
      categories: categories,
      series: [{ name: "Revenue", data: seriesData }]
    };

    const graphResponse = {
      [filter]: finalGraphData
    };

    console.log('--- getRevenueStats END ---');
    return graphResponse;

  } catch (error) {
    console.error('Error in getRevenueStats:', error);
    throw error;
  }
};


/**
 * Helper to fetch Inventory Stats (Total Stock vs Sold Items).
 * Uses Order history to calculate sales, and Current Product Stock to reverse-engineer stock levels.
 */
export const getInventoryStats = async (dateQuery, filter = 'daily') => {
  try {
    console.log(`--- getInventoryStats START (Filter: ${filter}) ---`);

    // 1. Get Current Total Stock Snapshot (The "Now" point)
    const productStats = await AdminInventory.aggregate([
      {
        $group: {
          _id: null,
          currentTotalStock: { $sum: "$totalOnHand" }
        }
      }
    ]);
    const currentStockLevel = productStats[0]?.currentTotalStock || 0;

    // 2. Define Time Buckets (Categories) based on Filter
    let matchStage = { status: { $ne: 'cancelled' } }; // Count everything except cancelled
    let groupId = {};
    let categories = [];
    let lookupMap = null;

    if (filter === 'daily') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      matchStage.createdAt = { $gte: startOfToday };

      // 00:00, 04:00...
      groupId = { $floor: { $divide: [{ $hour: '$createdAt' }, 4] } };
      categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      lookupMap = {
        0: '00:00',
        1: '04:00',
        2: '08:00',
        3: '12:00',
        4: '16:00',
        5: '20:00',
      };
    } else if (filter === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchStage.createdAt = { $gte: sevenDaysAgo };

      groupId = { $dateToString: { format: '%w', date: '$createdAt' } };
      categories = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      lookupMap = {
        1: 'Sun',
        2: 'Mon',
        3: 'Tue',
        4: 'Wed',
        5: 'Thu',
        6: 'Fri',
        7: 'Sat',
      };
    } else if (filter === 'monthly') {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      matchStage.createdAt = { $gte: startOfYear };

      groupId = { $dateToString: { format: '%m', date: '$createdAt' } };
      categories = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      lookupMap = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Aug',
        '09': 'Sep',
        10: 'Oct',
        11: 'Nov',
        12: 'Dec',
      };
    } else if (filter === 'yearly') {
      const currentYear = new Date().getFullYear();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(currentYear - 4);
      matchStage.createdAt = { $gte: fiveYearsAgo };

      groupId = { $dateToString: { format: '%Y', date: '$createdAt' } };

      // EXPLICITLY SET 5 YEARS
      categories = [
        (currentYear - 4).toString(),
        (currentYear - 3).toString(),
        (currentYear - 2).toString(),
        (currentYear - 1).toString(),
        currentYear.toString(),
      ];
      lookupMap = null;
    }


    // 3. Aggregate "Sold" count from all Order Types
    // We sum 'items.quantity' (AppOrder) or 'totalQuantity' (Bulk/Spot)
    // Note: Adjust field names based on your actual Schema (e.g., items.quantity vs totalQuantity)
    const buildSalesPipeline = (match, group) => [
      { $match: match },
      {
        $group: {
          _id: group,
          soldCount: { $sum: '$productCount' }, // Adjust this field name!
        },
      },
    ];

    // Simpler pipeline for Bulk/Spot if they don't have items array but a direct qty
    const buildSimplePipeline = (match, group) => [
      { $match: match },
      {
        $group: {
          _id: group,
          soldCount: { $sum: "$productCount" } // Adjust this field name!
        }
      }
    ];

    const [appSales, bulkSales, spotSales] = await Promise.all([
      AppOrder.aggregate(buildSalesPipeline(matchStage, groupId)),
      BulkOrder.aggregate(buildSimplePipeline(matchStage, groupId)), // Assuming Bulk has direct qty
      SpotOrder.aggregate(buildSimplePipeline(matchStage, groupId))
    ]);

    // 4. Merge Sales Data
    const salesMap = {};
    const mergeSales = (data) => {
      data.forEach(item => {
        const key = item._id;
        if (!salesMap[key]) salesMap[key] = 0;
        salesMap[key] += item.soldCount;
      });
    };
    mergeSales(appSales);
    mergeSales(bulkSales);
    mergeSales(spotSales);

    // 5. Generate Series Data
    // if (filter === 'yearly') categories = Object.keys(salesMap).sort();

    const soldSeries = [];
    const stockSeries = [];
    
    // We calculate stock backwards from current
    // But for the graph, we usually want left-to-right. 
    // Since "Stock History" is hard, we can treat "Total Stock" line as:
    // "How much we had available at that time".
    // Approximation: Start with Current Stock + Total Sales in Period, then subtract as we go forward? 
    // Or simpler: Just show Sales trend vs Current Snapshot line (flat) or estimated.
    
    // Let's use the Reverse-Engineer method for a realistic line:
    // 1. Total Sales in this period = Sum of all bars.
    // 2. Start Stock (at beginning of graph) = Current Stock + Total Sales.
    // 3. Subtract sales for each step.

    let runningStock = currentStockLevel;
    
    // Calculate total sales in the entire visible graph first to find "Start Stock"
    let totalSalesInPeriod = 0;
    categories.forEach(cat => {
      let key = lookupMap ? Object.keys(lookupMap).find(k => lookupMap[k] === cat) : cat;
      totalSalesInPeriod += (salesMap[key] || 0);
    });

    // So, at the START of the graph, stock was approximately:
    runningStock = currentStockLevel + totalSalesInPeriod;

    categories.forEach(cat => {
      let key = lookupMap ? Object.keys(lookupMap).find(k => lookupMap[k] === cat) : cat;
      const soldNow = salesMap[key] || 0;

      // Push data points
      soldSeries.push(soldNow);
      stockSeries.push(runningStock);

      // Decrement stock for next time slot (because we sold these items)
      runningStock -= soldNow; 
    });

    // 6. Final Structure
    const finalGraphData = {
      categories: categories,
      series: [
        { name: "Total Stock", data: stockSeries },
        { name: "Sold Items", data: soldSeries }
      ]
    };

    const emptyPlaceholder = { categories: [], series: [] };
    const graphResponse = {
    //   daily: emptyPlaceholder,
    //   weekly: emptyPlaceholder,
    //   monthly: emptyPlaceholder,
    //   yearly: emptyPlaceholder,
      [filter]: finalGraphData
    };

    console.log('--- getInventoryStats END ---');
    return graphResponse;

  } catch (error) {
    console.error('Error in getInventoryStats:', error);
    throw error;
  }
};
