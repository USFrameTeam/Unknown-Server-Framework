const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: './BehaviourPack/scripts/Main.js',
    output: {
        filename: 'Main.js',
        path: __dirname + '/temp',
    },
    target: 'es2020',
    mode: 'production', 
    experiments : {
        outputModule:true
    },
    externalsType: 'module',
    externals: {
        '@minecraft/server': 'module @minecraft/server',
        '@minecraft/server-ui': 'module @minecraft/server-ui',
        '@minecraft/server-net': 'module @minecraft/server-net',
    },
    plugins: [
        new CleanWebpackPlugin()
    ]
};
