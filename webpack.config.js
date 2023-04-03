const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { resolve } = require('path');


const config = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
    },
    mode: "development",
    devtool: "inline-source-map",
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html',
        }),
    ],
    module: {
        rules: [
            {
                test: /\.js$/i,
                loader: 'babel-loader',
            },
        ],
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    }
};
module.exports = config