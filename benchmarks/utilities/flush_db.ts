import { createRedisClient, receivedOptions } from "./utils";
import { RedisClusterType, RedisClientType } from "redis";

async function flush_database(
    host: string,
    isCluster: boolean,
    tls: boolean,
    port: number
) {
    if (isCluster) {
        const client = (await createRedisClient(
            host,
            isCluster,
            tls,
            port
        )) as RedisClusterType;
        await client.connect();

        // since the cluster client doesn't support fan-out commands, we need to create a client to each node, and send the flush command there.
        await Promise.all(
            client.masters.map((master) => {
                return flush_database(master.host, false, tls, port);
            })
        );
        await client.quit();
    } else {
        const client = (await createRedisClient(
            host,
            isCluster,
            tls,
            port
        )) as RedisClientType;
        await client.connect();
        await client.flushAll();
        await client.quit();
    }
}

Promise.resolve()
    .then(async () => {
        console.log("Flushing " + receivedOptions.host);
        await flush_database(
            receivedOptions.host,
            receivedOptions.clusterModeEnabled,
            receivedOptions.tls,
            receivedOptions.port
        );
    })
    .then(() => {
        process.exit(0);
    });
