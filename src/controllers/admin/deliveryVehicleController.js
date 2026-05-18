import DeliveryVehicle from '../../models/admin/deliveryVehicleModel.js';
import { createRepository } from '../../utils/repository.js';

const deliveryVehicleRepo = createRepository(DeliveryVehicle, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

export const createDeliveryVehicle = async (req, res) => {
  try {
    const { vehicleName, vehicleNumber, isActive } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    if (
      !vehicleName ||
      typeof vehicleName !== 'string' ||
      !vehicleName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: vehicleName is required.',
      });
    }

    if (
      !vehicleNumber ||
      typeof vehicleNumber !== 'string' ||
      !vehicleNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: vehicleNumber is required.',
      });
    }

    const vehicle = new DeliveryVehicle({
      vehicleName: vehicleName.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: 'Delivery vehicle created successfully.',
      data: vehicle,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField =
        Object.keys(error.keyPattern || {})[0] || 'vehicleNumber';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }
    console.error('Create delivery vehicle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};

export const updateDeliveryVehicle = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { id } = req.params;
    const { vehicleName, vehicleNumber } = req.body;

    const existing = await DeliveryVehicle.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Delivery vehicle not found.',
      });
    }

    if (typeof vehicleName === 'string' && vehicleName.trim()) {
      existing.vehicleName = vehicleName.trim();
    }

    if (typeof vehicleNumber === 'string' && vehicleNumber.trim()) {
      existing.vehicleNumber = vehicleNumber.trim().toUpperCase();
    }

    existing.updatedBy = req.user.id;

    await existing.save();

    return res.json({
      success: true,
      message: 'Delivery vehicle updated successfully.',
      data: existing,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField =
        Object.keys(error.keyPattern || {})[0] || 'vehicleNumber';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }
    console.error('Update delivery vehicle error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllDeliveryVehicle = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { vehicleName: { $regex: q, $options: 'i' } },
        { vehicleNumber: { $regex: q, $options: 'i' } },
      ];
    }
    if (isActive != null) filter.isActive = isActive === 'true';

    const result = await deliveryVehicleRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : undefined,
      page,
      limit,
      projection: {},
      collation: { locale: 'en', strength: 2 },
    });

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const deleteDeliveryVehicle = async (req, res) => {
  try {
    const result = await deliveryVehicleRepo.removeById(req.params.id, {
      hard: true,
    });

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

export const updateDeliveryVehicleStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await deliveryVehicleRepo.updateStatus(
      req.params.id,
      status,
      {
        projection: {},
      },
    );

    return res.status(result.status).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};
