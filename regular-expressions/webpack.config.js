const path = require('path');

module.exports = {
  mode: 'production',
  entry: './javascript/main.js',
  output: {
    path: path.resolve(__dirname, 'javascript'),
    filename: 'regex_language.js',
  },
};
