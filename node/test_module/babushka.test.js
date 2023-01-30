import { AsyncClient, SocketConnection, setLoggerConfig, RustParser } from "..";
import RedisServer from "redis-server";
import FreePort from "find-free-port";
import { v4 as uuidv4 } from "uuid";
import JavascriptRedisParser from "redis-parser";

function OpenServerAndExecute(port, action) {
    return new Promise((resolve, reject) => {
        const server = new RedisServer(port);
        server.open(async (err) => {
            if (err) {
                reject(err);
            }
            await action();
            server.close();
            resolve();
        });
    });
}

beforeAll(() => {
    setLoggerConfig("info");
});

async function GetAndSetRandomValue(client) {
    const key = uuidv4();
    // Adding random repetition, to prevent the inputs from always having the same alignment.
    const value = uuidv4() + "0".repeat(Math.random() * 7);
    await client.set(key, value);
    const result = await client.get(key);
    expect(result).toEqual(value);
}

fdescribe("Parsing", () => {
    const encoder = new TextEncoder();

    const parseAndTest = (array, expected) => {
        const keyBytes = Buffer.from(array);
        const nodeParser = new JavascriptRedisParser({
            returnReply(reply) {
                expect(reply).toEqual(expected);
            },
            returnError(err) {
                throw err;
            },
        });

        nodeParser.execute(keyBytes);

        const rustParser = new RustParser();

        const rustResult = rustParser.parse(array);

        expect(rustResult).toEqual(expected);
    };

    const time = async (prefix, array, iterations) => {
        const rustTiming = [0, 0];
        const nodeTiming = [0, 0];

        let resolve = () => {};
        const rustParser = new RustParser();
        const nodeParser = new JavascriptRedisParser({
            returnReply(_) {
                resolve();
            },
            returnError(err) {
                throw err;
            },
        });

        for (let i = 0; i < iterations; i++) {
            const val = array[i % array.length];
            try {
                let tic = process.hrtime();
                rustParser.parse(val);
                let toc = process.hrtime(tic);
                rustTiming[0] = rustTiming[0] + toc[0];
                rustTiming[1] = rustTiming[1] + toc[1];

                tic = process.hrtime();
                await new Promise((resolvePromise) => {
                    resolve = resolvePromise;
                    nodeParser.execute(val);
                });
                toc = process.hrtime(tic);
                nodeTiming[0] = nodeTiming[0] + toc[0];
                nodeTiming[1] = nodeTiming[1] + toc[1];
            } catch (exc) {
                console.log(`Failed for ${val} - ${exc}`);
                throw new Error(val);
            }
        }

        const rustMilliseconds =
            (rustTiming[0] * 1000000 + rustTiming[1] / 1000) / iterations;
        const nodeMilliseconds =
            (nodeTiming[0] * 1000000 + nodeTiming[1] / 1000) / iterations;
        console.log(
            `${prefix}  rust: ${rustMilliseconds}us, node: ${nodeMilliseconds}us`
        );
    };

    const randomString = (length) => {
        let result = "+";
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result + "\r\n";
    };

    const createArray = (length, count) => {
        let longArrayValue = `*${count}\r\n`;
        for (let i = 0; i < count; i++) {
            longArrayValue += randomString(length / count);
        }
        return longArrayValue;
    };

    const createBulk = (length, count) => {
        let longArrayBulk = ``;
        for (let i = 0; i < count; i++) {
            longArrayBulk += randomString(length / count);
        }
        return `$${longArrayBulk.length}\r\n${longArrayBulk}\r\n`;
    };

    const createArrayOfValues = (length) => {
        const longCount = length > 10000 ? 1000 : 100;
        return [
            randomString(length),
            createBulk(length, longCount),
            createBulk(length, 10),
            createArray(length, longCount),
            createArray(length, 10),
        ].map((val) => encoder.encode(val));
    };

    it("timing", async () => {
        const array = [
            "$-1\r\n",
            randomString(10),
            ":1000\r\n",
            `*5\r\n:11\r\n:222\r\n:3333\r\n:44444\r\n$7\r\nhello\r\n\r\n`,
            "$48\r\nhello\r\nhello\r\nhello\r\n汉字\r\nhello\r\nhello\r\nhello\r\n",
        ].map((val) => encoder.encode(val));

        await time("short", array, 10000);
        await time("medium", createArrayOfValues(1000), 10000);
        await time("long", createArrayOfValues(20000), 100);
    });

    it("should parse nil", () => {
        const array = encoder.encode("$-1\r\n");

        parseAndTest(array, null);
    });

    it("should parse string", () => {
        const array = encoder.encode("+OKdk\r\n");

        parseAndTest(array, "OKdk");
    });

    it("should parse number", () => {
        const array = encoder.encode(":1000\r\n");

        parseAndTest(array, 1000);
    });

    it("should parse array", () => {
        const array = encoder.encode(
            "*5\r\n:11\r\n:222\r\n:3333\r\n:44444\r\n$7\r\nhello\r\n\r\n"
        );

        parseAndTest(array, [11, 222, 3333, 44444, "hello\r\n"]);
    });

    it("should parse bulk", () => {
        const array = encoder.encode(
            "$48\r\nhello\r\nhello\r\nhello\r\n汉字\r\nhello\r\nhello\r\nhello\r\n"
        );

        parseAndTest(
            array,
            "hello\r\nhello\r\nhello\r\n汉字\r\nhello\r\nhello\r\nhello"
        );
    });
});

describe("NAPI client", () => {
    it("set and get flow works", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            await GetAndSetRandomValue(client);
        });
    });

    it("can handle non-ASCII unicode", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            const key = uuidv4();
            const value = "שלום hello 汉字";
            await client.set(key, value);
            const result = await client.get(key);
            expect(result).toEqual(value);
        });
    });

    it("get for missing key returns null", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            const result = await client.get(uuidv4());

            expect(result).toEqual(null);
        });
    });

    it("get for empty string", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            const key = uuidv4();
            await client.set(key, "");
            const result = await client.get(key);

            expect(result).toEqual("");
        });
    });

    it("send very large values", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            const WANTED_LENGTH = Math.pow(2, 16);
            const getLongUUID = () => {
                let id = uuidv4();
                while (id.length < WANTED_LENGTH) {
                    id += uuidv4();
                }
                return id;
            };
            let key = getLongUUID();
            let value = getLongUUID();
            await client.set(key, value);
            const result = await client.get(key);

            expect(result).toEqual(value);
        });
    });

    it("can handle concurrent operations", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await AsyncClient.CreateConnection(
                "redis://localhost:" + port
            );

            const singleOp = async (index) => {
                if (index % 2 === 0) {
                    await GetAndSetRandomValue(client);
                } else {
                    var result = await client.get(uuidv4());
                    expect(result).toEqual(null);
                }
            };

            const operations = [];

            for (let i = 0; i < 100; ++i) {
                operations.push(singleOp(i));
            }

            await Promise.all(operations);
        });
    });
});

describe("socket client", () => {
    it("set and get flow works", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            await GetAndSetRandomValue(client);

            client.dispose();
        });
    });

    it("can handle non-ASCII unicode", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            const key = uuidv4();
            const value = "שלום hello 汉字";
            await client.set(key, value);
            const result = await client.get(key);
            expect(result).toEqual(value);

            client.dispose();
        });
    });

    it("get for missing key returns null", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            const result = await client.get(uuidv4());

            expect(result).toEqual(null);

            client.dispose();
        });
    });

    it("get for empty string", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            const key = uuidv4();
            await client.set(key, "");
            const result = await client.get(key);

            expect(result).toEqual("");

            client.dispose();
        });
    });

    it("send very large values", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            const WANTED_LENGTH = Math.pow(2, 16);
            const getLongUUID = () => {
                let id = uuidv4();
                while (id.length < WANTED_LENGTH) {
                    id += uuidv4();
                }
                return id;
            };
            let key = getLongUUID();
            let value = getLongUUID();
            await client.set(key, value);
            const result = await client.get(key);

            expect(result).toEqual(value);

            client.dispose();
        });
    });

    it("can handle concurrent operations", async () => {
        const port = await FreePort(3000).then(([free_port]) => free_port);
        await OpenServerAndExecute(port, async () => {
            const client = await SocketConnection.CreateConnection(
                "redis://localhost:" + port
            );

            const singleOp = async (index) => {
                if (index % 2 === 0) {
                    await GetAndSetRandomValue(client);
                } else {
                    var result = await client.get(uuidv4());
                    expect(result).toEqual(null);
                }
            };

            const operations = [];

            for (let i = 0; i < 100; ++i) {
                operations.push(singleOp(i));
            }

            await Promise.all(operations);

            client.dispose();
        });
    });
});
