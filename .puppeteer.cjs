const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Isse Chrome aapke project folder ke andar `.cache/puppeteer` me install hoga
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
