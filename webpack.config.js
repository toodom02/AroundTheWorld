const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.ts',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
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
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          three: {
            test: /[\\/]node_modules[\\/]three[\\/]/,
            name: 'three',
            priority: 10,
            reuseExistingChunk: true,
          },
          cannon: {
            test: /[\\/]node_modules[\\/]cannon-es[\\/]/,
            name: 'cannon',
            priority: 10,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        inject: 'body',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {from: 'static', to: 'static'},
          {from: 'resources', to: 'resources'},
          {from: 'main.css', to: 'main.css'},
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
};
