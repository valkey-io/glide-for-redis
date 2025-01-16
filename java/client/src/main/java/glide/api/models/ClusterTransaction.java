/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.models;

import static command_request.CommandRequestOuterClass.RequestType.PubSubShardChannels;
import static command_request.CommandRequestOuterClass.RequestType.PubSubShardNumSub;
import static command_request.CommandRequestOuterClass.RequestType.SPublish;
import static glide.utils.ArgsBuilder.checkTypeOrThrow;
import static glide.utils.ArgsBuilder.newArgsBuilder;

import glide.api.GlideClusterClient;
import lombok.NonNull;

/**
 * Transaction implementation for cluster {@link GlideClusterClient}. Transactions allow the
 * execution of a group of commands in a single step.
 *
 * <p>Transaction Response: An <code>array</code> of command responses is returned by the client
 * {@link GlideClusterClient#exec} command, in the order they were given. Each element in the array
 * represents a command given to the {@link ClusterTransaction}. The response for each command
 * depends on the executed command. Specific response types are documented alongside each method.
 *
 * @example
 *     <pre>{@code
 * ClusterTransaction transaction = new ClusterTransaction();
 *   .set("key", "value");
 *   .get("key");
 * Object[] result = client.exec(transaction).get();
 * // result contains: OK and "value"
 * }</pre>
 */
public class ClusterTransaction extends BaseTransaction<ClusterTransaction> {

    @Override
    protected ClusterTransaction getThis() {
        return this;
    }

    /**
     * Publishes message on pubsub channel in sharded mode.
     *
     * @since Valkey 7.0 and above.
     * @implNote {@link ArgType} is limited to {@link String} or {@link GlideString}, any other type
     *     will throw {@link IllegalArgumentException}.
     * @see <a href="https://valkey.io/commands/publish/">valkey.io</a> for details.
     * @param message The message to publish.
     * @param channel The channel to publish the message on.
     * @param sharded Indicates that this should be run in sharded mode. Setting <code>sharded</code>
     *     to <code>true</code> is only applicable with Valkey 7.0+.
     * @return Command response - The number of clients that received the message.
     */
    public <ArgType> ClusterTransaction publish(
            @NonNull ArgType message, @NonNull ArgType channel, boolean sharded) {
        if (!sharded) {
            return super.publish(message, channel);
        }
        checkTypeOrThrow(channel);
        protobufTransaction.addCommands(
                buildCommand(SPublish, newArgsBuilder().add(channel).add(message)));
        return getThis();
    }

    /**
     * Returns the number of subscribers (exclusive of clients subscribed to patterns) for the
     * specified shard channels. Note that it is valid to call this command without channels. In this
     * case, it will just return an empty map.
     *
     * @implNote {@link ArgType} is limited to {@link String} or {@link GlideString}, any other type
     *     will throw {@link IllegalArgumentException}.
     * @see <a href="https://valkey.io/commands/pubsub-shardnumsub/">valkey.io</a> for details.
     * @param channels The list of shard channels to query for the number of subscribers.
     * @return Command response - An <code>Map</code> where keys are the shard channel names and
     *     values are the number of subscribers.
     */
    public <ArgType> ClusterTransaction pubsubShardNumSub(@NonNull ArgType[] channels) {
        checkTypeOrThrow(channels);
        protobufTransaction.addCommands(
                buildCommand(PubSubShardNumSub, newArgsBuilder().add(channels)));
        return getThis();
    }

    /**
     * Lists the currently active shard channels.
     *
     * @see <a href="https://valkey.io/commands/pubsub-shardchannels/">valkey.io</a> for details.
     * @return Command response - An <code>Array</code> of all active shard channels.
     */
    public ClusterTransaction pubsubShardChannels() {
        protobufTransaction.addCommands(buildCommand(PubSubShardChannels));
        return getThis();
    }

    /**
     * Lists the currently active shard channels.
     *
     * @implNote {@link ArgType} is limited to {@link String} or {@link GlideString}, any other type *
     *     will throw {@link IllegalArgumentException}.
     * @see <a href="https://valkey.io/commands/pubsub-shardchannels/">valkey.io</a> for details.
     * @param pattern A glob-style pattern to match active shard channels.
     * @return Command response - An <code>Array</code> of all active shard channels.
     */
    public <ArgType> ClusterTransaction pubsubShardChannels(@NonNull ArgType pattern) {
        checkTypeOrThrow(pattern);
        protobufTransaction.addCommands(
                buildCommand(PubSubShardChannels, newArgsBuilder().add(pattern)));
        return getThis();
    }
}
