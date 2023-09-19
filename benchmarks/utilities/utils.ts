import commandLineArgs from "command-line-args";
import {
    createClient,
    createCluster,
    RedisClusterType,
    RedisClientType,
} from "redis";

export const PORT = 6379;

export const SIZE_SET_KEYSPACE = 3000000; // 3 million
export const PROB_GET = 0.8;
export const PROB_GET_EXISTING_KEY = 0.8;
export const SIZE_GET_KEYSPACE = 3750000; // 3.75 million

export function getAddress(host: string, tls: boolean, port?: number) {
    const protocol = tls ? "rediss" : "redis";
    return `${protocol}://${host}:${port ? port : PORT}`;
}

export function createRedisClient(
    host: string,
    isCluster: boolean,
    tls: boolean
): RedisClusterType | RedisClientType {
    return isCluster
        ? createCluster({
              rootNodes: [{ socket: { host, port: PORT, tls } }],
              defaults: {
                  socket: {
                      tls,
                  },
              },
              useReplicas: true,
          })
        : createClient({
              url: getAddress(host, tls),
          });
}

const optionDefinitions = [
    { name: "resultsFile", type: String },
    { name: "dataSize", type: String },
    { name: "concurrentTasks", type: String, multiple: true },
    { name: "clients", type: String },
    { name: "host", type: String },
    { name: "clientCount", type: String, multiple: true },
    { name: "tls", type: Boolean, defaultValue: false },
    { name: "clusterModeEnabled", type: Boolean, defaultValue: false },
];
export const receivedOptions = commandLineArgs(optionDefinitions);

export function generate_value(size: number) {
    return "0".repeat(size);
}
export function generate_key_set() {
    return (Math.floor(Math.random() * SIZE_SET_KEYSPACE) + 1).toString();
}
export function generate_key_get() {
    const range = SIZE_GET_KEYSPACE - SIZE_SET_KEYSPACE;
    return Math.floor(Math.random() * range + SIZE_SET_KEYSPACE + 1).toString();
}
