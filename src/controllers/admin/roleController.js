import Role from '../../models/admin/roleModel.js';

// CREATE Role
export const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existingRole = await Role.findOne({ name, is_deleted: false });
    if (existingRole) {
      return res
        .status(400)
        .json({ success: false, message: 'Role already exists' });
    }

    const newRole = new Role({ name, description });
    const savedRole = await newRole.save();

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: savedRole,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
};

// GET all roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({ is_deleted: false });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      error: error.message,
    });
  }
};

// GET single role
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role || role.is_deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Role not found' });
    }

    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching role',
      error: error.message,
    });
  }
};

// UPDATE role
export const updateRole = async (req, res) => {
  try {
    const updated = await Role.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true },
    );
    return res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating role',
      error: error.message,
    });
  }
};

// DELETE role (soft delete)
export const deleteRole = async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting role',
      error: error.message,
    });
  }
};
