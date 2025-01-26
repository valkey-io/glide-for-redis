/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import { execFile } from "child_process";
import { lt } from "semver";

const PY_SCRIPT_PATH = __dirname + "/cluster_manager.py";

function parseOutput(input: string): {
    clusterFolder: string;
    addresses: [string, number][];
} {
    const lines = input.split(/\r\n|\r|\n/);
    const clusterFolder = lines
        .find((line) => line.startsWith("CLUSTER_FOLDER"))
        ?.split("=")[1];
    const ports = lines
        .find((line) => line.startsWith("CLUSTER_NODES"))
        ?.split("=")[1]
        .split(",")
        .map((address) => address.split(":"))
        .map((address) => [address[0], Number(address[1])]) as [
        string,
        number,
    ][];

    if (clusterFolder === undefined || ports === undefined) {
        throw new Error(`Insufficient data in input: ${input}`);
    }

    return {
        clusterFolder,
        addresses: ports,
    };
}

export class ValkeyCluster {
    private addresses: [string, number][];
    private clusterFolder: string | undefined;
    private version: string;

    private constructor(
        version: string,
        addresses: [string, number][],
        clusterFolder?: string,
    ) {
        this.addresses = addresses;
        this.clusterFolder = clusterFolder;
        this.version = version;
    }

    public static createCluster(
        cluster_mode: boolean,
        shardCount: number,
        replicaCount: number,
        getVersionCallback: (
            addresses: [string, number][],
            clusterMode: boolean,
        ) => Promise<string>,
        loadModule?: string[],
    ): Promise<ValkeyCluster> {
        return new Promise<ValkeyCluster>((resolve, reject) => {
            let command = `start -r ${replicaCount} -n ${shardCount}`;

            if (cluster_mode) {
                command += " --cluster-mode";
            }

            if (loadModule) {
                if (loadModule.length === 0) {
                    throw new Error(
                        "Please provide the path(s) to the module(s) you want to load.",
                    );
                }

                for (const module of loadModule) {
                    command += ` --load-module ${module}`;
                }
            }

            execFile(
                "python3",
                [PY_SCRIPT_PATH, ...command.split(" ")],
                (error, stdout) => {
                    if (error) {
                        reject(error);
                    } else {
                        const { clusterFolder, addresses } =
                            parseOutput(stdout);
                        resolve(
                            getVersionCallback(addresses, cluster_mode).then(
                                (ver) =>
                                    new ValkeyCluster(
                                        ver,
                                        addresses,
                                        clusterFolder,
                                    ),
                            ),
                        );
                    }
                },
            );
        });
    }

    public static async initFromExistingCluster(
        cluster_mode: boolean,
        addresses: [string, number][],
        getVersionCallback: (
            addresses: [string, number][],
            clusterMode: boolean,
        ) => Promise<string>,
    ): Promise<ValkeyCluster> {
        return getVersionCallback(addresses, cluster_mode).then(
            (ver) => new ValkeyCluster(ver, addresses, ""),
        );
    }

    public ports(): number[] {
        return this.addresses.map((address) => address[1]);
    }

    public getAddresses(): [string, number][] {
        return this.addresses;
    }

    public getVersion(): string {
        return this.version;
    }

    public checkIfServerVersionLessThan(minVersion: string): boolean {
        return lt(this.version, minVersion);
    }

    public async close(keepFolder = false): Promise<void> {
        if (this.clusterFolder) {
            await new Promise<void>((resolve, reject) => {
                const commandArgs = [
                    PY_SCRIPT_PATH,
                    `stop`,
                    `--cluster-folder`,
                    `${this.clusterFolder}`,
                ];

                if (keepFolder) {
                    commandArgs.push(`--keep-folder`);
                }

                execFile("python3", commandArgs, (error, _, stderr) => {
                    if (error) {
                        console.error(stderr);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }
}

export default ValkeyCluster;
