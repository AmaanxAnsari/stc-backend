import { translateText } from "../utils/translator.js";
/**
 * Recursively traverse an object/array and translate all string fields.
 */
async function translateFields(data, lang) {
  if (typeof data === "string") {
    return await translateText(data, lang);
  }

  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => translateFields(item, lang)));
  }

  if (typeof data === "object" && data !== null) {
    const translated = {};
    for (const key of Object.keys(data)) {
      if (typeof data[key] === "string") {
        translated[key] = await translateText(data[key], lang);
      } else {
        translated[key] = await translateFields(data[key], lang);
      }
    }
    return translated;
  }

  return data;
}

export async function translateResponse(req, res, next) {
  const lang = req.query.lang;

  if (!lang || lang === "en") return next();

  const _send = res.json;

  res.json = async function (data) {
    if (data?.data) {
      data.data = await translateFields(data.data, lang);
    }
    return _send.call(this, data);
  };

  next();
}
