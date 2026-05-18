import {
  syncAllModulesToUsers,
  syncModuleToUsers,
} from '../../helper/moduleHelper.js';
import Module from '../../models/admin/moduleModel.js';

// Create a new module
export const createModule = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: 'Module name is required' });
  }

  try {
    const existing = await Module.findOne({ name });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Module already exists' });
    }

    const newModule = await Module.create({ name });

    await syncModuleToUsers('add', name);
    await syncAllModulesToUsers();

    res
      .status(201)
      .json({ success: true, message: 'Module created', data: newModule });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all modules
export const getAllModules = async (req, res) => {
  try {
    const modules = await Module.find({}).sort({ name: 1 });
    const moduleNames = modules.map((module) => module.name);
    res.status(200).json({ success: true, data: modules, moduleNames });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a module
export const updateModule = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  console.log('Id -Body', id, name);

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: 'Module name is required' });
  }

  try {
    const module = await Module.findById(id);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: 'Module not found' });
    }

    const oldName = module.name;
    module.name = name;
    await module.save();

    await syncModuleToUsers('rename', oldName, name);

    res
      .status(200)
      .json({ success: true, message: 'Module updated', data: module });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a module
export const deleteModule = async (req, res) => {
  const { id } = req.params;

  try {
    const module = await Module.findById(id);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: 'Module not found' });
    }

    const moduleName = module.name;
    await module.deleteOne();

    await syncModuleToUsers('delete', moduleName);

    res.status(200).json({ success: true, message: 'Module deleted' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
};
