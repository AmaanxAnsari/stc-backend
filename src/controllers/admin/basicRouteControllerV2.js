import BasicRoute from '../../models/admin/BasicRoutesModel.js';
import DeliveryStop from '../../models/admin/deliveryStopsModel.js';
import DeliveryRoute from '../../models/admin/deliveryRouteModel.js';

/**
 * Create a new Basic Route (Predefined Route Template)
 */
export const createBasicRoute = async (req, res) => {
  try {
    const { routeName, area, stopIds } = req.body;
    const adminId = req.user.id;

    if (!routeName || !area) {
      return res.status(400).json({
        success: false,
        message: 'Route name and area are required',
      });
    }

    // Check for duplicate
    const existingRoute = await BasicRoute.findOne({
      routeName: { $regex: new RegExp(`^${routeName}$`, 'i') },
      area: { $regex: new RegExp(`^${area}$`, 'i') },
      isDeleted: false,
    });

    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: `A basic route with name "${routeName}" in area "${area}" already exists`,
      });
    }

    // Validate stops if provided
    if (stopIds && stopIds.length > 0) {
      const stops = await DeliveryStop.find({
        _id: { $in: stopIds },
        isDeleted: false,
      });

      if (stops.length !== stopIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some stops do not exist or are deleted',
        });
      }
    }

    const basicRoute = await BasicRoute.create({
      routeName,
      area,
      stops: stopIds || [],
      createdBy: adminId,
    });

    res.status(201).json({
      success: true,
      message: 'Basic route created successfully',
      data: basicRoute,
    });
  } catch (error) {
    console.error('Create basic route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create basic route',
      error: error.message,
    });
  }
};

/**
 * Get all Basic Routes
 */
export const getAllBasicRoutes = async (req, res) => {
  try {
    const { area } = req.query;

    const query = { isDeleted: false };
    if (area) {
      query.area = { $regex: new RegExp(area, 'i') };
    }

    const basicRoutes = await BasicRoute.find(query)
      .populate('stops', 'stopName area city pincode')
      .sort({ routeName: 1 });

    res.status(200).json({
      success: true,
      count: basicRoutes.length,
      data: basicRoutes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get Basic Route by ID
 */
export const getBasicRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;

    const basicRoute = await BasicRoute.findOne({
      _id: routeId,
      isDeleted: false,
    }).populate('stops', 'stopName area city pincode coordinates');

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    res.status(200).json({
      success: true,
      data: basicRoute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Add Stop to Basic Route
 */
export const addStopToBasicRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stopId } = req.body;
    const adminId = req.user.id;

    const basicRoute = await BasicRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    const stop = await DeliveryStop.findOne({
      _id: stopId,
      isDeleted: false,
    });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found',
      });
    }

    // Check if stop already exists
    if (basicRoute.stops.includes(stopId)) {
      return res.status(400).json({
        success: false,
        message: 'Stop already exists in this route',
      });
    }

    basicRoute.stops.push(stopId);
    basicRoute.updatedBy = adminId;
    await basicRoute.save();

    const updatedRoute = await BasicRoute.findById(routeId).populate(
      'stops',
      'stopName area city pincode',
    );

    res.status(200).json({
      success: true,
      message: 'Stop added to basic route',
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Add stop to basic route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stop',
      error: error.message,
    });
  }
};

/**
 * Remove Stop from Basic Route
 */
export const removeStopFromBasicRoute = async (req, res) => {
  try {
    const { routeId, stopId } = req.params;
    const adminId = req.user.id;

    const basicRoute = await BasicRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    const stopIndex = basicRoute.stops.findIndex(
      (s) => s.toString() === stopId,
    );

    if (stopIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found in this route',
      });
    }

    basicRoute.stops.splice(stopIndex, 1);
    basicRoute.updatedBy = adminId;
    await basicRoute.save();

    const updatedRoute = await BasicRoute.findById(routeId).populate(
      'stops',
      'stopName area city pincode',
    );

    res.status(200).json({
      success: true,
      message: 'Stop removed from basic route',
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Remove stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stop',
      error: error.message,
    });
  }
};

/**
 * Update Basic Route
 */
export const updateBasicRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const updateData = req.body;
    const adminId = req.user.id;

    const basicRoute = await BasicRoute.findOneAndUpdate(
      { _id: routeId, isDeleted: false },
      {
        ...updateData,
        updatedBy: adminId,
      },
      { new: true },
    ).populate('stops', 'stopName area city pincode');

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Basic route updated successfully',
      data: basicRoute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update basic route',
      error: error.message,
    });
  }
};

/**
 * Delete Basic Route (Soft Delete)
 */
export const deleteBasicRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const adminId = req.user.id;

    // Check if any active route instances use this basic route
    const activeRoutes = await DeliveryRoute.countDocuments({
      routeId: routeId,
      status: { $in: ['scheduled', 'active', 'in_progress'] },
      isDeleted: false,
    });

    if (activeRoutes > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete basic route. ${activeRoutes} active route instance(s) are using this template.`,
      });
    }

    const basicRoute = await BasicRoute.findOneAndUpdate(
      { _id: routeId, isDeleted: false },
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: adminId,
      },
      { new: true },
    );

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Basic route deleted successfully',
      data: basicRoute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete basic route',
      error: error.message,
    });
  }
};

/**
 * Reorder Stops in Basic Route
 */
export const reorderStops = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { stopIds } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(stopIds) || stopIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'stopIds must be a non-empty array',
      });
    }

    const basicRoute = await BasicRoute.findOne({
      _id: routeId,
      isDeleted: false,
    });

    if (!basicRoute) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found',
      });
    }

    // Validate all stop IDs exist in the route
    const currentStopIds = basicRoute.stops.map((s) => s.toString());
    const allStopsValid = stopIds.every((id) => currentStopIds.includes(id));

    if (!allStopsValid) {
      return res.status(400).json({
        success: false,
        message: 'Some stop IDs are invalid or not part of this route',
      });
    }

    basicRoute.stops = stopIds;
    basicRoute.updatedBy = adminId;
    await basicRoute.save();

    const updatedRoute = await BasicRoute.findById(routeId).populate(
      'stops',
      'stopName area city pincode',
    );

    res.status(200).json({
      success: true,
      message: 'Stops reordered successfully',
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Reorder stops error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder stops',
      error: error.message,
    });
  }
};
