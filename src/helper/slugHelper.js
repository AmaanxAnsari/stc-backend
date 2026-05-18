// export const generateSlug = (name = "") => {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")  // Replace all non-alphanumerics with "-"
//     .replace(/^-+|-+$/g, "");     // Trim leading/trailing hyphens
// };

import { v4 as uuidv4 } from 'uuid';

export const generateSlug = (name = '') => {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumerics with "-"
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

  const uniqueId = uuidv4(); // Generate a UUID
  return `${baseSlug}-${uniqueId}`;
};
