import BasicRoute from '../../models/admin/BasicRoutesModel.js';
import { createRepository } from '../../utils/repository.js';

const basicRouteRepo = createRepository(BasicRoute, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

/**
 * Create a new basic route
 */
export const createBasicRoute = async (req, res) => {
  try {
    const { routeName, area, isActive } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    // Validation
    if (!routeName || typeof routeName !== 'string' || !routeName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: routeName is required.',
      });
    }

    if (!area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: area is required.',
      });
    }

    // Check for duplicate route name and area combination
    const existingRoute = await BasicRoute.findOne({
      routeName: routeName.trim(),
      area: area.trim(),
      isDeleted: false,
    });

    if (existingRoute) {
      return res.status(409).json({
        success: false,
        message: `A route with name "${routeName}" already exists for area "${area}".`,
      });
    }

    // Create basic route
    const basicRoute = new BasicRoute({
      routeName: routeName.trim(),
      area: area.trim(),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await basicRoute.save();

    return res.status(201).json({
      success: true,
      message: 'Basic route created successfully.',
      data: basicRoute,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate route name and area combination.',
      });
    }
    console.error('Create basic route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};

/**
 * Update a basic route
 */
export const updateBasicRoute = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { id } = req.params;
    const { routeName, area, isActive } = req.body;

    const existing = await BasicRoute.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found.',
      });
    }

    // Check for duplicate if routeName or area is being changed
    if (routeName || area) {
      const checkRouteName = routeName?.trim() || existing.routeName;
      const checkArea = area?.trim() || existing.area;

      const duplicate = await BasicRoute.findOne({
        _id: { $ne: id },
        routeName: checkRouteName,
        area: checkArea,
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `A route with name "${checkRouteName}" already exists for area "${checkArea}".`,
        });
      }
    }

    // Update fields
    if (typeof routeName === 'string' && routeName.trim()) {
      existing.routeName = routeName.trim();
    }

    if (typeof area === 'string' && area.trim()) {
      existing.area = area.trim();
    }

    if (isActive !== undefined) {
      existing.isActive = isActive;
    }

    existing.updatedBy = req.user.id;

    await existing.save();

    return res.json({
      success: true,
      message: 'Basic route updated successfully.',
      data: existing,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate route name and area combination.',
      });
    }
    console.error('Update basic route error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all basic routes
 */
export const getAllBasicRoutes = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};

    // Search by route name or area
    if (q) {
      filter.$or = [
        { routeName: { $regex: q, $options: 'i' } },
        { area: { $regex: q, $options: 'i' } },
      ];
    }

    if (isActive != null) {
      filter.isActive = isActive === 'true';
    }

    const result = await basicRouteRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      page,
      limit,
    //   populate: [
    //     { path: 'createdBy', select: 'fullName email' },
    //     { path: 'updatedBy', select: 'fullName email' },
    //   ],
      collation: { locale: 'en', strength: 2 },
      paginate: false,
    });

    return res.status(result.status).json(result);
  } catch (err) {
    console.error('Get all basic routes error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

/**
 * Get basic route by ID
 */
export const getBasicRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const basicRoute = await BasicRoute.findById(id)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!basicRoute || basicRoute.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Basic route not found.',
      });
    }

    return res.json({
      success: true,
      data: basicRoute,
    });
  } catch (err) {
    console.error('Get basic route by ID error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

/**
 * Delete basic route (soft delete)
 */
export const deleteBasicRoute = async (req, res) => {
  try {
    const result = await basicRouteRepo.removeById(req.params.id, {
      hard: true,
    });

    return res.status(result.status).json(result);
  } catch (err) {
    console.error('Delete basic route error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

/**
 * Update basic route status (active/inactive)
 */
export const updateBasicRouteStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await basicRouteRepo.updateStatus(req.params.id, status);

    return res.status(result.status).json(result);
  } catch (err) {
    console.error('Update basic route status error:', err);
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};
