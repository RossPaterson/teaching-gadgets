const path = require('path');

module.exports = {
  mode: 'production',
  entry: './javascript/main.js',
  output: {
    path: path.join(process.cwd(), 'javascript'),
    filename: 'regex_language.js',
  },
};
