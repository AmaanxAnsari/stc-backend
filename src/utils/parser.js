export const parseMaybeJSON = (val) => {
  if (!val) return undefined;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  }
  return undefined;
};
