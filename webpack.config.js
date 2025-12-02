const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/timeline-card.js",
  output: {
    filename: "timeline-card.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/locales",
          to: "locales",
        }
      ]
    })
  ],
  module: {
    rules: [
    ]
  },
};
