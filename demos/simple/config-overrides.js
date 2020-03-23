

module.exports = {
    webpack(config, env) {
        config.module.rules.push({
            test: /\.js$/,
            use: ["source-map-loader"],
            enforce: "pre"
        });

        return config;
    }
};
