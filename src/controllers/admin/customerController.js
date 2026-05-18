// import Customer from "../../models/admin/ConsumerModel.js";

// // CREATE CUSTOMER
// export const createCustomer = async (req, res) => {
//   try {
//     const customer = await Customer.create({
//       ...req.body,
//       createdBy: req.user.id,
//       updatedBy: req.user.id,
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Customer created successfully',
//       data: customer,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // GET ALL CUSTOMERS
// export const getAllCustomers = async (req, res) => {
//   try {
//     const customers = await Customer.find({
//       isDeleted: false,
//     }).sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       data: customers,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // GET SINGLE CUSTOMER
// export const getSingleCustomer = async (req, res) => {
//   try {
//     const customer = await Customer.findById(req.params.id);

//     if (!customer) {
//       return res.status(404).json({
//         success: false,
//         message: 'Customer not found',
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: customer,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // UPDATE CUSTOMER
// export const updateCustomer = async (req, res) => {
//   try {
//     const customer = await Customer.findByIdAndUpdate(
//       req.params.id,
//       {
//         ...req.body,
//         updatedBy: req.user.id,
//       },
//       { new: true },
//     );

//     return res.status(200).json({
//       success: true,
//       message: 'Customer updated successfully',
//       data: customer,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // DELETE CUSTOMER
// export const deleteCustomer = async (req, res) => {
//   try {
//     await Customer.findByIdAndUpdate(req.params.id, {
//       isDeleted: true,
//       deletedAt: new Date(),
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Customer deleted successfully',
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
import Customer from '../../models/admin/ConsumerModel.js';

// CREATE CUSTOMER
export const createCustomer = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { customerName, mobile, email, address, city, pincode } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      });
    }

    // OPTIONAL DUPLICATE CHECK
    const existingCustomer = await Customer.findOne({
      mobile,
      isDeleted: false,
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer already exists with this mobile number',
      });
    }

    const customer = await Customer.create({
      customerName,
      mobile,
      email,
      address,
      city,
      pincode,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Create customer error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL CUSTOMERS
export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, q, isActive, sort } = req.query;

    const filter = {
      isDeleted: false,
    };

    // SEARCH
    if (q) {
      filter.$or = [
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
      ];
    }

    // ACTIVE FILTER
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // SORT
    let parsedSort = { createdAt: -1 };

    if (sort) {
      parsedSort = JSON.parse(sort);
    }

    // PAGINATION
    const skip = (Number(page) - 1) * Number(limit);

    // GET CUSTOMERS
    const customers = await Customer.find(filter)
      .sort(parsedSort)
      .skip(skip)
      .limit(Number(limit));

    // TOTAL
    const total = await Customer.countDocuments(filter);

    return res.status(200).json({
      success: true,
      status: 200,

      data: customers,

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE CUSTOMER
export const getSingleCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: customer,
    });
  } catch (error) {
    console.error('Get single customer error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE CUSTOMER
export const updateCustomer = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    Object.assign(customer, req.body);

    customer.updatedBy = req.user.id;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Update customer error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE CUSTOMER (SOFT DELETE)
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    customer.isDeleted = true;
    customer.deletedAt = new Date();

    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Delete customer error:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};