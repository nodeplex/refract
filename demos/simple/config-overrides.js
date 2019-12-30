

module.exports = {
    webpack(config, env) {
        config.module.rules.push({
            test: /\.js$/,
            use: ["source-map-loader"],
            enforce: "pre"
        });

        //console.log(config);
        return config;
    }
};
