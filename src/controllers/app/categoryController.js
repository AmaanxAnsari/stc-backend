import { generateSlug } from "../../helper/slugHelper.js";
import Category from "../../models/admin/categoryModel.js";
import { createRepository } from "../../utils/repository.js";
import uploadHelper from "../../utils/uploadHelper.js";


const categoryRepo = createRepository(Category, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});


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



