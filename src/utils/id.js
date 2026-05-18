import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export function isHex24(str) {
  return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str);
}

// Strict validation: both isValid and canonical string roundtrip
export function isStrictObjectId(id) {
  if (id instanceof ObjectId) return true;
  if (!isHex24(id)) return false;
  return (
    ObjectId.isValid(id) &&
    new ObjectId(id).toString() === String(id).toLowerCase()
  );
}

export function toObjectId(id) {
  if (id instanceof ObjectId) return id;
  if (isStrictObjectId(id)) return new ObjectId(id);
  return null;
}

// Normalize values inside filters where fields are ObjectId-valued.
// Provide a map: { fieldName: 'single' | 'array' } to cast consistently.
export function normalizeFilterObjectIds(filter = {}, idMap = {}) {
  const out = { ...filter };
  for (const [field, mode] of Object.entries(idMap)) {
    const val = out[field];
    if (val == null) continue;

    if (mode === 'single') {
      const casted = toObjectId(val);
      if (casted) out[field] = casted;
    } else if (mode === 'array') {
      if (Array.isArray(val)) {
        const casted = val.map((v) => toObjectId(v)).filter(Boolean);
        if (casted.length) out[field] = casted;
      }
    }
  }
  // Support $in/$nin on known id fields
  for (const [field, mode] of Object.entries(idMap)) {
    const cond = out[field];
    if (cond && typeof cond === 'object') {
      for (const op of ['$in', '$nin']) {
        if (Array.isArray(cond[op])) {
          const casted = cond[op].map((v) => toObjectId(v)).filter(Boolean);
          if (casted.length) cond[op] = casted;
        }
      }
    }
  }
  return out;
}
