import mongoose from 'mongoose';
import {
  toObjectId,
  isStrictObjectId,
  normalizeFilterObjectIds,
} from './id.js';

const DEFAULTS = {
  projection: null,
  sort: { createdAt: -1, _id: -1 },
  lean: true,
  page: 1,
  limit: 20,
  maxLimit: 100,
  allowDiskUse: false,
  collation: undefined,
  populate: null,
  paginate: true,
};

const FALLBACKS = {
  listEmpty: 'No records found.',
  notFound: 'Resource not found.',
  deleted: 'Resource deleted successfully.',
  deleteNotFound: 'Resource to delete not found.',
  badRequest: 'Invalid request parameters.',
  serverError: 'An unexpected error occurred.',
};

const safeNumber = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

function clampLimit(rawLimit, maxLimit) {
  const n = safeNumber(rawLimit, DEFAULTS.limit);
  return n > maxLimit ? maxLimit : n;
}

function buildFindOptions(options = {}) {
  const page = safeNumber(options.page, DEFAULTS.page);
  const limit = clampLimit(
    options.limit,
    options.maxLimit ?? DEFAULTS.maxLimit,
  );
  const skip = (page - 1) * limit;
  return {
    filter: options.filter || {},
    projection: options.projection ?? DEFAULTS.projection,
    sort: options.sort || DEFAULTS.sort,
    lean: options.lean ?? DEFAULTS.lean,
    page,
    limit,
    skip,
    collation: options.collation ?? DEFAULTS.collation,
    hint: options.hint,
    populate: options.populate ?? DEFAULTS.populate,
    paginate: options.paginate ?? DEFAULTS.paginate,
  };
}

function applyPopulate(query, populate) {
  if (!populate) return query;

  if (Array.isArray(populate)) {
    populate.forEach((pop) => {
      query = query.populate(pop);
    });
  } else if (typeof populate === 'string') {
    query = query.populate(populate);
  } else if (typeof populate === 'object') {
    query = query.populate(populate);
  }

  return query;
}

export function createRepository(Model, cfg = {}) {
  if (!Model || !Model.modelName) throw new Error('Model is required');

  const FALLBACK = { ...FALLBACKS, ...(cfg.fallbacks || {}) };
  const DEFAULT_ID_FIELD = cfg.idField || '_id';
  const SOFT_DELETE = cfg.softDelete || {
    enabled: false,
    field: 'is_deleted',
    timestamp: 'deletedAt',
  };
  const FILTER_ID_MAP = cfg.filterIdMap || {};

  function withSoftDelete(filter = {}) {
    if (!SOFT_DELETE.enabled) return filter;
    const f = { ...filter };
    if (f[SOFT_DELETE.field] == null) f[SOFT_DELETE.field] = false;
    return f;
  }

  function sanitizeFilter(filter = {}) {
    const casted = normalizeFilterObjectIds(filter, FILTER_ID_MAP);
    return withSoftDelete(casted);
  }

  // -------------------- GET ALL --------------------
  async function getAll(options = {}) {
    try {
      const q = buildFindOptions(options);
      const filter = sanitizeFilter(q.filter);

      let query = Model.find(filter, q.projection).sort(q.sort);

      // Apply pagination only if paginate is true
      if (q.paginate) {
        query = query.skip(q.skip).limit(q.limit);
      }

      if (q.lean) query = query.lean({ getters: true, virtuals: false });
      if (q.hint) query = query.hint(q.hint);
      if (q.collation) query = query.collation(q.collation);

      // Apply populate
      query = applyPopulate(query, q.populate);

      // Only count if pagination is enabled
      const [docs, total] = await Promise.all([
        query.exec(),
        q.paginate
          ? Model.countDocuments(filter).exec()
          : Promise.resolve(null),
      ]);

      // If pagination is disabled, return simple response
      if (!q.paginate) {
        if (!docs.length) {
          return {
            status: 200,
            success: true,
            data: [],
            message: FALLBACK.listEmpty,
          };
        }
        return {
          status: 200,
          success: true,
          data: docs,
          message: 'Fetched successfully.',
        };
      }

      // Paginated response
      const totalPages = Math.ceil(total / q.limit) || 0;
      const base = {
        status: 200,
        success: true,
        page: q.page,
        limit: q.limit,
        total,
        totalPages,
      };

      if (!docs.length) {
        return { ...base, data: [], message: FALLBACK.listEmpty };
      }

      return { ...base, data: docs, message: 'Fetched successfully.' };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  // -------------------- CURSOR PAGED GET --------------------
  async function getAllByCursor(options = {}) {
    try {
      const {
        filter = {},
        projection = null,
        sort = { _id: -1 },
        limit: rawLimit = DEFAULTS.limit,
        cursor,
        sortField = '_id',
        lean = true,
        collation,
        hint,
        populate = null,
      } = options;

      const limit = clampLimit(rawLimit, options.maxLimit ?? DEFAULTS.maxLimit);
      const baseFilter = sanitizeFilter(filter);

      const direction = sort[sortField] === -1 ? '$lt' : '$gt';
      const cursorFilter =
        cursor != null
          ? { [sortField]: { [direction]: cursor }, ...baseFilter }
          : baseFilter;

      let query = Model.find(cursorFilter, projection)
        .sort(sort)
        .limit(limit + 1);
      if (lean) query = query.lean({ getters: true, virtuals: false });
      if (hint) query = query.hint(hint);
      if (collation) query = query.collation(collation);

      // Apply populate
      query = applyPopulate(query, populate);

      const rows = await query.exec();
      const hasNext = rows.length > limit;
      const data = hasNext ? rows.slice(0, limit) : rows;
      const nextCursor = data.length ? data[data.length - 1][sortField] : null;

      return {
        success: true,
        status: 200,
        data,
        nextCursor: hasNext ? nextCursor : null,
        hasNext,
        message: 'Fetched successfully.',
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  // -------------------- GET BY ID --------------------
  async function getById(id, options = {}) {
    try {
      const oid = toObjectId(id);
      if (!oid)
        return {
          success: false,
          status: 400,
          message: FALLBACK.badRequest,
        };

      const filter = withSoftDelete({ [DEFAULT_ID_FIELD]: oid });

      let query = Model.findOne(filter, options.projection ?? null);
      if (options.lean ?? true)
        query = query.lean({ getters: true, virtuals: false });

      // Apply populate
      query = applyPopulate(query, options.populate);

      const doc = await query.exec();

      if (!doc)
        return {
          success: false,
          status: 404,
          message: FALLBACK.notFound,
        };

      return {
        success: true,
        status: 200,
        data: doc,
        message: 'Fetched successfully.',
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  // -------------------- DELETE / SOFT DELETE --------------------
  async function removeById(id, options = {}) {
    try {
      const oid = toObjectId(id);
      if (!oid)
        return {
          success: false,
          status: 400,
          message: FALLBACK.badRequest,
        };

      if (SOFT_DELETE.enabled && !options.hard) {
        const update = { [SOFT_DELETE.field]: true };
        if (SOFT_DELETE.timestamp) update[SOFT_DELETE.timestamp] = new Date();

        let query = Model.findOneAndUpdate(
          { [DEFAULT_ID_FIELD]: oid },
          { $set: update },
          { new: true, projection: options.projection ?? null, lean: true },
        );

        // Apply populate if needed
        query = applyPopulate(query, options.populate);

        const doc = await query;

        if (!doc)
          return {
            success: false,
            status: 404,
            message: FALLBACK.deleteNotFound,
          };
        return {
          success: true,
          status: 200,
          data: doc,
          message: FALLBACK.deleted,
        };
      }

      let query = Model.findOneAndDelete(
        { [DEFAULT_ID_FIELD]: oid },
        { projection: options.projection ?? null, lean: true },
      );

      // Apply populate if needed
      query = applyPopulate(query, options.populate);

      const doc = await query;

      if (!doc)
        return {
          success: false,
          status: 404,
          message: FALLBACK.deleteNotFound,
        };
      return {
        success: true,
        status: 200,
        data: doc,
        message: FALLBACK.deleted,
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  // -------------------- STATUS UPDATE --------------------
  const SCHEMA_PATHS = new Set(Object.keys(Model.schema.paths));
  const STRICT_UPDATES = cfg.strictUpdates ?? 'schema';
  const ALLOWED_STATUS_FIELDS = new Set(
    Array.isArray(cfg.allowedStatusFields) ? cfg.allowedStatusFields : [],
  );

  function filterUpdatePaths(patch = {}) {
    const out = {};
    for (const [k, v] of Object.entries(patch)) {
      if (STRICT_UPDATES === 'allowlist') {
        if (ALLOWED_STATUS_FIELDS.has(k)) out[k] = v;
      } else if (STRICT_UPDATES === 'none') {
        out[k] = v;
      } else {
        if (SCHEMA_PATHS.has(k)) out[k] = v;
      }
    }
    return out;
  }

  async function updateStatus(id, statusPatch = {}, options = {}) {
    try {
      const oid = toObjectId(id);
      if (!oid)
        return {
          success: false,
          status: 400,
          message: FALLBACK.badRequest,
        };

      const updateSet = filterUpdatePaths(statusPatch);
      if (!Object.keys(updateSet).length) {
        return {
          success: false,
          status: 400,
          message: FALLBACK.badRequest,
        };
      }

      if (
        SOFT_DELETE.enabled &&
        updateSet[SOFT_DELETE.field] === true &&
        SOFT_DELETE.timestamp
      ) {
        updateSet[SOFT_DELETE.timestamp] = new Date();
      }

      const filter = { [DEFAULT_ID_FIELD]: oid };
      const findOpts = {
        new: true,
        returnDocument: 'after',
        runValidators: true,
        projection: options.projection ?? null,
      };

      let query = Model.findOneAndUpdate(filter, { $set: updateSet }, findOpts);
      if (options.hint) query = query.hint(options.hint);
      if (options.collation) query = query.collation(options.collation);

      // Apply populate if needed
      query = applyPopulate(query, options.populate);

      const doc = await query.exec();
      if (!doc)
        return {
          success: false,
          status: 404,
          message: FALLBACK.notFound,
        };

      if (options.lean ?? true) {
        let leanQuery = Model.findOne(
          { [DEFAULT_ID_FIELD]: oid },
          options.projection ?? null,
        ).lean({ getters: true, virtuals: false });

        // Apply populate for lean query too
        leanQuery = applyPopulate(leanQuery, options.populate);

        const leanDoc = await leanQuery.exec();
        return {
          success: true,
          status: 200,
          data: leanDoc,
          message: 'Updated successfully.',
        };
      }

      return {
        success: true,
        status: 200,
        data: doc,
        message: 'Updated successfully.',
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  // -------------------- AGGREGATION PAGED --------------------
  async function aggregatePaged({
    pipeline = [],
    page = 1,
    limit = 20,
    allowDiskUse,
    hint,
    collation,
    paginate = true,
  }) {
    try {
      const l = clampLimit(limit, DEFAULTS.maxLimit);
      const s = (safeNumber(page, 1) - 1) * l;

      let finalPipeline;

      if (paginate) {
        // Paginated aggregation with $facet
        finalPipeline = [
          ...pipeline,
          {
            $facet: {
              data: [{ $skip: s }, { $limit: l }],
              meta: [{ $count: 'total' }],
            },
          },
        ];
      } else {
        // Non-paginated aggregation
        finalPipeline = [...pipeline];
      }

      let agg = Model.aggregate(finalPipeline);
      if (allowDiskUse ?? DEFAULTS.allowDiskUse) agg = agg.allowDiskUse(true);
      if (hint) agg = agg.hint(hint);
      if (collation) agg = agg.collation(collation);

      const result = await agg.exec();

      if (!paginate) {
        // Return simple response without pagination metadata
        return {
          success: true,
          status: 200,
          data: result,
          message: 'Fetched successfully.',
        };
      }

      // Paginated response
      const [facetResult] = result;
      const data = facetResult?.data || [];
      const total = facetResult?.meta?.[0]?.total || 0;
      return {
        success: true,
        status: 200,
        data,
        page,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 0,
        message: 'Fetched successfully.',
      };
    } catch (err) {
      return {
        success: false,
        status: 500,
        message: FALLBACK.serverError,
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
      };
    }
  }

  return {
    getAll,
    getAllByCursor,
    getById,
    removeById,
    aggregatePaged,
    updateStatus,
    fallbacks: FALLBACK,
  };
}

// import mongoose from 'mongoose';
// import {
//   toObjectId,
//   isStrictObjectId,
//   normalizeFilterObjectIds,
// } from './id.js';

// const DEFAULTS = {
//   projection: null,
//   sort: { createdAt: -1, _id: -1 },
//   lean: true,
//   page: 1,
//   limit: 20,
//   maxLimit: 100,
//   allowDiskUse: false,
//   collation: undefined,
// };

// const FALLBACKS = {
//   listEmpty: 'No records found.',
//   notFound: 'Resource not found.',
//   deleted: 'Resource deleted successfully.',
//   deleteNotFound: 'Resource to delete not found.',
//   badRequest: 'Invalid request parameters.',
//   serverError: 'An unexpected error occurred.',
// };

// const safeNumber = (v, def) => {
//   const n = Number(v);
//   return Number.isFinite(n) && n > 0 ? n : def;
// };

// function clampLimit(rawLimit, maxLimit) {
//   const n = safeNumber(rawLimit, DEFAULTS.limit);
//   return n > maxLimit ? maxLimit : n;
// }

// function buildFindOptions(options = {}) {
//   const page = safeNumber(options.page, DEFAULTS.page);
//   const limit = clampLimit(
//     options.limit,
//     options.maxLimit ?? DEFAULTS.maxLimit,
//   );
//   const skip = (page - 1) * limit;
//   return {
//     filter: options.filter || {},
//     projection: options.projection ?? DEFAULTS.projection,
//     sort: options.sort || DEFAULTS.sort,
//     lean: options.lean ?? DEFAULTS.lean,
//     page,
//     limit,
//     skip,
//     collation: options.collation ?? DEFAULTS.collation,
//     hint: options.hint,
//   };
// }

// export function createRepository(Model, cfg = {}) {
//   if (!Model || !Model.modelName) throw new Error('Model is required');

//   const FALLBACK = { ...FALLBACKS, ...(cfg.fallbacks || {}) };
//   const DEFAULT_ID_FIELD = cfg.idField || '_id';
//   const SOFT_DELETE = cfg.softDelete || {
//     enabled: false,
//     field: 'is_deleted',
//     timestamp: 'deletedAt',
//   };
//   const FILTER_ID_MAP = cfg.filterIdMap || {};

//   function withSoftDelete(filter = {}) {
//     if (!SOFT_DELETE.enabled) return filter;
//     const f = { ...filter };
//     if (f[SOFT_DELETE.field] == null) f[SOFT_DELETE.field] = false;
//     return f;
//   }

//   function sanitizeFilter(filter = {}) {
//     const casted = normalizeFilterObjectIds(filter, FILTER_ID_MAP);
//     return withSoftDelete(casted);
//   }

//   // -------------------- GET ALL --------------------
//   async function getAll(options = {}) {
//     try {
//       const q = buildFindOptions(options);
//       const filter = sanitizeFilter(q.filter);

//       let query = Model.find(filter, q.projection)
//         .sort(q.sort)
//         .skip(q.skip)
//         .limit(q.limit);
//       if (q.lean) query = query.lean({ getters: true, virtuals: false });
//       if (q.hint) query = query.hint(q.hint);
//       if (q.collation) query = query.collation(q.collation);

//       const [docs, total] = await Promise.all([
//         query.exec(),
//         Model.countDocuments(filter).exec(),
//       ]);

//       const totalPages = Math.ceil(total / q.limit) || 0;
//       const base = {
//         status: 200,
//         success: true,
//         page: q.page,
//         limit: q.limit,
//         total,
//         totalPages,
//       };

//       if (!docs.length) {
//         return { ...base, data: [], message: FALLBACK.listEmpty };
//       }

//       return { ...base, data: docs, message: 'Fetched successfully.' };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   // -------------------- CURSOR PAGED GET --------------------
//   async function getAllByCursor(options = {}) {
//     try {
//       const {
//         filter = {},
//         projection = null,
//         sort = { _id: -1 },
//         limit: rawLimit = DEFAULTS.limit,
//         cursor,
//         sortField = '_id',
//         lean = true,
//         collation,
//         hint,
//       } = options;

//       const limit = clampLimit(rawLimit, options.maxLimit ?? DEFAULTS.maxLimit);
//       const baseFilter = sanitizeFilter(filter);

//       const direction = sort[sortField] === -1 ? '$lt' : '$gt';
//       const cursorFilter =
//         cursor != null
//           ? { [sortField]: { [direction]: cursor }, ...baseFilter }
//           : baseFilter;

//       let query = Model.find(cursorFilter, projection)
//         .sort(sort)
//         .limit(limit + 1);
//       if (lean) query = query.lean({ getters: true, virtuals: false });
//       if (hint) query = query.hint(hint);
//       if (collation) query = query.collation(collation);

//       const rows = await query.exec();
//       const hasNext = rows.length > limit;
//       const data = hasNext ? rows.slice(0, limit) : rows;
//       const nextCursor = data.length ? data[data.length - 1][sortField] : null;

//       return {
//         success: true,
//         status: 200,
//         data,
//         nextCursor: hasNext ? nextCursor : null,
//         hasNext,
//         message: 'Fetched successfully.',
//       };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   // -------------------- GET BY ID --------------------
//   async function getById(id, options = {}) {
//     try {
//       const oid = toObjectId(id);
//       if (!oid)
//         return {
//           success: false,
//           status: 400,
//           message: FALLBACK.badRequest,
//         };

//       const filter = withSoftDelete({ [DEFAULT_ID_FIELD]: oid });

//       let query = Model.findOne(filter, options.projection ?? null);
//       if (options.lean ?? true)
//         query = query.lean({ getters: true, virtuals: false });
//       const doc = await query.exec();

//       if (!doc)
//         return {
//           success: false,
//           status: 404,
//           message: FALLBACK.notFound,
//         };

//       return {
//         success: true,
//         status: 200,
//         data: doc,
//         message: 'Fetched successfully.',
//       };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   // -------------------- DELETE / SOFT DELETE --------------------
//   async function removeById(id, options = {}) {
//     try {
//       const oid = toObjectId(id);
//       if (!oid)
//         return {
//           success: false,
//           status: 400,
//           message: FALLBACK.badRequest,
//         };

//       if (SOFT_DELETE.enabled && !options.hard) {
//         const update = { [SOFT_DELETE.field]: true };
//         if (SOFT_DELETE.timestamp) update[SOFT_DELETE.timestamp] = new Date();
//         const doc = await Model.findOneAndUpdate(
//           { [DEFAULT_ID_FIELD]: oid },
//           { $set: update },
//           { new: true, projection: options.projection ?? null, lean: true },
//         );
//         if (!doc)
//           return {
//             success: false,
//             status: 404,
//             message: FALLBACK.deleteNotFound,
//           };
//         return {
//           success: true,
//           status: 200,
//           data: doc,
//           message: FALLBACK.deleted,
//         };
//       }

//       const doc = await Model.findOneAndDelete(
//         { [DEFAULT_ID_FIELD]: oid },
//         { projection: options.projection ?? null, lean: true },
//       );
//       if (!doc)
//         return {
//           success: false,
//           status: 404,
//           message: FALLBACK.deleteNotFound,
//         };
//       return {
//         success: true,
//         status: 200,
//         data: doc,
//         message: FALLBACK.deleted,
//       };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   // -------------------- STATUS UPDATE --------------------
//   const SCHEMA_PATHS = new Set(Object.keys(Model.schema.paths));
//   const STRICT_UPDATES = cfg.strictUpdates ?? 'schema';
//   const ALLOWED_STATUS_FIELDS = new Set(
//     Array.isArray(cfg.allowedStatusFields) ? cfg.allowedStatusFields : [],
//   );

//   function filterUpdatePaths(patch = {}) {
//     const out = {};
//     for (const [k, v] of Object.entries(patch)) {
//       if (STRICT_UPDATES === 'allowlist') {
//         if (ALLOWED_STATUS_FIELDS.has(k)) out[k] = v;
//       } else if (STRICT_UPDATES === 'none') {
//         out[k] = v;
//       } else {
//         if (SCHEMA_PATHS.has(k)) out[k] = v;
//       }
//     }
//     return out;
//   }

//   async function updateStatus(id, statusPatch = {}, options = {}) {
//     try {
//       const oid = toObjectId(id);
//       if (!oid)
//         return {
//           success: false,
//           status: 400,
//           message: FALLBACK.badRequest,
//         };

//       const updateSet = filterUpdatePaths(statusPatch);
//       if (!Object.keys(updateSet).length) {
//         return {
//           success: false,
//           status: 400,
//           message: FALLBACK.badRequest,
//         };
//       }

//       if (
//         SOFT_DELETE.enabled &&
//         updateSet[SOFT_DELETE.field] === true &&
//         SOFT_DELETE.timestamp
//       ) {
//         updateSet[SOFT_DELETE.timestamp] = new Date();
//       }

//       const filter = { [DEFAULT_ID_FIELD]: oid };
//       const findOpts = {
//         new: true,
//         returnDocument: 'after',
//         runValidators: true,
//         projection: options.projection ?? null,
//       };

//       let query = Model.findOneAndUpdate(filter, { $set: updateSet }, findOpts);
//       if (options.hint) query = query.hint(options.hint);
//       if (options.collation) query = query.collation(options.collation);

//       const doc = await query.exec();
//       if (!doc)
//         return {
//           success: false,
//           status: 404,
//           message: FALLBACK.notFound,
//         };

//       if (options.lean ?? true) {
//         const leanDoc = await Model.findOne(
//           { [DEFAULT_ID_FIELD]: oid },
//           options.projection ?? null,
//         )
//           .lean({ getters: true, virtuals: false })
//           .exec();
//         return {
//           success: true,
//           status: 200,
//           data: leanDoc,
//           message: 'Updated successfully.',
//         };
//       }

//       return {
//         success: true,
//         status: 200,
//         data: doc,
//         message: 'Updated successfully.',
//       };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   // -------------------- AGGREGATION PAGED --------------------
//   async function aggregatePaged({
//     pipeline = [],
//     page = 1,
//     limit = 20,
//     allowDiskUse,
//     hint,
//     collation,
//   }) {
//     try {
//       const l = clampLimit(limit, DEFAULTS.maxLimit);
//       const s = (safeNumber(page, 1) - 1) * l;

//       const facetPipe = [
//         ...pipeline,
//         {
//           $facet: {
//             data: [{ $skip: s }, { $limit: l }],
//             meta: [{ $count: 'total' }],
//           },
//         },
//       ];

//       let agg = Model.aggregate(facetPipe);
//       if (allowDiskUse ?? DEFAULTS.allowDiskUse) agg = agg.allowDiskUse(true);
//       if (hint) agg = agg.hint(hint);
//       if (collation) agg = agg.collation(collation);

//       const [result] = await agg.exec();
//       const data = result?.data || [];
//       const total = result?.meta?.[0]?.total || 0;
//       return {
//         success: true,
//         status: 200,
//         data,
//         page,
//         limit: l,
//         total,
//         totalPages: Math.ceil(total / l) || 0,
//         message: 'Fetched successfully.',
//       };
//     } catch (err) {
//       return {
//         success: false,
//         status: 500,
//         message: FALLBACK.serverError,
//         error: process.env.NODE_ENV === 'production' ? undefined : err.message,
//       };
//     }
//   }

//   return {
//     getAll,
//     getAllByCursor,
//     getById,
//     removeById,
//     aggregatePaged,
//     updateStatus,
//     fallbacks: FALLBACK,
//   };
// }
