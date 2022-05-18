'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/cjs/react-navigation-ts.min.js');
} else {
  module.exports = require('./dist/cjs/react-navigation-ts.js');
}
