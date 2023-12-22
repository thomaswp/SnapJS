//webpack.config.js
const path = require('path');

module.exports = {
  mode: "development",
  devtool: "inline-source-map",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, 'build/'),
    filename: "snap-js.js", // <--- Will be compiled to this single file
    library: "SnapJS",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    fallback: { "vm": false },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  },
  externals: {
    sef: 'SEF',
  },
};