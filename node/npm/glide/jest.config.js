/* eslint no-undef: off */
module.exports = {
    preset: "ts-jest",
    transform: {
        "^.+\\.(t|j)s$": ["ts-jest", { isolatedModules: true }],
    },
    testEnvironment: "node",
    testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$",
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node",
        "cjs",
        "mjs",
    ],
    testTimeout: 600000,
    reporters: [
        "default",
        [
            "./node_modules/jest-html-reporter",
            {
                includeFailureMsg: true,
                includeSuiteFailure: true,
                executionTimeWarningThreshold: 60,
                sort: "status",
            },
        ],
    ],
};
