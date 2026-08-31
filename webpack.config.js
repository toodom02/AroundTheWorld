const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'none',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'main.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      inject: 'body',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'static', to: 'static' },
        { from: 'resources', to: 'resources' },
        { from: 'main.css', to: 'main.css' },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, '/'),
    },
    port: 9000,
    hot: true,
  },
};
