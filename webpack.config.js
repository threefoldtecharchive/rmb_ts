const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    entry: {
        'http-client': './packages/http_client/index.ts',
        // 'redis-client': './packages/redis-client/index.ts'
    },
    module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        // fallback: {
        //     net: false,
        //     tls: false
        // },
        plugins: [
            new TsconfigPathsPlugin(),
        ]
      },
    output: {
        filename: '[name].js',
        path: __dirname + '/dist',
    }
}