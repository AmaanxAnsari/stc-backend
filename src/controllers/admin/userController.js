import bcrypt from 'bcryptjs';
import AdminUser  from '../../models/admin/adminUser.js';
import Module from '../../models/admin/moduleModel.js';
import Role from '../../models/admin/roleModel.js';
import { createRepository } from '../../utils/repository.js';


const adminUserRepo = createRepository(AdminUser, {
  softDelete: { enabled: false, field: 'isDeleted', timestamp: 'deletedAt' },
});

/* --------------------------- ADMIN USER --------------------------- */

export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }
    if (isActive != null) filter.isActive = isActive === 'true';

    const result = await adminUserRepo.getAll({
      filter: { ...filter, role: { $ne: 'admin' } },
      sort: sort ? JSON.parse(sort) : undefined,
      page,
      limit,
      projection: { password: 0 },
      paginate:false,
      collation: { locale: 'en', strength: 2 },
    });

    // Directly use the repository response
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

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  const modules = await Module.find({}).sort({ name: 1 });
  const moduleNames = modules.map((module) => module.name);

  const permissions = moduleNames.map((module) => ({
    module_name: module,
    create: false,
    read: false,
    update: false,
    delete: false,
  }));

  try {
    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }
    const existingRole = await Role.findById(role);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new AdminUser({
      name,
      email,
      password: hashedPassword,
      permissions,
      role: existingRole ? existingRole.name : null, // Ensure role exists
      role_id: existingRole ? existingRole._id : null, // Ensure role_id exists
      createdBy: req.user ? req.user.id : null, // Use req.user if available
      updatedBy: req.user ? req.user.id : null, // Use req.user if available
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};


export const getUserById = async (req, res) => {
  try {
    const result = await adminUserRepo.getById(req.params.id, {
      projection: { password: 0 },
    });

    // Directly return the repository response
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



export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone,mobile_number, address, role, permissions } = req.body;
  const profile_image = req.file?.filename;
  console.log("Body:", req.body);

  try {
    const user = await AdminUser.findById(id);
    if (!user || user.is_deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    if (role) {
      const existingRole = await Role.findById(role);
      if (!existingRole) {
        return res
          .status(400)
          .json({ success: false, message: 'Role does not exist' });
      }
      user.role = existingRole.name;
      user.role_id = existingRole._id;
    }

    if (permissions && Array.isArray(permissions)) {
      user.permissions = permissions.map((perm) => ({
        module_name: perm.module_name,
        create: perm.create || false,
        read: perm.read || false,
        update: perm.update || false,
        delete: perm.delete || false,
      }));
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone ;
    if (mobile_number) user.phone = mobile_number ;
    if (address) user.address = address;
    if (profile_image) user.profile_image = profile_image;

    await user.save();

    // ✅ Check if current user is updating their own info
    // const isSelf = req.user.id === user.id.toString();

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user?.phone || '',
      address: user?.address || '',
      profile: user.profile_image,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    };

    // let newToken;
    // if (isSelf) {
    //   newToken = generateToken(payload);
    // }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      // accessToken: newToken || null,
      data: payload,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal Server error',
      error: error.message,
    });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await adminUserRepo.updateStatus(req.params.id, status, {
      projection: { password: 0 },
    });

    // Directly return the repository response
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



export const deleteUser = async (req, res) => {
  try {
    const result = await adminUserRepo.removeById(req.params.id, {
      hard: true,
    });

    // Directly return the repository response
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





