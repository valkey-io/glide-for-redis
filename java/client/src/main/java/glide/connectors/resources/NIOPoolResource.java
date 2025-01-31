/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.connectors.resources;

import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioDomainSocketChannel;
import io.netty.util.concurrent.DefaultThreadFactory;

public class NIOPoolResource extends ThreadPoolResource {
    private static final String NIO_EVENT_LOOP_IDENTIFIER = "glide-channel-kqueue-elg";

    public NIOPoolResource() {
        this(
                new NioEventLoopGroup(
                        Runtime.getRuntime().availableProcessors(),
                        new DefaultThreadFactory(NIO_EVENT_LOOP_IDENTIFIER, true)));
    }

    public NIOPoolResource(NioEventLoopGroup eventLoopGroup) {
        super(eventLoopGroup, NioDomainSocketChannel.class);
    }
}
