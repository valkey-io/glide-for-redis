/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide;

import static glide.TestUtilities.commonClientConfig;
import static org.junit.jupiter.api.Assertions.assertEquals;

import glide.api.GlideClient;
import glide.connectors.resources.NIOPoolResource;
import io.netty.channel.nio.NioEventLoopGroup;
import java.util.concurrent.TimeUnit;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

public class CustomThreadPoolResourceTest {
    @Test
    @SneakyThrows
    public void standalone_client_with_custom_threadPoolResource() {
        int numOfThreads = 8;
        var customThreadPoolResource = new NIOPoolResource(new NioEventLoopGroup(numOfThreads));

        var regularClient =
                GlideClient.createClient(
                                commonClientConfig().threadPoolResource(customThreadPoolResource).build())
                        .get(10, TimeUnit.SECONDS);

        String payload = (String) regularClient.customCommand(new String[] {"PING"}).get();
        assertEquals("PONG", payload);

        regularClient.close();
        customThreadPoolResource.getEventLoopGroup().shutdownGracefully();
    }
}
