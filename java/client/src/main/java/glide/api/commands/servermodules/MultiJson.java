/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.commands.servermodules;

import static glide.utils.ArgsBuilder.checkTypeOrThrow;
import static glide.utils.ArgsBuilder.newArgsBuilder;

import glide.api.models.BaseTransaction;
import glide.api.models.Transaction;
import glide.api.models.commands.ConditionalChange;
import glide.api.models.commands.json.JsonArrindexOptions;
import glide.api.models.commands.json.JsonGetOptions;
import lombok.NonNull;

/**
 * Transaction implementation for JSON module. Transactions allow the execution of a group of
 * commands in a single step. See {@link Transaction}.
 *
 * @example
 *     <pre>{@code
 * Transaction transaction = new Transaction();
 * MultiJson.set(transaction, "doc", ".", "{\"a\": 1.0, \"b\": 2}");
 * MultiJson.get(transaction, "doc");
 * Object[] result = client.exec(transaction).get();
 * assert result[0].equals("OK"); // result of MultiJson.set()
 * assert result[1].equals("{\"a\": 1.0, \"b\": 2}"); // result of MultiJson.get()
 * }</pre>
 */
public class MultiJson {

    private static final String JSON_PREFIX = "JSON.";
    private static final String JSON_SET = JSON_PREFIX + "SET";
    private static final String JSON_GET = JSON_PREFIX + "GET";
    private static final String JSON_MGET = JSON_PREFIX + "MGET";
    private static final String JSON_NUMINCRBY = JSON_PREFIX + "NUMINCRBY";
    private static final String JSON_NUMMULTBY = JSON_PREFIX + "NUMMULTBY";
    private static final String JSON_ARRAPPEND = JSON_PREFIX + "ARRAPPEND";
    private static final String JSON_ARRINSERT = JSON_PREFIX + "ARRINSERT";
    private static final String JSON_ARRINDEX = JSON_PREFIX + "ARRINDEX";
    private static final String JSON_ARRLEN = JSON_PREFIX + "ARRLEN";
    private static final String[] JSON_DEBUG_MEMORY = new String[] {JSON_PREFIX + "DEBUG", "MEMORY"};
    private static final String[] JSON_DEBUG_FIELDS = new String[] {JSON_PREFIX + "DEBUG", "FIELDS"};
    private static final String JSON_ARRPOP = JSON_PREFIX + "ARRPOP";
    private static final String JSON_ARRTRIM = JSON_PREFIX + "ARRTRIM";
    private static final String JSON_OBJLEN = JSON_PREFIX + "OBJLEN";
    private static final String JSON_OBJKEYS = JSON_PREFIX + "OBJKEYS";
    private static final String JSON_DEL = JSON_PREFIX + "DEL";
    private static final String JSON_FORGET = JSON_PREFIX + "FORGET";
    private static final String JSON_TOGGLE = JSON_PREFIX + "TOGGLE";
    private static final String JSON_STRAPPEND = JSON_PREFIX + "STRAPPEND";
    private static final String JSON_STRLEN = JSON_PREFIX + "STRLEN";
    private static final String JSON_CLEAR = JSON_PREFIX + "CLEAR";
    private static final String JSON_RESP = JSON_PREFIX + "RESP";
    private static final String JSON_TYPE = JSON_PREFIX + "TYPE";

    private MultiJson() {}

    /**
     * Sets the JSON value at the specified <code>path</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path Represents the path within the JSON document where the value will be set. The key
     *     will be modified only if <code>value</code> is added as the last child in the specified
     *     <code>path</code>, or if the specified <code>path</code> acts as the parent of a new child
     *     being added.
     * @param value The value to set at the specific path, in JSON formatted string.
     * @return Command Response - A simple <code>"OK"</code> response if the value is successfully
     *     set.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> set(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            @NonNull ArgType value) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(value);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_SET).add(key).add(path).add(value).toArray());
    }

    /**
     * Sets the JSON value at the specified <code>path</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path Represents the path within the JSON document where the value will be set. The key
     *     will be modified only if <code>value</code> is added as the last child in the specified
     *     <code>path</code>, or if the specified <code>path</code> acts as the parent of a new child
     *     being added.
     * @param value The value to set at the specific path, in JSON formatted string.
     * @param setCondition Set the value only if the given condition is met (within the key or path).
     * @return Command Response - A simple <code>"OK"</code> response if the value is successfully
     *     set. If value isn't set because of <code>setCondition</code>, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> set(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            @NonNull ArgType value,
            @NonNull ConditionalChange setCondition) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(value);
        return transaction.customCommand(
                newArgsBuilder()
                        .add(JSON_SET)
                        .add(key)
                        .add(path)
                        .add(value)
                        .add(setCondition.getValkeyApi())
                        .toArray());
    }

    /**
     * Retrieves the JSON value at the specified <code>path</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @return Command Response - Returns a string representation of the JSON document. If <code>key
     *     </code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> get(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_GET).add(key).toArray());
    }

    /**
     * Retrieves the JSON value at the specified <code>paths</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param paths List of paths within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>If one path is given:
     *           <ul>
     *             <li>For JSONPath (path starts with <code>$</code>): Returns a stringified JSON list
     *                 replies for every possible path, or a string representation of an empty array,
     *                 if path doesn't exist. If <code>key</code> doesn't exist, returns <code>null
     *                 </code>.
     *             <li>For legacy path (path doesn't start with <code>$</code>): Returns a string
     *                 representation of the value in <code>paths</code>. If <code>paths</code>
     *                 doesn't exist, an error is raised. If <code>key</code> doesn't exist, returns
     *                 <code>null</code>.
     *           </ul>
     *       <li>If multiple paths are given: Returns a stringified JSON, in which each path is a key,
     *           and it's corresponding value, is the value as if the path was executed in the command
     *           as a single path.
     *     </ul>
     *     In case of multiple paths, and <code>paths</code> are a mix of both JSONPath and legacy
     *     path, the command behaves as if all are JSONPath paths.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> get(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType[] paths) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(paths);
        return transaction.customCommand(newArgsBuilder().add(JSON_GET).add(key).add(paths).toArray());
    }

    /**
     * Retrieves the JSON value at the specified <code>path</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param options Options for formatting the byte representation of the JSON data. See <code>
     *     JsonGetOptions</code>.
     * @return Command Response - Returns a string representation of the JSON document. If <code>key
     *     </code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> get(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull JsonGetOptions options) {
        checkTypeOrThrow(key);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_GET).add(key).add(options.toArgs()).toArray());
    }

    /**
     * Retrieves the JSON value at the specified <code>path</code> stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param paths List of paths within the JSON document.
     * @param options Options for formatting the byte representation of the JSON data. See <code>
     *     JsonGetOptions</code>.
     * @return Command Response -
     *     <ul>
     *       <li>If one path is given:
     *           <ul>
     *             <li>For JSONPath (path starts with <code>$</code>): Returns a stringified JSON list
     *                 replies for every possible path, or a string representation of an empty array,
     *                 if path doesn't exist. If <code>key</code> doesn't exist, returns <code>null
     *                 </code>.
     *             <li>For legacy path (path doesn't start with <code>$</code>): Returns a string
     *                 representation of the value in <code>paths</code>. If <code>paths</code>
     *                 doesn't exist, an error is raised. If <code>key</code> doesn't exist, returns
     *                 <code>null</code>.
     *           </ul>
     *       <li>If multiple paths are given: Returns a stringified JSON, in which each path is a key,
     *           and it's corresponding value, is the value as if the path was executed in the command
     *           as a single path.
     *     </ul>
     *     In case of multiple paths, and <code>paths</code> are a mix of both JSONPath and legacy
     *     path, the command behaves as if all are JSONPath paths.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> get(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType[] paths,
            @NonNull JsonGetOptions options) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(paths);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_GET).add(key).add(options.toArgs()).add(paths).toArray());
    }

    /**
     * Retrieves the JSON values at the specified <code>path</code> stored at multiple <code>keys
     * </code>.
     *
     * @apiNote When using ClusterTransaction, all keys in the transaction must be mapped to the same
     *     slot.
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param keys The keys of the JSON documents.
     * @param path The path within the JSON documents.
     * @return Command Response -An array with requested values for each key.
     *     <ul>
     *       <li>For JSONPath (path starts with <code>$</code>): Returns a stringified JSON list
     *           replies for every possible path, or a string representation of an empty array, if
     *           path doesn't exist.
     *       <li>For legacy path (path doesn't start with <code>$</code>): Returns a string
     *           representation of the value in <code>path</code>. If <code>path</code> doesn't exist,
     *           the corresponding array element will be <code>null</code>.
     *     </ul>
     *     If a <code>key</code> doesn't exist, the corresponding array element will be <code>null
     *     </code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> mget(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType[] keys, @NonNull ArgType path) {
        checkTypeOrThrow(keys);
        checkTypeOrThrow(path);
        return transaction.customCommand(newArgsBuilder().add(JSON_MGET).add(keys).add(path).toArray());
    }

    /**
     * Appends one or more <code>values</code> to the JSON array at the specified <code>path</code>
     * within the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path Represents the <code>path</code> within the JSON document where the <code>values
     *     </code> will be appended.
     * @param values The JSON values to be appended to the array.<br>
     *     JSON string values must be wrapped with quotes. For example, to append <code>"foo"</code>,
     *     pass <code>"\"foo\""</code>.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a list of integers for every possible path, indicating the new length of the
     *           array after appending <code>values</code>, or <code>null</code> for JSON values
     *           matching the path that are not an array. If <code>path</code> does not exist, an
     *           empty array will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns the new length of the array after appending <code>values</code> to the array
     *           at <code>path</code>. If multiple paths are matched, returns the last updated array.
     *           If the JSON value at <code>path</code> is not an array or if <code>path</code>
     *           doesn't exist, an error is raised. If <code>key</code> doesn't exist, an error is
     *           raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrappend(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            @NonNull ArgType[] values) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(values);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_ARRAPPEND).add(key).add(path).add(values).toArray());
    }

    /**
     * Inserts one or more values into the array at the specified <code>path</code> within the JSON
     * document stored at <code>key</code>, before the given <code>index</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param index The array index before which values are inserted.
     * @param values The JSON values to be inserted into the array.<br>
     *     JSON string values must be wrapped with quotes. For example, to insert <code>"foo"</code>,
     *     pass <code>"\"foo\""</code>.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of integers for every possible path,
     *           indicating the new length of the array, or <code>null</code> for JSON values matching
     *           the path that are not an array. If <code>path</code> does not exist, an empty array
     *           will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an integer representing the new length of the array. If multiple paths are
     *           matched, returns the length of the first modified array. If <code>path</code> doesn't
     *           exist or the value at <code>path</code> is not an array, an error is raised.
     *     </ul>
     *     If the index is out of bounds or <code>key</code> doesn't exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrinsert(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            int index,
            @NonNull ArgType[] values) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(values);
        return transaction.customCommand(
                newArgsBuilder()
                        .add(JSON_ARRINSERT)
                        .add(key)
                        .add(path)
                        .add(Integer.toString(index))
                        .add(values)
                        .toArray());
    }

    /**
     * Searches for the first occurrence of a <code>scalar</code> JSON value in the arrays at the
     * path.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param scalar The scalar value to search for.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>): Returns an array with a
     *           list of integers for every possible path, indicating the index of the matching
     *           element. The value is <code>-1</code> if not found. If a value is not an array, its
     *           corresponding return value is <code>null</code>.
     *       <li>For legacy path (path doesn't start with <code>$</code>): Returns an integer
     *           representing the index of matching element, or <code>-1</code> if not found. If the
     *           value at the <code>path</code> is not an array, an error is raised.
     *     </ul>
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrindex(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            @NonNull ArgType scalar) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(scalar);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_ARRINDEX).add(key).add(path).add(scalar).toArray());
    }

    /**
     * Searches for the first occurrence of a <code>scalar</code> JSON value in the arrays at the
     * path.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param scalar The scalar value to search for.
     * @param options The additional options for the command. See <code>JsonArrindexOptions</code>.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>): Returns an array with a
     *           list of integers for every possible path, indicating the index of the matching
     *           element. The value is <code>-1</code> if not found. If a value is not an array, its
     *           corresponding return value is <code>null</code>.
     *       <li>For legacy path (path doesn't start with <code>$</code>): Returns an integer
     *           representing the index of matching element, or <code>-1</code> if not found. If the
     *           value at the <code>path</code> is not an array, an error is raised.
     *     </ul>
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrindex(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            @NonNull ArgType scalar,
            @NonNull JsonArrindexOptions options) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        checkTypeOrThrow(scalar);
        return transaction.customCommand(
                newArgsBuilder()
                        .add(JSON_ARRINDEX)
                        .add(key)
                        .add(path)
                        .add(scalar)
                        .add(options.toArgs())
                        .toArray());
    }

    /**
     * Retrieves the length of the array at the specified <code>path</code> within the JSON document
     * stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of integers for every possible path,
     *           indicating the length of the array, or <code>null</code> for JSON values matching the
     *           path that are not an array. If <code>path</code> does not exist, an empty array will
     *           be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an integer representing the length of the array. If multiple paths are
     *           matched, returns the length of the first matching array. If <code>path</code> doesn't
     *           exist or the value at <code>path</code> is not an array, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_ARRLEN).add(key).add(path).toArray());
    }

    /**
     * Retrieves the length of the array at the root of the JSON document stored at <code>key</code>.
     * <br>
     * Equivalent to {@link #arrlen(BaseTransaction, ArgType, ArgType)} with <code>path</code> set to
     * <code>
     * "."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - The array length stored at the root of the document. If document
     *     root is not an array, an error is raised.<br>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_ARRLEN).add(key).toArray());
    }

    /**
     * Reports memory usage in bytes of a JSON object at the specified <code>path</code> within the
     * JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of numbers for every possible path,
     *           indicating the memory usage. If <code>path</code> does not exist, an empty array will
     *           be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an integer representing the memory usage. If multiple paths are matched,
     *           returns the data of the first matching object. If <code>path</code> doesn't exist, an
     *           error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> debugMemory(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_DEBUG_MEMORY).add(key).add(path).toArray());
    }

    /**
     * Reports memory usage in bytes of a JSON object at the specified <code>path</code> within the
     * JSON document stored at <code>key</code>.<br>
     * Equivalent to {@link #debugMemory(BaseTransaction, ArgType, ArgType)} with <code>path</code>
     * set to <code>".."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - The total memory usage in bytes of the entire JSON document.<br>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     * @example
     *     <pre>{@code
     * Json.set(client, "doc", "$", "[1, 2.3, \"foo\", true, null, {}, [], {\"a\":1, \"b\":2}, [1, 2, 3]]").get();
     * var res = Json.debugMemory(client, "doc").get();
     * assert res == 258L;
     * }</pre>
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> debugMemory(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_DEBUG_MEMORY).add(key).toArray());
    }

    /**
     * Reports the number of fields at the specified <code>path</code> within the JSON document stored
     * at <code>key</code>.<br>
     * Each non-container JSON value counts as one field. Objects and arrays recursively count one
     * field for each of their containing JSON values. Each container value, except the root
     * container, counts as one additional field.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of numbers for every possible path,
     *           indicating the number of fields. If <code>path</code> does not exist, an empty array
     *           will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an integer representing the number of fields. If multiple paths are matched,
     *           returns the data of the first matching object. If <code>path</code> doesn't exist, an
     *           error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> debugFields(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_DEBUG_FIELDS).add(key).add(path).toArray());
    }

    /**
     * Reports the number of fields at the specified <code>path</code> within the JSON document stored
     * at <code>key</code>.<br>
     * Each non-container JSON value counts as one field. Objects and arrays recursively count one
     * field for each of their containing JSON values. Each container value, except the root
     * container, counts as one additional field.<br>
     * Equivalent to {@link #debugFields(BaseTransaction, ArgType, ArgType)} with <code>path</code>
     * set to <code>".."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - The total number of fields in the entire JSON document.<br>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> debugFields(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_DEBUG_FIELDS).add(key).toArray());
    }

    /**
     * Pops the last element from the array stored in the root of the JSON document stored at <code>
     * key</code>. Equivalent to {@link #arrpop(BaseTransaction, ArgType, ArgType)} with <code>
     * path</code> set to <code>"."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @return Command Response - Returns a string representing the popped JSON value, or <code>null
     *     </code> if the array at document root is empty.<br>
     *     If the JSON value at document root is not an array or if <code>key</code> doesn't exist, an
     *     error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrpop(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_ARRPOP).add(key).toArray());
    }

    /**
     * Pops the last element from the array located at <code>path</code> in the JSON document stored
     * at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an array with a strings for every possible path, representing the popped JSON
     *           values, or <code>null</code> for JSON values matching the path that are not an array
     *           or an empty array.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns a string representing the popped JSON value, or <code>null</code> if the
     *           array at <code>path</code> is empty. If multiple paths are matched, the value from
     *           the first matching array that is not empty is returned. If <code>path</code> doesn't
     *           exist or the value at <code>path</code> is not an array, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrpop(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_ARRPOP).add(key).add(path).toArray());
    }

    /**
     * Pops an element from the array located at <code>path</code> in the JSON document stored at
     * <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path The path within the JSON document.
     * @param index The index of the element to pop. Out of boundary indexes are rounded to their
     *     respective array boundaries.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an array with a strings for every possible path, representing the popped JSON
     *           values, or <code>null</code> for JSON values matching the path that are not an array
     *           or an empty array.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns a string representing the popped JSON value, or <code>null</code> if the
     *           array at <code>path</code> is empty. If multiple paths are matched, the value from
     *           the first matching array that is not empty is returned. If <code>path</code> doesn't
     *           exist or the value at <code>path</code> is not an array, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrpop(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            long index) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_ARRPOP).add(key).add(path).add(Long.toString(index)).toArray());
    }

    /**
     * Trims an array at the specified <code>path</code> within the JSON document stored at <code>key
     * </code> so that it becomes a subarray [<code>start</code>, <code>end</code>], both inclusive.
     * <br>
     * If <code>start</code> < 0, it is treated as 0.<br>
     * If <code>end</code> >= size (size of the array), it is treated as size -1.<br>
     * If <code>start</code> >= size or <code>start</code> > <code>end</code>, the array is emptied
     * and 0 is return.<br>
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param start The index of the first element to keep, inclusive.
     * @param end The index of the last element to keep, inclusive.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of integers for every possible path,
     *           indicating the new length of the array, or <code>null</code> for JSON values matching
     *           the path that are not an array. If the array is empty, its corresponding return value
     *           is 0. If <code>path</code> doesn't exist, an empty array will be return. If an index
     *           argument is out of bounds, an error is raised.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an integer representing the new length of the array. If the array is empty,
     *           its corresponding return value is 0. If multiple paths match, the length of the first
     *           trimmed array match is returned. If <code>path</code> doesn't exist, or the value at
     *           <code>path</code> is not an array, an error is raised. If an index argument is out of
     *           bounds, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> arrtrim(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            int start,
            int end) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder()
                        .add(JSON_ARRTRIM)
                        .add(key)
                        .add(path)
                        .add(Integer.toString(start))
                        .add(Integer.toString(end))
                        .toArray());
    }

    /**
     * Increments or decrements the JSON value(s) at the specified <code>path</code> by <code>number
     * </code> within the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param number The number to increment or decrement by.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a string representation of an array of strings, indicating the new values
     *           after incrementing for each matched <code>path</code>.<br>
     *           If a value is not a number, its corresponding return value will be <code>null</code>.
     *           <br>
     *           If <code>path</code> doesn't exist, a byte string representation of an empty array
     *           will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns a string representation of the resulting value after the increment or
     *           decrement.<br>
     *           If multiple paths match, the result of the last updated value is returned.<br>
     *           If the value at the <code>path</code> is not a number or <code>path</code> doesn't
     *           exist, an error is raised.
     *     </ul>
     *     If <code>key</code> does not exist, an error is raised.<br>
     *     If the result is out of the range of 64-bit IEEE double, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> numincrby(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            Number number) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_NUMINCRBY).add(key).add(path).add(number.toString()).toArray());
    }

    /**
     * Multiplies the JSON value(s) at the specified <code>path</code> by <code>number</code> within
     * the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @param number The number to multiply by.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a string representation of an array of strings, indicating the new values
     *           after multiplication for each matched <code>path</code>.<br>
     *           If a value is not a number, its corresponding return value will be <code>null</code>.
     *           <br>
     *           If <code>path</code> doesn't exist, a byte string representation of an empty array
     *           will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns a string representation of the resulting value after multiplication.<br>
     *           If multiple paths match, the result of the last updated value is returned.<br>
     *           If the value at the <code>path</code> is not a number or <code>path</code> doesn't
     *           exist, an error is raised.
     *     </ul>
     *     If <code>key</code> does not exist, an error is raised.<br>
     *     If the result is out of the range of 64-bit IEEE double, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> nummultby(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType path,
            Number number) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_NUMMULTBY).add(key).add(path).add(number.toString()).toArray());
    }

    /**
     * Retrieves the number of key-value pairs in the object values at the specified <code>path</code>
     * within the JSON document stored at <code>key</code>.<br>
     * Equivalent to {@link #objlen(BaseTransaction, ArgType, ArgType)} with <code>path</code> set to
     * <code>
     * "."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - The object length stored at the root of the document. If document
     *     root is not an object, an error is raised.<br>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> objlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_OBJLEN).add(key).toArray());
    }

    /**
     * Retrieves the number of key-value pairs in the object values at the specified <code>path</code>
     * within the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[]</code> with a list of long integers for every possible
     *           path, indicating the number of key-value pairs for each matching object, or <code>
     *           null
     *           </code> for JSON values matching the path that are not an object. If <code>path
     *           </code> does not exist, an empty array will be returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns the number of key-value pairs for the object value matching the path. If
     *           multiple paths are matched, returns the length of the first matching object. If
     *           <code>path</code> doesn't exist or the value at <code>path</code> is not an array, an
     *           error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> objlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_OBJLEN).add(key).add(path).toArray());
    }

    /**
     * Retrieves the key names in the object values at the specified <code>path</code> within the JSON
     * document stored at <code>key</code>.<br>
     * Equivalent to {@link #objkeys(BaseTransaction, ArgType, ArgType)} with <code>path</code> set to
     * <code>
     * "."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - The object length stored at the root of the document. If document
     *     root is not an object, an error is raised.<br>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> objkeys(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_OBJKEYS).add(key).toArray());
    }

    /**
     * Retrieves the key names in the object values at the specified <code>path</code> within the JSON
     * document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns an <code>Object[][]</code> with each nested array containing key names for
     *           each matching object for every possible path, indicating the list of object keys for
     *           each matching object, or <code>null</code> for JSON values matching the path that are
     *           not an object. If <code>path</code> does not exist, an empty sub-array will be
     *           returned.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns an array of object keys for the object value matching the path. If multiple
     *           paths are matched, returns the length of the first matching object. If <code>path
     *           </code> doesn't exist or the value at <code>path</code> is not an array, an error is
     *           raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> objkeys(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_OBJKEYS).add(key).add(path).toArray());
    }

    /**
     * Deletes the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @return Command Response - The number of elements deleted. 0 if the key does not exist.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> del(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_DEL).add(key).toArray());
    }

    /**
     * Deletes the JSON value at the specified <code>path</code> within the JSON document stored at
     * <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path Represents the path within the JSON document where the value will be deleted.
     * @return Command Response - The number of elements deleted. 0 if the key does not exist, or if
     *     the JSON path is invalid or does not exist.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> del(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(newArgsBuilder().add(JSON_DEL).add(key).add(path).toArray());
    }

    /**
     * Deletes the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @return Command Response - The number of elements deleted. 0 if the key does not exist.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> forget(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_FORGET).add(key).toArray());
    }

    /**
     * Deletes the JSON value at the specified <code>path</code> within the JSON document stored at
     * <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The <code>key</code> of the JSON document.
     * @param path Represents the path within the JSON document where the value will be deleted.
     * @return Command Response - The number of elements deleted. 0 if the key does not exist, or if
     *     the JSON path is invalid or does not exist.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> forget(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_FORGET).add(key).add(path).toArray());
    }

    /**
     * Toggles a Boolean value stored at the root within the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - Returns the toggled boolean value at the root of the document, or
     *     <code>null</code> for JSON values matching the root that are not boolean. If <code>key
     *     </code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> toggle(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_TOGGLE).add(key).toArray());
    }

    /**
     * Toggles a Boolean value stored at the specified <code>path</code> within the JSON document
     * stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a <code>Boolean[]</code> with the toggled boolean value for every possible
     *           path, or <code>null</code> for JSON values matching the path that are not boolean.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns the value of the toggled boolean in <code>path</code>. If <code>path</code>
     *           doesn't exist or the value at <code>path</code> isn't a boolean, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, returns <code>null</code>.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> toggle(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_TOGGLE).add(key).add(path).toArray());
    }

    /**
     * Appends the specified <code>value</code> to the string stored at the specified <code>path
     * </code> within the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param value The value to append to the string. Must be wrapped with single quotes. For
     *     example, to append "foo", pass '"foo"'.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a list of integer replies for every possible path, indicating the length of
     *           the resulting string after appending <code>value</code>, or <code>null</code> for
     *           JSON values matching the path that are not string.<br>
     *           If <code>key</code> doesn't exist, an error is raised.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns the length of the resulting string after appending <code>value</code> to the
     *           string at <code>path</code>.<br>
     *           If multiple paths match, the length of the last updated string is returned.<br>
     *           If the JSON value at <code>path</code> is not a string of if <code>path</code>
     *           doesn't exist, an error is raised.<br>
     *           If <code>key</code> doesn't exist, an error is raised.
     *     </ul>
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> strappend(
            @NonNull BaseTransaction<T> transaction,
            @NonNull ArgType key,
            @NonNull ArgType value,
            @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(value);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_STRAPPEND).add(key).add(path).add(value).toArray());
    }

    /**
     * Appends the specified <code>value</code> to the string stored at the root within the JSON
     * document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param value The value to append to the string. Must be wrapped with single quotes. For
     *     example, to append "foo", pass '"foo"'.
     * @return Command Response - Returns the length of the resulting string after appending <code>
     *     value</code> to the string at the root.<br>
     *     If the JSON value at root is not a string, an error is raised.<br>
     *     If <code>key</code> doesn't exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> strappend(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType value) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(value);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_STRAPPEND).add(key).add(value).toArray());
    }

    /**
     * Returns the length of the JSON string value stored at the specified <code>path</code> within
     * the JSON document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>):<br>
     *           Returns a list of integer replies for every possible path, indicating the length of
     *           the JSON string value, or <code>null</code> for JSON values matching the path that
     *           are not string.
     *       <li>For legacy path (<code>path</code> doesn't start with <code>$</code>):<br>
     *           Returns the length of the JSON value at <code>path</code> or <code>null</code> if
     *           <code>key</code> doesn't exist.<br>
     *           If multiple paths match, the length of the first matched string is returned.<br>
     *           If the JSON value at <code>path</code> is not a string of if <code>path</code>
     *           doesn't exist, an error is raised. If <code>key</code> doesn't exist, <code>null
     *           </code> is returned.
     *     </ul>
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> strlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(
                newArgsBuilder().add(JSON_STRLEN).add(key).add(path).toArray());
    }

    /**
     * Returns the length of the JSON string value stored at the root within the JSON document stored
     * at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - Returns the length of the JSON value at the root.<br>
     *     If the JSON value is not a string, an error is raised.<br>
     *     If <code>key</code> doesn't exist, <code>null</code> is returned.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> strlen(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_STRLEN).add(key).toArray());
    }

    /**
     * Clears an array and an object at the root of the JSON document stored at <code>key</code>.<br>
     * Equivalent to {@link #clear(BaseTransaction, ArgType, ArgType)} with <code>path</code> set to
     * <code>
     * "."</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - <code>1</code> if the document wasn't empty or <code>0</code> if it
     *     was.<br>
     *     If <code>key</code> doesn't exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> clear(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_CLEAR).add(key).toArray());
    }

    /**
     * Clears arrays and objects at the specified <code>path</code> within the JSON document stored at
     * <code>key</code>.<br>
     * Numeric values are set to <code>0</code>, boolean values are set to <code>false</code>, and
     * string values are converted to empty strings.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response - The number of containers cleared.<br>
     *     If <code>path</code> doesn't exist, or the value at <code>path</code> is already cleared
     *     (e.g., an empty array, object, or string), 0 is returned. If <code>key</code> doesn't
     *     exist, an error is raised.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> clear(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(newArgsBuilder().add(JSON_CLEAR).add(key).add(path).toArray());
    }

    /**
     * Retrieves the JSON document stored at <code>key</code>. The returning result is in the Valkey
     * or Redis OSS Serialization Protocol (RESP).
     *
     * <ul>
     *   <li>JSON null is mapped to the RESP Null Bulk String.
     *   <li>JSON Booleans are mapped to RESP Simple string.
     *   <li>JSON integers are mapped to RESP Integers.
     *   <li>JSON doubles are mapped to RESP Bulk Strings.
     *   <li>JSON strings are mapped to RESP Bulk Strings.
     *   <li>JSON arrays are represented as RESP arrays, where the first element is the simple string
     *       [, followed by the array's elements.
     *   <li>JSON objects are represented as RESP object, where the first element is the simple string
     *       {, followed by key-value pairs, each of which is a RESP bulk string.
     * </ul>
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - Returns the JSON document in its RESP form. If <code>key</code>
     *     doesn't exist, <code>null</code> is returned.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> resp(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_RESP).add(key).toArray());
    }

    /**
     * Retrieve the JSON value at the specified <code>path</code> within the JSON document stored at
     * <code>key</code>. The returning result is in the Valkey or Redis OSS Serialization Protocol
     * (RESP).
     *
     * <ul>
     *   <li>JSON null is mapped to the RESP Null Bulk String.
     *   <li>JSON Booleans are mapped to RESP Simple string.
     *   <li>JSON integers are mapped to RESP Integers.
     *   <li>JSON doubles are mapped to RESP Bulk Strings.
     *   <li>JSON strings are mapped to RESP Bulk Strings.
     *   <li>JSON arrays are represented as RESP arrays, where the first element is the simple string
     *       [, followed by the array's elements.
     *   <li>JSON objects are represented as RESP object, where the first element is the simple string
     *       {, followed by key-value pairs, each of which is a RESP bulk string.
     * </ul>
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path The path within the JSON document.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>): Returns a list of
     *           replies for every possible path, indicating the RESP form of the JSON value. If
     *           <code>path</code> doesn't exist, returns an empty list.
     *       <li>For legacy path (<code>path</code> doesn't starts with <code>$</code>): Returns a
     *           single reply for the JSON value at the specified path, in its RESP form. If multiple
     *           paths match, the value of the first JSON value match is returned. If <code>path
     *           </code> doesn't exist, an error is raised.
     *     </ul>
     *     If <code>key</code> doesn't exist, <code>null</code> is returned.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> resp(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(newArgsBuilder().add(JSON_RESP).add(key).add(path).toArray());
    }

    /**
     * Retrieves the type of the JSON value at the root of the JSON document stored at <code>key
     * </code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @return Command Response - Returns the type of the JSON value at root. If <code>key</code>
     *     doesn't exist, <code>
     *     null</code> is returned.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> type(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key) {
        checkTypeOrThrow(key);
        return transaction.customCommand(newArgsBuilder().add(JSON_TYPE).add(key).toArray());
    }

    /**
     * Retrieves the type of the JSON value at the specified <code>path</code> within the JSON
     * document stored at <code>key</code>.
     *
     * @param transaction The Valkey GLIDE client to execute the command in transaction.
     * @param key The key of the JSON document.
     * @param path Represents the path within the JSON document where the type will be retrieved.
     * @return Command Response -
     *     <ul>
     *       <li>For JSONPath (<code>path</code> starts with <code>$</code>): Returns a list of string
     *           replies for every possible path, indicating the type of the JSON value. If `path`
     *           doesn't exist, an empty array will be returned.
     *       <li>For legacy path (<code>path</code> doesn't starts with <code>$</code>): Returns the
     *           type of the JSON value at `path`. If multiple paths match, the type of the first JSON
     *           value match is returned. If `path` doesn't exist, <code>null</code> will be returned.
     *     </ul>
     *     If <code>key</code> doesn't exist, <code>null</code> is returned.
     */
    public static <ArgType, T extends BaseTransaction<T>> BaseTransaction<T> type(
            @NonNull BaseTransaction<T> transaction, @NonNull ArgType key, @NonNull ArgType path) {
        checkTypeOrThrow(key);
        checkTypeOrThrow(path);
        return transaction.customCommand(newArgsBuilder().add(JSON_TYPE).add(key).add(path).toArray());
    }
}
