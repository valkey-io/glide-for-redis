/** Copyright GLIDE-for-Redis Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.commands;

import glide.api.models.commands.SetOptions;
import glide.api.models.commands.SetOptions.ConditionalSet;
import glide.api.models.commands.SetOptions.SetOptionsBuilder;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * String Commands interface to handle single commands.
 *
 * @see <a href="https://redis.io/commands/?group=string">String Commands</a>
 */
public interface StringCommands {

    /**
     * Get the value associated with the given <code>key</code>, or <code>null</code> if no such value
     * exists.
     *
     * @see <a href="https://redis.io/commands/get/">redis.io</a> for details.
     * @param key The <code>key</code> to retrieve from the database.
     * @return Response from Redis. If <code>key</code> exists, returns the <code>value</code> of
     *     <code>key</code> as a <code>String</code>. Otherwise, return <code>null</code>.
     */
    CompletableFuture<String> get(String key);

    /**
     * Set the given <code>key</code> with the given value.
     *
     * @see <a href="https://redis.io/commands/set/">redis.io</a> for details.
     * @param key The <code>key</code> to store.
     * @param value The value to store with the given <code>key</code>.
     * @return Response from Redis containing <code>"OK"</code>.
     */
    CompletableFuture<String> set(String key, String value);

    /**
     * Set the given key with the given value. Return value is dependent on the passed options.
     *
     * @see <a href="https://redis.io/commands/set/">redis.io</a> for details.
     * @param key The key to store.
     * @param value The value to store with the given key.
     * @param options The Set options.
     * @return Response from Redis containing a <code>String</code> or <code>null</code> response. If
     *     the value is successfully set, return <code>"OK"</code>. If value isn't set because of
     *     {@link ConditionalSet#ONLY_IF_EXISTS} or {@link ConditionalSet#ONLY_IF_DOES_NOT_EXIST}
     *     conditions, return <code>null</code>. If {@link SetOptionsBuilder#returnOldValue(boolean)}
     *     is set, return the old value as a <code>String</code>.
     */
    CompletableFuture<String> set(String key, String value, SetOptions options);

    /**
     * Retrieve the values of multiple <code>keys</code>.
     *
     * @see <a href="https://redis.io/commands/mget/">redis.io</a> for details.
     * @param keys A list of keys to retrieve values for.
     * @return An array of values corresponding to the provided <code>keys</code>.<br>
     *     If a <code>key</code>is not found, its corresponding value in the list will be <code>null
     *     </code>.
     */
    CompletableFuture<String[]> mget(String[] keys);

    /**
     * Set multiple keys to multiple values in a single operation.
     *
     * @see <a href="https://redis.io/commands/mset/">redis.io</a> for details.
     * @param keyValueMap A key-value map consisting of keys and their respective values to set.
     * @return Always <code>OK</code>.
     */
    CompletableFuture<String> mset(Map<String, String> keyValueMap);

    /**
     * Increment the number stored at <code>key</code> by one. If <code>key</code> does not exist, it
     * is set to 0 before performing the operation.
     *
     * @see <a href="https://redis.io/commands/incr/">redis.io</a> for details.
     * @param key The key to increment its value.
     * @return The value of <code>key</code> after the increment.
     */
    CompletableFuture<Long> incr(String key);

    /**
     * Increment the number stored at <code>key</code> by <code>amount</code>. If <code>key</code>
     * does not exist, it is set to 0 before performing the operation.
     *
     * @see <a href="https://redis.io/commands/incrby/">redis.io</a> for details.
     * @param key The key to increment its value.
     * @param amount The amount to increment.
     * @return The value of <code>key</code> after the increment.
     */
    CompletableFuture<Long> incrBy(String key, long amount);

    /**
     * Increment the string representing a floating point number stored at <code>key</code> by <code>
     * amount</code>. By using a negative increment value, the result is that the value stored at
     * <code>key</code> is decremented. If <code>key</code> does not exist, it is set to 0 before
     * performing the operation.
     *
     * @see <a href="https://redis.io/commands/incrbyfloat/">redis.io</a> for details.
     * @param key The key to increment its value.
     * @param amount The amount to increment.
     * @return The value of <code>key</code> after the increment.
     */
    CompletableFuture<Double> incrByFloat(String key, double amount);

    /**
     * Decrements the number stored at <code>key</code> by one. If <code>key</code> does not exist, it
     * is set to 0 before performing the operation.
     *
     * @see <a href="https://redis.io/commands/decr/">redis.io</a> for details.
     * @param key The key to decrement its value.
     * @return The value of <code>key</code> after the decrement. An error is raised if <code>key
     *     </code> contains a value of the wrong type or contains a string that cannot be represented
     *     as integer.
     */
    CompletableFuture<Long> decr(String key);

    /**
     * Decrements the number stored at <code>key</code> by <code>amount</code>. If <code>key</code>
     * does not exist, it is set to 0 before performing the operation.
     *
     * @see <a href="https://redis.io/commands/decrby/">redis.io</a> for details.
     * @param key The key to decrement its value.
     * @param amount The amount to decrement.
     * @return The value of <code>key</code> after the decrement. An error is raised if <code>key
     *     </code> contains a value of the wrong type or contains a string that cannot be represented
     *     as integer.
     */
    CompletableFuture<Long> decrBy(String key, long amount);
}
