#!/usr/bin/env node

/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import { GLIBC, MUSL, familySync } from "detect-libc";
import { arch, platform } from "process";

/* eslint-disable @typescript-eslint/no-require-imports */
function loadNativeBinding() {
    let nativeBinding = null;

    switch (platform) {
        case "linux":
            switch (arch) {
                case "x64":
                    switch (familySync()) {
                        case GLIBC:
                            nativeBinding = require("@scope/glide-rs-linux-x64");
                            break;
                        case MUSL:
                            nativeBinding = require("@scope/glide-rs-linux-musl-x64");
                            break;
                        default:
                            nativeBinding = require("@scope/glide-rs-linux-x64");
                            break;
                    }

                    break;
                case "arm64":
                    switch (familySync()) {
                        case GLIBC:
                            nativeBinding = require("@scope/glide-rs-linux-arm64");
                            break;
                        case MUSL:
                            nativeBinding = require("@scope/glide-rs-linux-musl-arm64");
                            break;
                        default:
                            nativeBinding = require("@scope/glide-rs-linux-arm64");
                            break;
                    }

                    break;
                default:
                    throw new Error(
                        `Unsupported OS: ${platform}, architecture: ${arch}`,
                    );
            }

            break;
        case "darwin":
            switch (arch) {
                case "arm64":
                    nativeBinding = require("@scope/glide-rs-darwin-arm64");
                    break;
                default:
                    throw new Error(
                        `Unsupported OS: ${platform}, architecture: ${arch}`,
                    );
            }

            break;
        default:
            throw new Error(
                `Unsupported OS: ${platform}, architecture: ${arch}`,
            );
    }

    if (!nativeBinding) {
        throw new Error(`Failed to load native binding`);
    }

    return nativeBinding;
}

const nativeBinding = loadNativeBinding();

export = nativeBinding;
