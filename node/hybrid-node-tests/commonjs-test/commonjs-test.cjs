/* eslint no-undef: off */
/* eslint @typescript-eslint/no-require-imports: off */
const { GlideClient } = require("@valkey/valkey-glide");
const FreePort = require("find-free-port");
const { promisify } = require("node:util");
const { exec, spawn } = require("node:child_process");
const execAsync = promisify(exec);

const PORT_NUMBER = 4001;

async function checkCommandAvailability(command) {
    try {
        const { stdout } = await execAsync(`which ${command}`);
        console.log(stdout);
        return Boolean(stdout.trim());
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function main() {
    console.log("Starting main");
    const port = await FreePort(PORT_NUMBER).then(([free_port]) => free_port);
    const redisServerAvailable = await checkCommandAvailability("redis-server");
    const valkeyServerAvailable =
        await checkCommandAvailability("valkey-server");

    if (!redisServerAvailable && !valkeyServerAvailable) {
        throw new Error("Neither valkey nor redis are available");
    }

    const server = valkeyServerAvailable ? "valkey-server" : "redis-server";
    console.log("Server is: " + server);

    const serverProcess = spawn(server, ["--port", port.toString()], {
        stdio: ["ignore", "pipe", "pipe"],
    });

    await new Promise((resolve) => {
        serverProcess.stdout.on("data", (data) => {
            console.log(`${data}`);

            if (data.toString().includes("Ready to accept connections")) {
                resolve();
            }
        });

        serverProcess.stderr.on("data", (data) => {
            console.error(`${data}`);
        });
    });

    const client = await GlideClient.createClient({
        addresses: [{ host: "localhost", port }],
    });
    const setResult = await client.set("test", "test");
    console.log(setResult);
    let getResult = await client.get("test");
    console.log(getResult);

    if (getResult !== "test") {
        throw new Error("Common Test failed");
    } else {
        console.log("Common Test passed");
    }

    await client.flushall();
    client.close();
    serverProcess.kill();
}

main().then(() => {
    console.log("Done");
    process.exit(0);
});
