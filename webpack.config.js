const path = require('path');
module.exports = {
  mode: 'none',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '/'),
    },
    port: 9000,
    hot: true,
  },
};
