/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.managers;

import com.google.protobuf.ByteString;
import connection_request.ConnectionRequestOuterClass;
import connection_request.ConnectionRequestOuterClass.AuthenticationInfo;
import connection_request.ConnectionRequestOuterClass.ConnectionRequest;
import connection_request.ConnectionRequestOuterClass.PubSubChannelsOrPatterns;
import connection_request.ConnectionRequestOuterClass.PubSubSubscriptions;
import connection_request.ConnectionRequestOuterClass.TlsMode;
import glide.api.models.configuration.AdvancedBaseClientConfiguration;
import glide.api.models.configuration.BaseClientConfiguration;
import glide.api.models.configuration.GlideClientConfiguration;
import glide.api.models.configuration.GlideClusterClientConfiguration;
import glide.api.models.configuration.NodeAddress;
import glide.api.models.configuration.ProtocolVersion;
import glide.api.models.configuration.ReadFrom;
import glide.api.models.exceptions.ClosingException;
import glide.api.models.exceptions.ConfigurationError;
import glide.connectors.handlers.ChannelHandler;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;
import lombok.RequiredArgsConstructor;
import response.ResponseOuterClass.Response;

/**
 * Service responsible for submitting connection requests to a socket channel handler and unpack
 * responses from the same socket channel handler.
 */
@RequiredArgsConstructor
public class ConnectionManager {

    // TODO: consider making connection manager static, and moving the ChannelHandler to the
    // GlideClient.

    /** UDS connection representation. */
    private final ChannelHandler channel;

    /**
     * Make a connection request to Valkey Rust-core client.
     *
     * @param configuration Connection Request Configuration
     */
    public CompletableFuture<Void> connectToValkey(BaseClientConfiguration configuration) {
        ConnectionRequest request = createConnectionRequest(configuration);
        return channel
                .connect(request)
                .exceptionally(this::exceptionHandler)
                .thenApplyAsync(this::checkGlideRsResponse);
    }

    /**
     * Exception handler for future pipeline.
     *
     * @param e An exception thrown in the pipeline before
     * @return Nothing, it always rethrows the exception
     */
    private Response exceptionHandler(Throwable e) {
        channel.close();
        if (e instanceof RuntimeException) {
            // GlideException also goes here
            throw (RuntimeException) e;
        }
        throw new RuntimeException(e);
    }

    /**
     * Close the connection and the corresponding channel. Creates a ConnectionRequest protobuf
     * message based on the type of client Standalone/Cluster.
     *
     * @param configuration Connection Request Configuration
     * @return ConnectionRequest protobuf message
     */
    private ConnectionRequest createConnectionRequest(BaseClientConfiguration configuration) {
        if (configuration instanceof GlideClusterClientConfiguration) {
            return setupConnectionRequestBuilderGlideClusterClient(
                            (GlideClusterClientConfiguration) configuration)
                    .build();
        }

        return setupConnectionRequestBuilderGlideClient((GlideClientConfiguration) configuration)
                .build();
    }

    /**
     * Creates ConnectionRequestBuilder, so it has appropriate fields for the BaseClientConfiguration
     * where the Standalone/Cluster inherit from.
     *
     * @param configuration
     */
    private ConnectionRequest.Builder setupConnectionRequestBuilderBaseConfiguration(
            BaseClientConfiguration configuration) {
        ConnectionRequest.Builder connectionRequestBuilder = ConnectionRequest.newBuilder();
        for (NodeAddress nodeAddress : configuration.getAddresses()) {
            connectionRequestBuilder.addAddresses(
                    ConnectionRequestOuterClass.NodeAddress.newBuilder()
                            .setHost(nodeAddress.getHost())
                            .setPort(nodeAddress.getPort())
                            .build());
        }

        connectionRequestBuilder
                .setTlsMode(configuration.isUseTLS() ? TlsMode.SecureTls : TlsMode.NoTls)
                .setReadFrom(mapReadFromEnum(configuration.getReadFrom()));

        if (configuration.getCredentials() != null) {
            AuthenticationInfo.Builder authenticationInfoBuilder = AuthenticationInfo.newBuilder();
            if (configuration.getCredentials().getUsername() != null) {
                authenticationInfoBuilder.setUsername(configuration.getCredentials().getUsername());
            }
            authenticationInfoBuilder.setPassword(configuration.getCredentials().getPassword());

            connectionRequestBuilder.setAuthenticationInfo(authenticationInfoBuilder.build());
        }

        if (configuration.getRequestTimeout() != null) {
            connectionRequestBuilder.setRequestTimeout(configuration.getRequestTimeout());
        }

        if (configuration.getClientName() != null) {
            connectionRequestBuilder.setClientName(configuration.getClientName());
        }

        if (configuration.getInflightRequestsLimit() != null) {
            connectionRequestBuilder.setInflightRequestsLimit(configuration.getInflightRequestsLimit());
        }

        if (configuration.getReadFrom() == ReadFrom.AZ_AFFINITY) {
            if (configuration.getClientAZ() == null) {
                throw new ConfigurationError(
                        "`clientAZ` must be set when read_from is set to `AZ_AFFINITY`");
            }
            connectionRequestBuilder.setClientAz(configuration.getClientAZ());
        }

        if (configuration.getProtocol() != null) {
            connectionRequestBuilder.setProtocolValue(configuration.getProtocol().ordinal());
        }

        return connectionRequestBuilder;
    }

    /**
     * Creates ConnectionRequestBuilder, so it has appropriate fields for the Standalone Client.
     *
     * @param configuration Connection Request Configuration
     */
    private ConnectionRequest.Builder setupConnectionRequestBuilderGlideClient(
            GlideClientConfiguration configuration) {
        ConnectionRequest.Builder connectionRequestBuilder =
                setupConnectionRequestBuilderBaseConfiguration(configuration);
        connectionRequestBuilder.setClusterModeEnabled(false);
        if (configuration.getReconnectStrategy() != null) {
            connectionRequestBuilder.setConnectionRetryStrategy(
                    ConnectionRequestOuterClass.ConnectionRetryStrategy.newBuilder()
                            .setNumberOfRetries(configuration.getReconnectStrategy().getNumOfRetries())
                            .setFactor(configuration.getReconnectStrategy().getFactor())
                            .setExponentBase(configuration.getReconnectStrategy().getExponentBase())
                            .build());
        }

        if (configuration.getDatabaseId() != null) {
            connectionRequestBuilder.setDatabaseId(configuration.getDatabaseId());
        }

        if (configuration.getSubscriptionConfiguration() != null) {
            if (configuration.getProtocol() == ProtocolVersion.RESP2) {
                throw new ConfigurationError(
                        "PubSub subscriptions require RESP3 protocol, but RESP2 was configured.");
            }
            var subscriptionsBuilder = PubSubSubscriptions.newBuilder();
            for (var entry : configuration.getSubscriptionConfiguration().getSubscriptions().entrySet()) {
                var channelsBuilder = PubSubChannelsOrPatterns.newBuilder();
                for (var channel : entry.getValue()) {
                    channelsBuilder.addChannelsOrPatterns(ByteString.copyFrom(channel.getBytes()));
                }
                subscriptionsBuilder.putChannelsOrPatternsByType(
                        entry.getKey().ordinal(), channelsBuilder.build());
            }
            connectionRequestBuilder.setPubsubSubscriptions(subscriptionsBuilder.build());
        }

        if (configuration.getAdvancedConfiguration() != null) {
            connectionRequestBuilder =
                    setupConnectionRequestBuilderAdvancedBaseConfiguration(
                            connectionRequestBuilder, configuration.getAdvancedConfiguration());
        }

        return connectionRequestBuilder;
    }

    /**
     * Configures the {@link ConnectionRequest.Builder} with settings from the provided {@link
     * AdvancedBaseClientConfiguration}.
     *
     * @param connectionRequestBuilder The builder for the {@link ConnectionRequest}.
     * @param configuration The advanced configuration settings.
     * @return The updated {@link ConnectionRequest.Builder}.
     */
    private ConnectionRequest.Builder setupConnectionRequestBuilderAdvancedBaseConfiguration(
            ConnectionRequest.Builder connectionRequestBuilder,
            AdvancedBaseClientConfiguration configuration) {
        if (configuration.getConnectionTimeout() != null) {
            connectionRequestBuilder.setConnectionTimeout(configuration.getConnectionTimeout());
        }

        return connectionRequestBuilder;
    }

    /**
     * Creates ConnectionRequestBuilder, so it has appropriate fields for the Cluster Client.
     *
     * @param configuration
     */
    private ConnectionRequest.Builder setupConnectionRequestBuilderGlideClusterClient(
            GlideClusterClientConfiguration configuration) {
        ConnectionRequest.Builder connectionRequestBuilder =
                setupConnectionRequestBuilderBaseConfiguration(configuration);
        connectionRequestBuilder.setClusterModeEnabled(true);

        if (configuration.getSubscriptionConfiguration() != null) {
            if (configuration.getProtocol() == ProtocolVersion.RESP2) {
                throw new ConfigurationError(
                        "PubSub subscriptions require RESP3 protocol, but RESP2 was configured.");
            }
            var subscriptionsBuilder = PubSubSubscriptions.newBuilder();
            for (var entry : configuration.getSubscriptionConfiguration().getSubscriptions().entrySet()) {
                var channelsBuilder = PubSubChannelsOrPatterns.newBuilder();
                for (var channel : entry.getValue()) {
                    channelsBuilder.addChannelsOrPatterns(ByteString.copyFrom(channel.getBytes()));
                }
                subscriptionsBuilder.putChannelsOrPatternsByType(
                        entry.getKey().ordinal(), channelsBuilder.build());
            }
            connectionRequestBuilder.setPubsubSubscriptions(subscriptionsBuilder.build());
        }

        if (configuration.getAdvancedConfiguration() != null) {
            connectionRequestBuilder =
                    setupConnectionRequestBuilderAdvancedBaseConfiguration(
                            connectionRequestBuilder, configuration.getAdvancedConfiguration());
        }

        return connectionRequestBuilder;
    }

    /**
     * Look up for java ReadFrom enum to protobuf defined ReadFrom enum.
     *
     * @param readFrom
     * @return Protobuf defined ReadFrom enum
     */
    private ConnectionRequestOuterClass.ReadFrom mapReadFromEnum(ReadFrom readFrom) {
        switch (readFrom) {
            case PREFER_REPLICA:
                return ConnectionRequestOuterClass.ReadFrom.PreferReplica;
            case AZ_AFFINITY:
                return ConnectionRequestOuterClass.ReadFrom.AZAffinity;
            default:
                return ConnectionRequestOuterClass.ReadFrom.Primary;
        }
    }

    /** Check a response received from Glide. */
    private Void checkGlideRsResponse(Response response) {
        // Note: errors are already handled before in CallbackDispatcher, but we double-check
        if (response.hasRequestError()) {
            throwClosingError(
                    "Unhandled request error in response: " + response.getRequestError().getMessage());
        }
        if (response.hasClosingError()) {
            throwClosingError("Unhandled closing error in response: " + response.getClosingError());
        }

        if (response.hasRespPointer()) {
            throwClosingError("Unexpected data in response");
        }
        if (!response.hasConstantResponse()) {
            throwClosingError("Unexpected empty data in response");
        }
        // Expect a constant "OK" response and return Void/null
        return null;
    }

    private void throwClosingError(String msg) {
        closeConnection();
        throw new ClosingException(msg);
    }

    /**
     * Close the connection to the channel.
     *
     * @return a CompletableFuture to indicate the channel is closed
     */
    public Future<Void> closeConnection() {
        return channel.close();
    }
}
