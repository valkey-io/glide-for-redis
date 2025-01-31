/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.connectors.resources;

import io.netty.channel.EventLoopGroup;
import io.netty.channel.socket.DuplexChannel;
import lombok.Getter;
import lombok.NonNull;

/**
 * Abstract base class that provides the EventLoopGroup and DomainSocketChannel to be used by the
 * Netty protocol.
 */
@Getter
public abstract class ThreadPoolResource {
    private EventLoopGroup eventLoopGroup;
    private Class<? extends DuplexChannel> domainSocketChannelClass;

    public ThreadPoolResource(
            @NonNull EventLoopGroup eventLoopGroup,
            @NonNull Class<? extends DuplexChannel> domainSocketChannelClass) {
        this.eventLoopGroup = eventLoopGroup;
        this.domainSocketChannelClass = domainSocketChannelClass;
    }
}
