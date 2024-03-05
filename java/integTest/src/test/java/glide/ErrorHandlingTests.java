/** Copyright GLIDE-for-Redis Project Contributors - SPDX Identifier: Apache-2.0 */
package glide;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import glide.api.RedisClient;
import glide.api.models.configuration.NodeAddress;
import glide.api.models.configuration.RedisClientConfiguration;
import glide.api.models.exceptions.ClosingException;
import glide.api.models.exceptions.RequestException;
import java.net.ServerSocket;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

public class ErrorHandlingTests {

    @Test
    @SneakyThrows
    public void basic_client_tries_to_connect_to_wrong_address() {
        var exception =
                assertThrows(
                        ExecutionException.class,
                        () ->
                                RedisClient.CreateClient(
                                                RedisClientConfiguration.builder()
                                                        .address(NodeAddress.builder().port(getFreePort()).build())
                                                        .build())
                                        .get(10, TimeUnit.SECONDS));
        assertAll(
                () -> assertInstanceOf(ClosingException.class, exception.getCause()),
                () -> assertTrue(exception.getCause().getMessage().contains("Connection refused")));
    }

    @Test
    @SneakyThrows
    public void basic_client_tries_wrong_command() {
        try (var regularClient =
                RedisClient.CreateClient(
                                RedisClientConfiguration.builder()
                                        .address(
                                                NodeAddress.builder().port(TestConfiguration.STANDALONE_PORTS[0]).build())
                                        .build())
                        .get(10, TimeUnit.SECONDS)) {
            var exception =
                    assertThrows(
                            ExecutionException.class,
                            () -> regularClient.customCommand(new String[] {"pewpew"}).get(10, TimeUnit.SECONDS));
            assertAll(
                    () -> assertInstanceOf(RequestException.class, exception.getCause()),
                    () -> assertTrue(exception.getCause().getMessage().contains("unknown command")));
        }
    }

    @Test
    @SneakyThrows
    public void basic_client_tries_wrong_command_arguments() {
        try (var regularClient =
                RedisClient.CreateClient(
                                RedisClientConfiguration.builder()
                                        .address(
                                                NodeAddress.builder().port(TestConfiguration.STANDALONE_PORTS[0]).build())
                                        .build())
                        .get(10, TimeUnit.SECONDS)) {
            var exception =
                    assertThrows(
                            ExecutionException.class,
                            () ->
                                    regularClient
                                            .customCommand(new String[] {"ping", "pang", "pong"})
                                            .get(10, TimeUnit.SECONDS));
            assertAll(
                    () -> assertInstanceOf(RequestException.class, exception.getCause()),
                    () ->
                            assertTrue(exception.getCause().getMessage().contains("wrong number of arguments")));
        }
    }

    @SneakyThrows
    private int getFreePort() {
        try (ServerSocket s = new ServerSocket(0)) {
            return s.getLocalPort();
        }
    }
}
