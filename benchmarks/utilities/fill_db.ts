import {
    createRedisClient,
    receivedOptions,
    generate_value,
    SIZE_SET_KEYSPACE,
} from "./utils";

async function fill_database(
    data_size: number,
    host: string,
    isCluster: boolean,
    tls: boolean
) {
    const client = await createRedisClient(host, isCluster, tls);
    const data = generate_value(data_size);
    await client.connect();

    const CONCURRENT_SETS = 1000;
    let sets = Array.from(Array(CONCURRENT_SETS).keys()).map(async (index) => {
        for (let i = 0; i < SIZE_SET_KEYSPACE / CONCURRENT_SETS; ++i) {
            let key = (index * CONCURRENT_SETS + index).toString();
            await client.set(key, data);
        }
    });

    await Promise.all(sets);
    await client.quit();
}

Promise.resolve()
    .then(async () => {
        console.log(
            `Filling ${receivedOptions.host} with data size ${receivedOptions.dataSize}`
        );
        await fill_database(
            receivedOptions.dataSize,
            receivedOptions.host,
            receivedOptions.clusterModeEnabled,
            receivedOptions.tls
        );
    })
    .then(() => {
        process.exit(0);
    });
