/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.connectors.resources;

import glide.api.logging.Logger;
import io.netty.channel.epoll.Epoll;
import io.netty.channel.kqueue.KQueue;
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
        // TODO support IO-Uring and NIO
        private final boolean isIOUringAvailable;
        // At the moment, Windows is not supported
        // Probably we should use NIO (NioEventLoopGroup) for Windows.
        private final boolean isNIOAvailable;
    }

    /**
     * String which accumulates with report of checking platform capabilities. Thrown with an
     * exception if neither epoll/kqueue available. TODO: replace with logging Note: logging into
     * files may be unavailable in AWS lambda.
     */
    private static String debugInfo = "Detailed report of checking platform capabilities\n";

    /** Detected platform (OS + JVM) capabilities. Not supposed to be changed in runtime. */
    @Getter
    private static final Capabilities capabilities =
            new Capabilities(isKQueueAvailable(), isEPollAvailable(), false, false);

    /** Detect <em>kqueue</em> availability. */
    private static boolean isKQueueAvailable() {
        try {
            debugInfo += "Checking KQUEUE...\n";
            Class.forName("io.netty.channel.kqueue.KQueue");
            debugInfo += "KQUEUE class found\n";
            var res = KQueue.isAvailable();
            debugInfo += "KQUEUE is" + (res ? " " : " not") + " available\n";
            if (!res) {
                debugInfo += "Reason: " + KQueue.unavailabilityCause() + "\n";
            }
            return res;
        } catch (ClassNotFoundException e) {
            debugInfo += "Exception checking KQUEUE:\n" + e + "\n";
            return false;
        }
    }

    /** Detect <em>epoll</em> availability. */
    private static boolean isEPollAvailable() {
        try {
            debugInfo += "Checking EPOLL...\n";
            Class.forName("io.netty.channel.epoll.Epoll");
            debugInfo += "EPOLL class found\n";
            var res = Epoll.isAvailable();
            debugInfo += "EPOLL is" + (res ? " " : " not") + " available\n";
            if (!res) {
                debugInfo += "Reason: " + Epoll.unavailabilityCause() + "\n";
            }
            return res;
        } catch (ClassNotFoundException e) {
            debugInfo += "Exception checking EPOLL\n" + e + "\n";
            return false;
        }
    }

    public static Supplier<ThreadPoolResource> getThreadPoolResourceSupplier() {
        if (capabilities.isKQueueAvailable()) {
            return KQueuePoolResource::new;
        }

        if (capabilities.isEPollAvailable()) {
            return EpollResource::new;
        }

        // TODO support IO-Uring and NIO
        String errorMessage =
                String.format(
                        "Cannot load Netty native components for the current os version and arch: %s %s %s.\n",
                        System.getProperty("os.name"),
                        System.getProperty("os.version"),
                        System.getProperty("os.arch"));

        throw new RuntimeException(
                errorMessage + (Logger.getLoggerLevel() == Logger.Level.DEBUG ? debugInfo : ""));
    }
}
