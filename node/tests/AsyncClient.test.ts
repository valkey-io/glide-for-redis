/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import { afterAll, afterEach, beforeAll, describe } from "@jest/globals";
import { AsyncClient } from "glide-rs";
import { runCommonTests } from "./SharedTests";
import { flushallOnPort, startServer } from "./TestUtilities";
import { ChildProcess } from "child_process";
/* eslint-disable @typescript-eslint/no-require-imports */
const FreePort = require("find-free-port");

const PORT_NUMBER = 4000;

describe("AsyncClient", () => {
    let serverProcess: ChildProcess;
    let port: number;

    beforeAll(async () => {
        port = await FreePort(PORT_NUMBER).then(
            ([free_port]: number[]) => free_port,
        );
        const server = await startServer(port);
        serverProcess = server.process;
    });

    afterEach(async () => {
        await flushallOnPort(port);
    });

    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    runCommonTests({
        init: async () => {
            const client = AsyncClient.CreateConnection(
                "redis://localhost:" + port,
            );

            return { client, context: {} };
        },
        close: () => {
            // GC takes care of dropping the object
        },
    });
});
