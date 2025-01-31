/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.connectors.resources;

import java.util.function.Supplier;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;
import lombok.experimental.UtilityClass;

/**
 * An auxiliary class purposed to detect platform (OS + JVM) {@link Capabilities} and allocate
 * corresponding resources.
 */
@UtilityClass
public class Platform {

    @Getter
    @AllArgsConstructor(access = AccessLevel.PRIVATE)
    @ToString
    public static class Capabilities {
        private final boolean isKQueueAvailable;
        private final boolean isEPollAvailable;
        // TODO support IO-Uring
        private final boolean isIOUringAvailable;
        private final boolean isNIOAvailable;
    }

    /** Detected platform (OS + JVM) capabilities. Not supposed to be changed in runtime. */
    @Getter
    private static Capabilities capabilities =
            new Capabilities(false, false, false, isNIOAvailable());

    /** Detect <em>NIO</em> availability. */
    private static boolean isNIOAvailable() {
        // available on java 16+ and netty > 4.1.84 (TODO clarify min netty)
        return true;
    }

    public static Supplier<ThreadPoolResource> getThreadPoolResourceSupplier() {
        if (capabilities.isNIOAvailable()) {
            return NIOPoolResource::new;
        }

        // TODO support IO-Uring
        throw new RuntimeException("Current platform supports no known thread pool resources");
    }
}
