const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const VueLoaderPlugin = require('./loader/vue-loader-plugin')

const config = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
  },
  mode: "development",
  devtool: "cheap-source-map",
  devServer: {
    open: true,

    host: "localhost",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
    new VueLoaderPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.vue$/,
        // loader: 'vue-loader'
        loader: path.resolve(__dirname, 'loader/vue-loader.js'),
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.js$/i,
        loader: "babel-loader",
        options: {
          presets: ['@babel/preset-env'],
        }
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      'vue$': path.resolve(__dirname, "src/vue")
    },
  },
};
module.exports = config;
