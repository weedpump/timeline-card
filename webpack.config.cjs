const path = require("path");

module.exports = {
  entry: "./src/timeline-card.js",
  output: {
    filename: "timeline-card.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["css-loader"],
      }
    ]
  },
};
