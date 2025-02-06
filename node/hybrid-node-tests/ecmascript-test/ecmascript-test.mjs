/* eslint no-undef: off */
import { spawn, execFile } from "child_process";
import findFreePorts from "find-free-ports";
import { GlideClient } from "@valkey/valkey-glide";

const PORT_NUMBER = 4001;

function checkCommandAvailability(command) {
    return new Promise((resolve) => {
        execFile(`which`, [command], (error) => {
            resolve(!error);
        });
    });
}

async function main() {
    console.log("Starting main");
    const port = await findFreePorts(PORT_NUMBER).then(
        ([free_port]) => free_port,
    );
    const redisServerAvailable = await checkCommandAvailability("redis-server");
    const valkeyServerAvailable =
        await checkCommandAvailability("valkey-server");

    if (!redisServerAvailable && !valkeyServerAvailable) {
        throw new Error("Neither valkey nor redis are available");
    }

    const server = valkeyServerAvailable ? "valkey-server" : "redis-server";
    console.log(server);

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
        throw new Error("Ecma Test failed");
    } else {
        console.log("Ecma Test passed");
    }

    await client.flushall();
    client.close();
    serverProcess.kill();
    console.log("Done");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
