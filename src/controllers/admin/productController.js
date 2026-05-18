import uploadHelper from '../../utils/uploadHelper.js';
import { generateSlug } from '../../helper/slugHelper.js';
import cleanupHelper from '../../helper/cleanupHelper.js';
import { createRepository } from '../../utils/repository.js';
import Product from './../../models/admin/productModel.js';

const productRepo = createRepository(Product, {
  softDelete: { enabled: true, field: 'isDeleted', timestamp: 'deletedAt' },
});

export const createProduct = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: 'Unauthorized: missing user info' });
    }

    const {
      category,
      name,
      description,
      featureTags,
      variants,
      specifications,
      inStock,
      rating,
      reviewCount,
    } = req.body;

    if (!name || !category) {
      return res
        .status(400)
        .json({ success: false, message: 'Name and category are required.' });
    }

    const slug = generateSlug(name);
    const fileLocation = `products/${slug}`;

    // Files
    const filesByField = uploadHelper.extractFilePaths(req.files);
    const processedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    const finalImage = processedFiles.image ?? null;
    // const finalImages = processedFiles.images
    //   ? Array.isArray(processedFiles.images)
    //     ? processedFiles.images
    //     : [processedFiles.images]
    //   : [];

    // Feature tags
    let parsedFeatureTags = [];
    try {
      parsedFeatureTags = JSON.parse(featureTags || '[]');
    } catch {
      parsedFeatureTags = [];
    }

    const finalFeatureTags = parsedFeatureTags.map((tag, index) => ({
      title: tag.title,
      icon: processedFiles[`featureTags[${index}][icon]`] ?? tag.icon ?? null,
    }));

    // Variants (simplified - no conversion logic)
    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || '[]');
    } catch {
      parsedVariants = [];
    }

    const finalVariants = parsedVariants.map((variant, index) => {
      const variantImages = processedFiles[`variants[${index}][images]`];

      return {
        quantity: variant.quantity,
        mrp: variant.mrp ? Number(variant.mrp) : 0,
        costPrice: variant.costPrice ? Number(variant.costPrice) : 0,
        images: variantImages
          ? Array.isArray(variantImages)
            ? variantImages
            : [variantImages]
          : Array.isArray(variant.images)
            ? variant.images
            : [],
      };
    });

    // Specifications
    let parsedSpecifications = {};
    try {
      parsedSpecifications = JSON.parse(specifications || '{}');
    } catch {
      parsedSpecifications = {};
    }

    const product = new Product({
      category,
      name,
      slug: fileLocation,
      description,
      image: finalImage,
      // images: finalImages,
      featureTags: finalFeatureTags,
      variants: finalVariants,
      specifications: parsedSpecifications,
      inStock: inStock ?? true,
      rating: rating ? Number(rating) : 0,
      reviewCount: reviewCount ? Number(reviewCount) : 0,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('❌ createProduct error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// V1
// export const updateProduct = async (req, res) => {
//   try {
//     if (!req.user?.id) {
//       return res.status(401).json({
//         success: false,
//         message: 'Unauthorized: missing user info',
//       });
//     }

//     const { id } = req.params;
//     const existingProduct = await Product.findById(id);
//     if (!existingProduct) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Product not found' });
//     }

//     const {
//       category,
//       name,
//       description,
//       featureTags,
//       variants,
//       specifications,
//       inStock,
//       rating,
//       reviewCount,
//     } = req.body;

//     const slug = existingProduct.slug;
//     const fileLocation = slug;

//     const filesByField = uploadHelper.extractFilePaths(req.files);
//     const processedFiles = await uploadHelper.processFiles(
//       filesByField,
//       fileLocation,
//     );

//     const finalImage = processedFiles.image ?? existingProduct.image;

//     // const finalImages = processedFiles.images
//     //   ? Array.isArray(processedFiles.images)
//     //     ? processedFiles.images
//     //     : [processedFiles.images]
//     //   : existingProduct.images || [];

//     // Feature tags
//     let parsedFeatureTags = [];
//     try {
//       parsedFeatureTags = JSON.parse(featureTags || '[]');
//     } catch {
//       parsedFeatureTags = [];
//     }

//     const finalFeatureTags =
//       parsedFeatureTags.length > 0
//         ? parsedFeatureTags.map((tag, index) => ({
//             title: tag.title,
//             icon: processedFiles[`featureTags[${index}][icon]`] ?? null,
//           }))
//         : existingProduct.featureTags || [];

//     // Variants (simplified - no conversion logic)
//     let finalVariants = existingProduct.variants || [];

//     if (variants) {
//       let parsedVariants = [];
//       try {
//         parsedVariants = JSON.parse(variants);
//       } catch {
//         parsedVariants = [];
//       }

//       finalVariants = parsedVariants.map((variant, index) => {
//         const variantImages = processedFiles[`variants[${index}][images]`];
//         const existingAtIndex = existingProduct.variants?.[index] || {};

//         return {
//           quantity: variant.quantity ?? existingAtIndex.quantity,
//           mrp:
//             variant.mrp != null
//               ? Number(variant.mrp)
//               : (existingAtIndex.mrp ?? 0),
//           costPrice:
//             variant.costPrice != null
//               ? Number(variant.costPrice)
//               : (existingAtIndex.costPrice ?? 0),
//           images: variantImages
//             ? Array.isArray(variantImages)
//               ? variantImages
//               : [variantImages]
//             : Array.isArray(variant.images)
//               ? variant.images
//               : existingAtIndex.images || [],
//         };
//       });
//     }

//     // Specifications
//     let parsedSpecifications = existingProduct.specifications || {};
//     try {
//       parsedSpecifications = JSON.parse(specifications || '{}');
//     } catch {
//       // keep existing
//     }

//     // Apply updates
//     existingProduct.category = category ?? existingProduct.category;
//     existingProduct.name = name ?? existingProduct.name;
//     existingProduct.description = description ?? existingProduct.description;
//     existingProduct.image = finalImage;
//     // existingProduct.images = finalImages;
//     existingProduct.featureTags = finalFeatureTags;
//     existingProduct.variants = finalVariants;
//     existingProduct.specifications = parsedSpecifications;
//     existingProduct.inStock = inStock ?? existingProduct.inStock;
//     existingProduct.rating =
//       rating != null ? Number(rating) : existingProduct.rating;
//     existingProduct.reviewCount =
//       reviewCount != null ? Number(reviewCount) : existingProduct.reviewCount;
//     existingProduct.updatedBy = req.user.id;
//     existingProduct.updatedAt = new Date();

//     await existingProduct.save();

//     await cleanupHelper.autoFolderCleaner(
//       existingProduct.slug,
//       existingProduct,
//     );

//     return res.status(200).json({
//       success: true,
//       message: '✅ Product updated successfully',
//       data: existingProduct,
//     });
//   } catch (error) {
//     console.error('❌ updateProduct error:', error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || 'Server error',
//     });
//   }
// };


// V2
export const updateProduct = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user info',
      });
    }

    const { id } = req.params;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    const {
      category,
      name,
      description,
      featureTags,
      variants,
      specifications,
      inStock,
      rating,
      reviewCount,
    } = req.body;

    const slug = existingProduct.slug;
    const fileLocation = slug;

    // Extract & process uploaded files
    const filesByField = uploadHelper.extractFilePaths(req.files);
    const processedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    // ✅ Main image
    const finalImage = processedFiles.image ?? existingProduct.image;

    // ✅ Feature Tags (auto image retention/removal)
    let parsedFeatureTags = [];
    try {
      parsedFeatureTags = JSON.parse(featureTags || '[]');
    } catch {
      parsedFeatureTags = [];
    }

    const finalFeatureTags = await Promise.all(
      parsedFeatureTags.map(async (tag, index) => {
        const uploadedIcon = processedFiles[`featureTags[${index}][icon]`];
        const existingIcon = existingProduct.featureTags?.[index]?.icon ?? null;

        const mergedIcon = await uploadHelper.syncUploadedFiles({
          oldFiles: existingIcon,
          newFiles: tag.icon,
          uploadedFiles: uploadedIcon,
          outputDir: fileLocation,
        });

        return {
          title: tag.title,
          icon: Array.isArray(mergedIcon) ? mergedIcon[0] : mergedIcon,
        };
      }),
    );

    // ✅ Variants (auto detect added/removed images)
    let parsedVariants = [];
    try {
      parsedVariants = JSON.parse(variants || '[]');
    } catch {
      parsedVariants = [];
    }

    const finalVariants = await Promise.all(
      parsedVariants.map(async (variant, index) => {
        const uploadedVariantImages =
          processedFiles[`variants[${index}][images]`];
        const existingAtIndex = existingProduct.variants?.[index] || {};

        const mergedImages = await uploadHelper.syncUploadedFiles({
          oldFiles: existingAtIndex.images || [],
          newFiles: variant.images || [],
          uploadedFiles: uploadedVariantImages,
          outputDir: fileLocation,
        });

        return {
          quantity: variant.quantity ?? existingAtIndex.quantity,
          mrp:
            variant.mrp != null
              ? Number(variant.mrp)
              : (existingAtIndex.mrp ?? 0),
          costPrice:
            variant.costPrice != null
              ? Number(variant.costPrice)
              : (existingAtIndex.costPrice ?? 0),
          images: mergedImages,
        };
      }),
    );

    // ✅ Specifications
    let parsedSpecifications = existingProduct.specifications || {};
    try {
      parsedSpecifications = JSON.parse(specifications || '{}');
    } catch {}

    // ✅ Apply updates
    Object.assign(existingProduct, {
      category: category ?? existingProduct.category,
      name: name ?? existingProduct.name,
      description: description ?? existingProduct.description,
      image: finalImage,
      featureTags: finalFeatureTags,
      variants: finalVariants,
      specifications: parsedSpecifications,
      inStock: inStock ?? existingProduct.inStock,
      rating: rating != null ? Number(rating) : existingProduct.rating,
      reviewCount:
        reviewCount != null ? Number(reviewCount) : existingProduct.reviewCount,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await existingProduct.save();

    await cleanupHelper.autoFolderCleaner(
      existingProduct.slug,
      existingProduct,
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: existingProduct,
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};


// Add new variant to existing product
export const addVariantToProduct = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user info',
      });
    }

    const { id } = req.params;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    let { variant } = req.body;
    console.log('variant', variant);
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: 'Variant data is required',
      });
    }
    if (typeof variant === 'string') {
      try {
        variant = JSON.parse(variant);
      } catch (err) {
        console.error('Error parsing variant JSON:', err);
      }
    }

    const slug = existingProduct.slug;
    const fileLocation = slug;

    const filesByField = uploadHelper.extractFilePaths(req.files);
    const processedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    const newVariantIndex = existingProduct.variants.length;

    // Handle variant images
    const variantImages =
      processedFiles[`variant[images]`] || processedFiles.images;

    // Build the new variant object (simplified)
    const newVariant = {
      quantity: variant.quantity,
      mrp: variant.mrp ? Number(variant.mrp) : 0,
      costPrice: variant.costPrice ? Number(variant.costPrice) : 0,
      images: variantImages
        ? Array.isArray(variantImages)
          ? variantImages
          : [variantImages]
        : Array.isArray(variant.images)
          ? variant.images
          : [],
    };

    existingProduct.variants.push(newVariant);
    existingProduct.updatedBy = req.user.id;
    existingProduct.updatedAt = new Date();

    await existingProduct.save();
    await cleanupHelper.autoFolderCleaner(
      existingProduct.slug,
      existingProduct,
    );

    return res.status(200).json({
      success: true,
      message: 'Variant added successfully',
      data: existingProduct,
      newVariantIndex,
    });
  } catch (error) {
    console.error('❌ addVariantToProduct error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// Update specific variant in existing product
export const updateProductVariant = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user info',
      });
    }

    const { id, variantIndex } = req.params;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const varIndex = parseInt(variantIndex);
    if (
      isNaN(varIndex) ||
      varIndex < 0 ||
      varIndex >= existingProduct.variants.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variant index',
      });
    }

    let { variant } = req.body;
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: 'Variant data is required',
      });
    }
    if (typeof variant === 'string') {
      try {
        variant = JSON.parse(variant);
      } catch (err) {
        console.error('Error parsing variant JSON:', err);
      }
    }

    const slug = existingProduct.slug;
    const fileLocation = slug;

    const filesByField = uploadHelper.extractFilePaths(req.files);
    const processedFiles = await uploadHelper.processFiles(
      filesByField,
      fileLocation,
    );

    const variantImages =
      processedFiles[`variant[images]`] || processedFiles.images;
    const currentVariant = existingProduct.variants[varIndex];

    // Update variant fields (simplified)
    existingProduct.variants[varIndex] = {
      quantity: variant.quantity ?? currentVariant.quantity,
      mrp: variant.mrp != null ? Number(variant.mrp) : currentVariant.mrp,
      costPrice:
        variant.costPrice != null
          ? Number(variant.costPrice)
          : currentVariant.costPrice,
      images: variantImages
        ? Array.isArray(variantImages)
          ? variantImages
          : [variantImages]
        : Array.isArray(variant.images)
          ? variant.images
          : currentVariant.images || [],
    };

    existingProduct.updatedBy = req.user.id;
    existingProduct.updatedAt = new Date();

    await existingProduct.save();
    await cleanupHelper.autoFolderCleaner(
      existingProduct.slug,
      existingProduct,
    );

    return res.status(200).json({
      success: true,
      message: 'Variant updated successfully',
      data: existingProduct,
    });
  } catch (error) {
    console.error('❌ updateProductVariant error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// Delete specific variant from product
export const deleteProductVariant = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing user info',
      });
    }

    const { id, variantIndex } = req.params;
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const varIndex = parseInt(variantIndex);
    if (
      isNaN(varIndex) ||
      varIndex < 0 ||
      varIndex >= existingProduct.variants.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variant index',
      });
    }

    if (existingProduct.variants.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last variant. Delete the product instead.',
      });
    }

    existingProduct.variants.splice(varIndex, 1);
    existingProduct.updatedBy = req.user.id;
    existingProduct.updatedAt = new Date();

    await existingProduct.save();

    return res.status(200).json({
      success: true,
      message: 'Variant deleted successfully',
      data: existingProduct,
    });
  } catch (error) {
    console.error('❌ deleteProductVariant error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

export const getAllProducts = async (req, res) => {
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

    const result = await productRepo.getAll({
      filter: { ...filter },
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

export const getProductById = async (req, res) => {
  try {
    const result = await productRepo.getById(req.params.id, {
      projection: {},
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

export const updateProductStatus = async (req, res) => {
  try {
    const status = req.body;

    const result = await productRepo.updateStatus(req.params.id, status, {
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

export const deleteProduct = async (req, res) => {
  try {
    const result = await productRepo.removeById(req.params.id, {
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

// category:Soap
// name:Lavender Handmade Soap
// description: Gentle, natural soap for all skin types.
// specifications: {"brandType":"Natural","productType":"Soap","usage":"Daily"}
// variants: [{"quantity":"100g","costPrice":50,"mrp":80,"conversion":{"rootLevel":"box","bottomLevel":"unit","levels":[{"levelName":"box","displayName":"Box (12 units)","multiplierToChild":12,"childLevel":"unit","sku":"SOAP-BOX-100","barcode":"1234567890123"},{"levelName":"unit","displayName":"Single Soap (100g)","multiplierToChild":1,"childLevel":null,"sku":"SOAP-UNIT-100","barcode":"1234567890124"}]}},{"quantity":"200g","costPrice":90,"mrp":150,"conversion":{"rootLevel":"carton","bottomLevel":"unit","levels":[{"levelName":"carton","displayName":"Carton (6 boxes)","multiplierToChild":6,"childLevel":"box","sku":"SOAP-CARTON-200"},{"levelName":"box","displayName":"Box (8 units)","multiplierToChild":8,"childLevel":"unit","sku":"SOAP-BOX-200"},{"levelName":"unit","displayName":"Single Soap (200g)","multiplierToChild":1,"childLevel":null,"sku":"SOAP-UNIT-200"}]}}]
// featureTags: [{"title":"Organic"},{"title":"Eco-Friendly"}]
