import { generateSlug } from "../../helper/slugHelper.js";
import Category from "../../models/admin/categoryModel.js";
import { createRepository } from "../../utils/repository.js";
import uploadHelper from "../../utils/uploadHelper.js";
// 
// 

const categoryRepo = createRepository(Category, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

export const createCategory = async (req, res) => {
  try {
    const {
      title,
      label,
      icon,
      image, 
      isActive,
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: title is required.',
      });
    }

    const slug =generateSlug(title)
    const outputDir = `categories/${slug}`;

    let iconUrl = icon || null;
    let imageUrl = image || null;

    const filePaths = uploadHelper.extractFilePaths(req.files);
    const iconFiles = filePaths.icon
    const imageFiles = filePaths.image

    if (iconFiles.length > 0) {
      const optimizedIcon = await uploadHelper.optimizeImage(
        iconFiles,
        { outputDir },
      );
      iconUrl = optimizedIcon; // store returned path/url from helper
    }

    if (imageFiles.length > 0) {
      const optimizedImage = await uploadHelper.optimizeImage(
        imageFiles,
        { outputDir },
      );
      imageUrl = optimizedImage;
    }

    // Build doc
    const category = new Category({
      title: title,
      label: label,
      slug: slug,
      icon: iconUrl || undefined,
      image: imageUrl || undefined,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    // Persist
    await category.save();

    // Success
    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'slug';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }
    console.error('Create category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. ' + error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User info missing.',
      });
    }

    const { id } = req.params;
    const {
      title,
      label,
      icon, 
      image,
    } = req.body;

    const existing = await Category.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    const slug = existing.slug;
    const outputDir = `categories/${slug}`;

    const filePaths = uploadHelper.extractFilePaths(req.files);

    if (filePaths?.icon) {
      existing.icon = await uploadHelper.mergeUploadedFiles({
        oldValue: existing.icon,
        newUploaded: filePaths.icon,
        filesToReplace: existing.icon,
        outputDir,
      });
    } else if (typeof icon === 'string' && icon.trim()) {
      existing.icon = icon.trim();
    }

    if (filePaths?.image) {
      existing.image = await uploadHelper.mergeUploadedFiles({
        oldValue: existing.image,
        newUploaded: filePaths.image,
        filesToReplace: existing.image,
        outputDir,
      });
    } else if (typeof image === 'string' && image.trim()) {
      existing.image = image.trim();
    }

    if (typeof title === 'string' && title.trim()) {
      existing.title = title.trim();
    }

    if (typeof label === 'string') {
      existing.label = label.trim();
    }

    // Audit
    existing.updatedBy = req.user.id;

    await existing.save();

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      data: existing,
    });
  } catch (error) {
    if (error && (error.code === 11000 || error.code === 11001)) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'slug';
      return res.status(409).json({
        success: false,
        message: `Duplicate value for ${dupField}. Please use a different ${dupField}.`,
      });
    }
    console.error('Update category error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCategory = async (req, res) => {
  try {
    const { page, limit, sort, q, isActive } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { mobile: { $regex: q, $options: 'i' } },
      ];
    }
    if (isActive != null) filter.isActive = isActive === 'true';

    const result = await categoryRepo.getAll({
      filter,
      sort: sort ? JSON.parse(sort) : undefined,
      page,
      limit,
      projection: {  },
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

export const deleteCategory = async (req, res) => {
  try {
    const result = await categoryRepo.removeById(req.params.id, { hard: false });

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


export const updateCategoryStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await categoryRepo.updateStatus(req.params.id, status, {
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


// App Controller

