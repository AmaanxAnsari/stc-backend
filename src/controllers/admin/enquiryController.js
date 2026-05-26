import Customer from '../../models/admin/ConsumerModel.js';
import Enquiry from '../../models/admin/enquiryModel.js';
import { createRepository } from '../../utils/repository.js';

const enquiryRepo = createRepository(Enquiry, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

// CREATE ENQUIRY
// export const createEnquiry = async (req, res) => {
//   try {
//     const { customerName, poNumber, enquiryText, includePartNumbers, items } =
//       req.body;

//     if (!req.user?.id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Unauthorized: User info missing.',
//       });
//     }

//     if (!customerName?.trim()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Customer name is required.',
//       });
//     }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'At least one enquiry item is required.',
//       });
//     }

//     const enquiry = new Enquiry({
//       customerName,
//       poNumber,
//       enquiryText,
//       includePartNumbers,
//       items,
//       createdBy: req.user.id,
//       updatedBy: req.user.id,
//     });

//     await enquiry.save();

//     return res.status(201).json({
//       success: true,
//       message: 'Enquiry created successfully.',
//       data: enquiry,
//     });
//   } catch (error) {
//     console.error('Create enquiry error:', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Server error. ' + error.message,
//     });
//   }
// };
export const createEnquiry = async (req, res) => {
  try {
    const {
      customerName,
      mobile,
      email,
      address,
      city,
      pincode,
      poNumber,
      enquiryText,
      includePartNumbers,
      items,
    } = req.body;
    console.log("req user", req.user);

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!customerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
      });
    }

    // CHECK EXISTING CUSTOMER
    let customer = await Customer.findOne({
      mobile,
      isDeleted: false,
    });

    // CREATE CUSTOMER IF NOT EXISTS
    if (!customer) {
      customer = await Customer.create({
        customerName,
        mobile,
        email,
        address,
        city,
        pincode,
        createdBy: req.user.id,
        updatedBy: req.user.id,
      });
    }

    // CREATE ENQUIRY
    const enquiry = await Enquiry.create({
      customer: customer._id,
      poNumber,
      enquiryText,
      includePartNumbers,
      items,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    const populatedEnquiry = await Enquiry.findById(enquiry._id).populate(
      'customer',
    );

    return res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      data: populatedEnquiry,
    });
  } catch (error) {
    console.error('Create enquiry error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE ENQUIRY
export const updateEnquiry = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { id } = req.params;

    const {
      customerName,
      poNumber,
      enquiryText,
      includePartNumbers,
      items,
      status,
    } = req.body;

    const existing = await Enquiry.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.',
      });
    }

    if (customerName !== undefined) existing.customerName = customerName;

    if (poNumber !== undefined) existing.poNumber = poNumber;

    if (enquiryText !== undefined) existing.enquiryText = enquiryText;

    if (includePartNumbers !== undefined)
      existing.includePartNumbers = includePartNumbers;

    if (items !== undefined) existing.items = items;

    if (status !== undefined) existing.status = status;

    existing.updatedBy = req.user.id;

    await existing.save();

    return res.status(200).json({
      success: true,
      message: 'Enquiry updated successfully.',
      data: existing,
    });
  } catch (error) {
    console.error('Update enquiry error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL ENQUIRIES
// export const getAllEnquiries = async (req, res) => {
//   try {
//     const { page, limit, sort, q, isActive, status } = req.query;

//     const filter = {};

//     if (q) {
//       filter.$or = [
//         { customerName: { $regex: q, $options: 'i' } },
//         { poNumber: { $regex: q, $options: 'i' } },
//       ];
//     }

//     if (isActive != null) filter.isActive = isActive === 'true';

//     if (status) filter.status = status;

//     const result = await enquiryRepo.getAll({
//       filter,
//       sort: sort ? JSON.parse(sort) : undefined,
//       page,
//       limit,
//       projection: {},
//       collation: { locale: 'en', strength: 2 },
//     });

//     return res.status(result.status).json(result);
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       status: 500,
//       message: 'An unexpected error occurred.',
//       error: err.message,
//     });
//   }
// };
export const getAllEnquiries = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort, q, isActive, status } = req.query;

    const filter = {
      isDeleted: false,
    };

    // STATUS FILTER
    if (status) {
      filter.status = status;
    }

    // ACTIVE FILTER
    if (isActive != null) {
      filter.isActive = isActive === 'true';
    }

    // SEARCH
    if (q) {
      // FIND MATCHING CUSTOMERS
      const customers = await Customer.find({
        isDeleted: false,
        $or: [
          {
            customerName: {
              $regex: q,
              $options: 'i',
            },
          },
          {
            mobile: {
              $regex: q,
              $options: 'i',
            },
          },
          {
            email: {
              $regex: q,
              $options: 'i',
            },
          },
          {
            city: {
              $regex: q,
              $options: 'i',
            },
          },
        ],
      }).select('_id');

      const customerIds = customers.map((customer) => customer._id);

      filter.$or = [
        {
          customer: {
            $in: customerIds,
          },
        },
        {
          poNumber: {
            $regex: q,
            $options: 'i',
          },
        },
      ];
    }

    // SORT
    let parsedSort = { createdAt: -1 };

    if (sort) {
      parsedSort = JSON.parse(sort);
    }

    // PAGINATION
    const skip = (Number(page) - 1) * Number(limit);

    // DATA
    const enquiries = await Enquiry.find(filter)
      .populate('customer')
      .sort(parsedSort)
      .skip(skip)
      .limit(Number(limit));

    // COUNT
    const total = await Enquiry.countDocuments(filter);

    return res.status(200).json({
      success: true,
      status: 200,

      data: enquiries,

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Get all enquiries error:', err);

    return res.status(500).json({
      success: false,
      status: 500,
      message: 'An unexpected error occurred.',
      error: err.message,
    });
  }
};

// GET SINGLE ENQUIRY
export const getSingleEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE ENQUIRY
export const deleteEnquiry = async (req, res) => {
  try {
    const result = await enquiryRepo.removeById(req.params.id, {
      hard: false,
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

// UPDATE ENQUIRY STATUS
export const updateEnquiryStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await enquiryRepo.updateStatus(req.params.id, status, {});

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
