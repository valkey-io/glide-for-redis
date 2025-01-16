/**
 * Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
 */

import { ClusterTransaction, Transaction } from "src/Transaction";
import { BaseClient, DecoderOption, GlideString } from "../BaseClient";
import { ConditionalChange } from "../Commands";
import { GlideClient } from "../GlideClient";
import { GlideClusterClient, RouteOption } from "../GlideClusterClient";

export type ReturnTypeJson<T> = T | (T | null)[];
export type UniversalReturnTypeJson<T> = T | T[];

/**
 * Represents options for formatting JSON data, to be used in the {@link GlideJson.get | JSON.GET} command.
 */
export interface JsonGetOptions {
    /** The path or list of paths within the JSON document. Default is root `$`. */
    path?: GlideString | GlideString[];
    /** Sets an indentation string for nested levels. */
    indent?: GlideString;
    /** Sets a string that's printed at the end of each line. */
    newline?: GlideString;
    /** Sets a string that's put between a key and a value. */
    space?: GlideString;
    /** Optional, allowed to be present for legacy compatibility and has no other effect */
    noescape?: boolean;
}

/** Additional options for {@link GlideJson.arrpop | JSON.ARRPOP} command. */
export interface JsonArrPopOptions {
    /** The path within the JSON document. */
    path: GlideString;
    /** The index of the element to pop. Out of boundary indexes are rounded to their respective array boundaries. */
    index?: number;
}

/**
 * @internal
 */
function _jsonGetOptionsToArgs(options: JsonGetOptions): GlideString[] {
    const result: GlideString[] = [];

    if (options.path) {
        if (Array.isArray(options.path)) {
            result.push(...options.path);
        } else {
            result.push(options.path);
        }
    }

    if (options.indent) {
        result.push("INDENT", options.indent);
    }

    if (options.newline) {
        result.push("NEWLINE", options.newline);
    }

    if (options.space) {
        result.push("SPACE", options.space);
    }

    if (options.noescape) {
        result.push("NOESCAPE");
    }

    return result;
}

/**
 * @internal
 */
function _executeCommand<T>(
    client: BaseClient,
    args: GlideString[],
    options?: RouteOption & DecoderOption,
): Promise<T> {
    if (client instanceof GlideClient) {
        return (client as GlideClient).customCommand(
            args,
            options,
        ) as Promise<T>;
    } else {
        return (client as GlideClusterClient).customCommand(
            args,
            options,
        ) as Promise<T>;
    }
}

/** Module for JSON commands. */
export class GlideJson {
    /**
     * Sets the JSON value at the specified `path` stored at `key`.
     *
     * @param client The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - Represents the path within the JSON document where the value will be set.
     *      The key will be modified only if `value` is added as the last child in the specified `path`, or if the specified `path` acts as the parent of a new child being added.
     * @param value - The value to set at the specific path, in JSON formatted bytes or str.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `conditionalChange` - Set the value only if the given condition is met (within the key or path).
     *      Equivalent to [`XX` | `NX`] in the module API.
     * - (Optional) `decoder`: see {@link DecoderOption}.
     *
     * @returns If the value is successfully set, returns `"OK"`.
     *       If `value` isn't set because of `conditionalChange`, returns `null`.
     *
     * @example
     * ```typescript
     * const value = {a: 1.0, b:2};
     * const jsonStr = JSON.stringify(value);
     * const result = await GlideJson.set(client, "doc", "$", jsonStr);
     * console.log(result); // 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     *
     * const jsonGetStr = await GlideJson.get(client, "doc", {path: "$"}); // Returns the value at path '$' in the JSON document stored at `doc` as JSON string.
     * console.log(jsonGetStr); // '[{"a":1.0,"b":2}]'
     * console.log(JSON.stringify(jsonGetStr)); //  [{"a": 1.0, "b": 2}] # JSON object retrieved from the key `doc`
     * ```
     */
    static async set(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        value: GlideString,
        options?: { conditionalChange: ConditionalChange } & DecoderOption,
    ): Promise<"OK" | null> {
        const args: GlideString[] = ["JSON.SET", key, path, value];

        if (options?.conditionalChange !== undefined) {
            args.push(options.conditionalChange);
        }

        return _executeCommand<"OK" | null>(client, args, options);
    }

    /**
     * Retrieves the JSON value at the specified `paths` stored at `key`.
     *
     * @param client The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) Options for formatting the byte representation of the JSON data. See {@link JsonGetOptions}.
     * - (Optional) `decoder`: see {@link DecoderOption}.
     * @returns
     *   - If one path is given:
     *     - For JSONPath (path starts with `$`):
     *       - Returns a stringified JSON list of bytes replies for every possible path,
     *         or a byte string representation of an empty array, if path doesn't exist.
     *         If `key` doesn't exist, returns `null`.
     *     - For legacy path (path doesn't start with `$`):
     *         Returns a byte string representation of the value in `path`.
     *         If `path` doesn't exist, an error is raised.
     *         If `key` doesn't exist, returns `null`.
     *  - If multiple paths are given:
     *         Returns a stringified JSON object in bytes, in which each path is a key, and it's corresponding value, is the value as if the path was executed in the command as a single path.
     * In case of multiple paths, and `paths` are a mix of both JSONPath and legacy path, the command behaves as if all are JSONPath paths.
     *
     * @example
     * ```typescript
     * const jsonStr = await GlideJson.get('doc', {path: '$'});
     * console.log(JSON.parse(jsonStr as string));
     * // Output: [{"a": 1.0, "b" :2}] - JSON object retrieved from the key `doc`.
     *
     * const jsonData = await GlideJson.get(('doc', {path: '$'});
     * console.log(jsonData);
     * // Output: '[{"a":1.0,"b":2}]' - Returns the value at path '$' in the JSON document stored at `doc`.
     *
     * const formattedJson = await GlideJson.get(('doc', {
     *     ['$.a', '$.b']
     *     indent: "  ",
     *     newline: "\n",
     *     space: " "
     * });
     * console.log(formattedJson);
     * // Output: "{\n \"$.a\": [\n  1.0\n ],\n \"$.b\": [\n  2\n ]\n}" - Returns values at paths '$.a' and '$.b' with custom format.
     *
     * const nonExistingPath = await GlideJson.get(('doc', {path: '$.non_existing_path'});
     * console.log(nonExistingPath);
     * // Output: "[]" - Empty array since the path does not exist in the JSON document.
     * ```
     */
    static async get(
        client: BaseClient,
        key: GlideString,
        options?: JsonGetOptions & DecoderOption,
    ): Promise<ReturnTypeJson<GlideString>> {
        const args = ["JSON.GET", key];

        if (options) {
            const optionArgs = _jsonGetOptionsToArgs(options);
            args.push(...optionArgs);
        }

        return _executeCommand(client, args, options);
    }

    /**
     * Retrieves the JSON values at the specified `path` stored at multiple `keys`.
     *
     * @remarks When in cluster mode, if keys in `keyValueMap` map to different hash slots, the command
     * will be split across these slots and executed separately for each. This means the command
     * is atomic only at the slot level. If one or more slot-specific requests fail, the entire
     * call will return the first encountered error, even though some requests may have succeeded
     * while others did not. If this behavior impacts your application logic, consider splitting
     * the request into sub-requests per slot to ensure atomicity.
     *
     * @param client - The client to execute the command.
     * @param keys - The keys of the JSON documents.
     * @param path - The path within the JSON documents.
     * @param options - (Optional) See {@link DecoderOption}.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns a stringified JSON list replies for every possible path, or a string representation
     *       of an empty array, if path doesn't exist.
     * - For legacy path (path doesn't start with `$`):
     *       Returns a string representation of the value in `path`. If `path` doesn't exist,
     *       the corresponding array element will be `null`.
     * - If a `key` doesn't exist, the corresponding array element will be `null`.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc1", "$", '{"a": 1, "b": ["one", "two"]}');
     * await GlideJson.set(client, "doc2", "$", '{"a": 1, "c": false}');
     * const res = await GlideJson.mget(client, [ "doc1", "doc2", "doc3" ], "$.c");
     * console.log(res); // Output: ["[]", "[false]", null]
     * ```
     */
    static async mget(
        client: BaseClient,
        keys: GlideString[],
        path: GlideString,
        options?: DecoderOption,
    ): Promise<GlideString[]> {
        const args = ["JSON.MGET", ...keys, path];
        return _executeCommand(client, args, options);
    }

    /**
     * Inserts one or more values into the array at the specified `path` within the JSON
     * document stored at `key`, before the given `index`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param index - The array index before which values are inserted.
     * @param values - The JSON values to be inserted into the array.
     *     JSON string values must be wrapped with quotes. For example, to insert `"foo"`, pass `"\"foo\""`.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the new length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the new length of the array. If multiple paths are
     *       matched, returns the length of the first modified array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '[[], ["a"], ["a", "b"]]');
     * const result = await GlideJson.arrinsert(client, "doc", "$[*]", 0, ['"c"', '{"key": "value"}', "true", "null", '["bar"]']);
     * console.log(result); // Output: [5, 6, 7]
     * const doc = await GlideJson.get(client, "doc");
     * console.log(doc); // Output: '[["c",{"key":"value"},true,null,["bar"]],["c",{"key":"value"},true,null,["bar"],"a"],["c",{"key":"value"},true,null,["bar"],"a","b"]]'
     * ```
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '[[], ["a"], ["a", "b"]]');
     * const result = await GlideJson.arrinsert(client, "doc", ".", 0, ['"c"'])
     * console.log(result); // Output: 4
     * const doc = await GlideJson.get(client, "doc");
     * console.log(doc); // Output: '[\"c\",[],[\"a\"],[\"a\",\"b\"]]'
     * ```
     */
    static async arrinsert(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        index: number,
        values: GlideString[],
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.ARRINSERT", key, path, index.toString(), ...values];

        return _executeCommand(client, args);
    }

    /**
     * Pops an element from the array located at `path` in the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) See {@link JsonArrPopOptions} and {@link DecoderOption}.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a strings for every possible path, representing the popped JSON
     *       values, or `null` for JSON values matching the path that are not an array
     *       or an empty array.
     * - For legacy path (path doesn't start with `$`):
     *       Returns a string representing the popped JSON value, or `null` if the
     *       array at `path` is empty. If multiple paths are matched, the value from
     *       the first matching array that is not empty is returned. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '{"a": [1, 2, true], "b": {"a": [3, 4, ["value", 3, false], 5], "c": {"a": 42}}}');
     * let result = await GlideJson.arrpop(client, "doc", { path: "$.a", index: 1 });
     * console.log(result); // Output: ['2'] - Popped second element from array at path `$.a`
     * result = await GlideJson.arrpop(client, "doc", { path: "$..a" });
     * console.log(result); // Output: ['true', '5', null] - Popped last elements from all arrays matching path `$..a`
     *
     * result = await GlideJson.arrpop(client, "doc", { path: "..a" });
     * console.log(result); // Output: "1" - First match popped (from array at path ..a)
     * // Even though only one value is returned from `..a`, subsequent arrays are also affected
     * console.log(await GlideJson.get(client, "doc", "$..a")); // Output: "[[], [3, 4], 42]"
     * ```
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '[[], ["a"], ["a", "b", "c"]]');
     * let result = await GlideJson.arrpop(client, "doc", { path: ".", index: -1 });
     * console.log(result); // Output: '["a","b","c"]' - Popped last elements at path `.`
     * ```
     */
    static async arrpop(
        client: BaseClient,
        key: GlideString,
        options?: JsonArrPopOptions & DecoderOption,
    ): Promise<ReturnTypeJson<GlideString>> {
        const args = ["JSON.ARRPOP", key];
        if (options?.path) args.push(options?.path);
        if (options && "index" in options && options.index)
            args.push(options?.index.toString());

        return _executeCommand(client, args, options);
    }

    /**
     * Retrieves the length of the array at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the length of the array. If multiple paths are
     *       matched, returns the length of the first matching array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '{"a": [1, 2, 3], "b": {"a": [1, 2], "c": {"a": 42}}}');
     * console.log(await GlideJson.arrlen(client, "doc", { path: "$" })); // Output: [null] - No array at the root path.
     * console.log(await GlideJson.arrlen(client, "doc", { path: "$.a" })); // Output: [3] - Retrieves the length of the array at path $.a.
     * console.log(await GlideJson.arrlen(client, "doc", { path: "$..a" })); // Output: [3, 2, null] - Retrieves lengths of arrays found at all levels of the path `$..a`.
     * console.log(await GlideJson.arrlen(client, "doc", { path: "..a" })); // Output: 3 - Legacy path retrieves the first array match at path `..a`.
     * ```
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '[1, 2, 3, 4]');
     * console.log(await GlideJson.arrlen(client, "doc")); // Output: 4 - the length of array at root.
     * ```
     */
    static async arrlen(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.ARRLEN", key];
        if (options?.path) args.push(options?.path);

        return _executeCommand(client, args);
    }

    /**
     * Trims an array at the specified `path` within the JSON document stored at `key` so that it becomes a subarray [start, end], both inclusive.
     * If `start` < 0, it is treated as 0.
     * If `end` >= size (size of the array), it is treated as size-1.
     * If `start` >= size or `start` > `end`, the array is emptied and 0 is returned.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param start - The start index, inclusive.
     * @param end - The end index, inclusive.
     * @returns
     *     - For JSONPath (`path` starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the new length of the array,
     *         or `null` for JSON values matching the path that are not an array.
     *       - If the array is empty, its corresponding return value is 0.
     *       - If `path` doesn't exist, an empty array will be returned.
     *       - If an index argument is out of bounds, an error is raised.
     *     - For legacy path (`path` doesn't start with `$`):
     *       - Returns an integer representing the new length of the array.
     *       - If the array is empty, its corresponding return value is 0.
     *       - If multiple paths match, the length of the first trimmed array match is returned.
     *       - If `path` doesn't exist, or the value at `path` is not an array, an error is raised.
     *       - If an index argument is out of bounds, an error is raised.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '[[], ["a"], ["a", "b"], ["a", "b", "c"]]');
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * const result = await GlideJson.arrtrim(client, "doc", "$[*]", 0, 1);
     * console.log(result);
     * // Output: [0, 1, 2, 2]
     * console.log(await GlideJson.get(client, "doc", "$"));
     * // Output: '[[],["a"],["a","b"],["a","b"]]' - Returns the value at path '$' in the JSON document stored at `doc`.
     * ```
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"children": ["John", "Jack", "Tom", "Bob", "Mike"]}');
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * result = await GlideJson.arrtrim(client, "doc", ".children", 0, 1);
     * console.log(result);
     * // Output: 2
     * console.log(await GlideJson.get(client, "doc", ".children"));
     * // Output: '["John", "Jack"]' - Returns the value at path '$' in the JSON document stored at `doc`.
     * ```
     */
    static async arrtrim(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        start: number,
        end: number,
    ): Promise<ReturnTypeJson<number>> {
        const args: GlideString[] = [
            "JSON.ARRTRIM",
            key,
            path,
            start.toString(),
            end.toString(),
        ];
        return _executeCommand<ReturnTypeJson<number>>(client, args);
    }

    /**
     * Searches for the first occurrence of a `scalar` JSON value in the arrays at the `path`.
     * Out of range errors are treated by rounding the index to the array's `start` and `end.
     * If `start` > `end`, return `-1` (not found).
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param scalar - The scalar value to search for.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `start`: The start index, inclusive. Default to 0 if not provided.
     * - (Optional) `end`: The end index, exclusive. Default to 0 if not provided.
     *                     0 or -1 means the last element is included.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the index of the matching element. The value is `-1` if not found.
     *       If a value is not an array, its corresponding return value is `null`.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the index of matching element, or `-1` if
     *       not found. If the value at the `path` is not an array, an error is raised.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '{"a": ["value", 3], "b": {"a": [3, ["value", false], 5]}}');
     * console.log(await GlideJson.arrindex(client, "doc", "$..a", 3, { start: 3, end: 3 }); // Output: [2, -1]
     * ```
     */
    static async arrindex(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        scalar: GlideString | number | boolean | null,
        options?: { start: number; end?: number },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.ARRINDEX", key, path];

        if (typeof scalar === `number`) {
            args.push(scalar.toString());
        } else if (typeof scalar === `boolean`) {
            args.push(scalar ? `true` : `false`);
        } else if (scalar !== null) {
            args.push(scalar);
        } else {
            args.push(`null`);
        }

        if (options?.start !== undefined) args.push(options?.start.toString());
        if (options?.end !== undefined) args.push(options?.end.toString());

        return _executeCommand(client, args);
    }

    /**
     * Toggles a Boolean value stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified.
     * @returns - For JSONPath (`path` starts with `$`), returns a list of boolean replies for every possible path, with the toggled boolean value,
     * or `null` for JSON values matching the path that are not boolean.
     * - For legacy path (`path` doesn't starts with `$`), returns the value of the toggled boolean in `path`.
     * - Note that when sending legacy path syntax, If `path` doesn't exist or the value at `path` isn't a boolean, an error is raised.
     *
     * @example
     * ```typescript
     * const value = {bool: true, nested: {bool: false, nested: {bool: 10}}};
     * const jsonStr = JSON.stringify(value);
     * const resultSet = await GlideJson.set(client, "doc", "$", jsonStr);
     * // Output: 'OK'
     *
     * const resultToggle = await.GlideJson.toggle(client, "doc", {path: "$.bool"});
     * // Output: [false, true, null] - Indicates successful toggling of the Boolean values at path '$.bool' in the key stored at `doc`.
     *
     * const resultToggle = await.GlideJson.toggle(client, "doc", {path: "bool"});
     * // Output: true - Indicates successful toggling of the Boolean value at path 'bool' in the key stored at `doc`.
     *
     * const resultToggle = await.GlideJson.toggle(client, "doc", {path: "bool"});
     * // Output: true - Indicates successful toggling of the Boolean value at path 'bool' in the key stored at `doc`.
     *
     * const jsonGetStr = await GlideJson.get(client, "doc", {path: "$"});
     * console.log(JSON.stringify(jsonGetStr));
     * // Output: [{bool: true, nested: {bool: true, nested: {bool: 10}}}] - The updated JSON value in the key stored at `doc`.
     *
     * // Without specifying a path, the path defaults to root.
     * console.log(await GlideJson.set(client, "doc2", ".", true)); // Output: "OK"
     * console.log(await GlideJson.toggle(client, {path: "doc2"})); // Output: "false"
     * console.log(await GlideJson.toggle(client, {path: "doc2"})); // Output: "true"
     * ```
     */
    static async toggle(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<boolean>> {
        const args = ["JSON.TOGGLE", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args);
    }

    /**
     * Deletes the JSON value at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: If `null`, deletes the entire JSON document at `key`.
     * @returns - The number of elements removed. If `key` or `path` doesn't exist, returns 0.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{a: 1, nested: {a:2, b:3}}'));
     * // Output: "OK" - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.del(client, "doc", {path: "$..a"}));
     * // Output: 2 - Indicates successful deletion of the specific values in the key stored at `doc`.
     * console.log(await GlideJson.get(client, "doc", {path: "$"}));
     * // Output: "[{nested: {b: 3}}]" - Returns the value at path '$' in the JSON document stored at `doc`.
     * console.log(await GlideJson.del(client, "doc"));
     * // Output: 1 - Deletes the entire JSON document stored at `doc`.
     * ```
     */
    static async del(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<number> {
        const args = ["JSON.DEL", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand<number>(client, args);
    }

    /**
     * Deletes the JSON value at the specified `path` within the JSON document stored at `key`. This command is
     * an alias of {@link del}.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: If `null`, deletes the entire JSON document at `key`.
     * @returns - The number of elements removed. If `key` or `path` doesn't exist, returns 0.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{a: 1, nested: {a:2, b:3}}'));
     * // Output: "OK" - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.forget(client, "doc", {path: "$..a"}));
     * // Output: 2 - Indicates successful deletion of the specific values in the key stored at `doc`.
     * console.log(await GlideJson.get(client, "doc", {path: "$"}));
     * // Output: "[{nested: {b: 3}}]" - Returns the value at path '$' in the JSON document stored at `doc`.
     * console.log(await GlideJson.forget(client, "doc"));
     * // Output: 1 - Deletes the entire JSON document stored at `doc`.
     * ```
     */
    static async forget(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<number> {
        const args = ["JSON.FORGET", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand<number>(client, args);
    }

    /**
     * Reports the type of values at the given path.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: Defaults to root (`"."`) if not provided.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of strings that represents the type of value at each path.
     *         The type is one of "null", "boolean", "string", "number", "integer", "object" and "array".
     *       - If a path does not exist, its corresponding return value is `null`.
     *       - Empty array if the document key does not exist.
     *     - For legacy path (path doesn't start with `$`):
     *       - String that represents the type of the value.
     *       - `null` if the document key does not exist.
     *       - `null` if the JSON path is invalid or does not exist.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '[1, 2.3, "foo", true, null, {}, []]'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * const result = await GlideJson.type(client, "doc", {path: "$[*]"});
     * console.log(result);
     * // Output: ["integer", "number", "string", "boolean", null, "object", "array"];
     * console.log(await GlideJson.set(client, "doc2", ".", "{Name: 'John', Age: 27}"));
     * console.log(await GlideJson.type(client, "doc2")); // Output: "object"
     * console.log(await GlideJson.type(client, "doc2", {path: ".Age"})); // Output: "integer"
     * ```
     */
    static async type(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<GlideString>> {
        const args = ["JSON.TYPE", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand<ReturnTypeJson<GlideString>>(client, args);
    }

    /**
     * Clears arrays or objects at the specified JSON path in the document stored at `key`.
     * Numeric values are set to `0`, boolean values are set to `false`, and string values are converted to empty strings.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The JSON path to the arrays or objects to be cleared. Defaults to root if not provided.
     * @returns The number of containers cleared, numeric values zeroed, and booleans toggled to `false`,
     * and string values converted to empty strings.
     * If `path` doesn't exist, or the value at `path` is already empty (e.g., an empty array, object, or string), `0` is returned.
     * If `key doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"obj":{"a":1, "b":2}, "arr":[1,2,3], "str": "foo", "bool": true, "int": 42, "float": 3.14, "nullVal": null}'));
     * // Output: 'OK' - JSON document is successfully set.
     * console.log(await GlideJson.clear(client, "doc", {path: "$.*"}));
     * // Output: 6 - 6 values are cleared (arrays/objects/strings/numbers/booleans), but `null` remains as is.
     * console.log(await GlideJson.get(client, "doc", "$"));
     * // Output: '[{"obj":{},"arr":[],"str":"","bool":false,"int":0,"float":0.0,"nullVal":null}]'
     * console.log(await GlideJson.clear(client, "doc", {path: "$.*"}));
     * // Output: 0 - No further clearing needed since the containers are already empty and the values are defaults.
     *
     * console.log(await GlideJson.set(client, "doc", "$", '{"a": 1, "b": {"a": [5, 6, 7], "b": {"a": true}}, "c": {"a": "value", "b": {"a": 3.5}}, "d": {"a": {"foo": "foo"}}, "nullVal": null}'));
     * // Output: 'OK'
     * console.log(await GlideJson.clear(client, "doc", {path: "b.a[1:3]"}));
     * // Output: 2 - 2 elements (`6` and `7`) are cleared.
     * console.log(await GlideJson.clear(client, "doc", {path: "b.a[1:3]"}));
     * // Output: 0 - No elements cleared since specified slice has already been cleared.
     * console.log(await GlideJson.get(client, "doc", {path: "$..a"}));
     * // Output: '[1,[5,0,0],true,"value",3.5,{"foo":"foo"}]'
     *
     * console.log(await GlideJson.clear(client, "doc", {path: "$..a"}));
     * // Output: 6 - All numeric, boolean, and string values across paths are cleared.
     * console.log(await GlideJson.get(client, "doc", {path: "$..a"}));
     * // Output: '[0,[],false,"",0.0,{}]'
     * ```
     */
    static async clear(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.CLEAR", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand<ReturnTypeJson<number>>(client, args);
    }

    /**
     * Retrieve the JSON value at the specified `path` within the JSON document stored at `key`.
     * The returning result is in the Valkey or Redis OSS Serialization Protocol (RESP).
     * - JSON null is mapped to the RESP Null Bulk String.
     * - JSON Booleans are mapped to RESP Simple string.
     * - JSON integers are mapped to RESP Integers.
     * - JSON doubles are mapped to RESP Bulk Strings.
     * - JSON strings are mapped to RESP Bulk Strings.
     * - JSON arrays are represented as RESP arrays, where the first element is the simple string [, followed by the array's elements.
     * - JSON objects are represented as RESP object, where the first element is the simple string {, followed by key-value pairs, each of which is a RESP bulk string.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided.
     * - (Optional) `decoder`: see {@link DecoderOption}.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of replies for every possible path, indicating the RESP form of the JSON value.
     *         If `path` doesn't exist, returns an empty array.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a single reply for the JSON value at the specified `path`, in its RESP form.
     *         If multiple paths match, the value of the first JSON value match is returned. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, `null` is returned.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", ".", '{a: [1, 2, 3], b: {a: [1, 2], c: {a: 42}}}'));
     * // Output: 'OK' - Indicates successful setting of the value at path '.' in the key stored at `doc`.
     * const result = await GlideJson.resp(client, "doc", {path: "$..a"});
     * console.log(result);
     * // Output: [ ["[", 1, 2, 3], ["[", 1, 2], [42]];
     * console.log(await GlideJson.type(client, "doc", {path: "..a"})); // Output: ["[", 1, 2, 3]
     * ```
     */
    static async resp(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString } & DecoderOption,
    ): Promise<
        UniversalReturnTypeJson<
            (number | GlideString) | (number | GlideString | null) | null
        >
    > {
        const args = ["JSON.RESP", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args, options);
    }

    /**
     * Returns the length of the JSON string value stored at the specified `path` within
     * the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the length of
     *         the JSON string value, or `null` for JSON values matching the path that
     *         are not string.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns the length of the JSON value at `path` or `null` if `key` doesn't exist.
     *       - If multiple paths match, the length of the first matched string is returned.
     *       - If the JSON value at`path` is not a string or if `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, `null` is returned.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{a:"foo", nested: {a: "hello"}, nested2: {a: 31}}'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.strlen(client, "doc", {path: "$..a"}));
     * // Output: [3, 5, null] - The length of the string values at path '$..a' in the key stored at `doc`.
     *
     * console.log(await GlideJson.strlen(client, "doc", {path: "nested.a"}));
     * // Output: 5 - The length of the JSON value at path 'nested.a' in the key stored at `doc`.
     *
     * console.log(await GlideJson.strlen(client, "doc", {path: "$"}));
     * // Output: [null] - Returns an array with null since the value at root path does in the JSON document stored at `doc` is not a string.
     *
     * console.log(await GlideJson.strlen(client, "non_existent_key", {path: "."}));
     * // Output: null - return null if key does not exist.
     * ```
     */
    static async strlen(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.STRLEN", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args);
    }

    /**
     * Appends the specified `value` to the string stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the length of the resulting string after appending `value`,
     *         or None for JSON values matching the path that are not string.
     *       - If `key` doesn't exist, an error is raised.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns the length of the resulting string after appending `value` to the string at `path`.
     *       - If multiple paths match, the length of the last updated string is returned.
     *       - If the JSON value at `path` is not a string of if `path` doesn't exist, an error is raised.
     *       - If `key` doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{a:"foo", nested: {a: "hello"}, nested2: {a: 31}}'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.strappend(client, "doc", jsonpy.dumps("baz"), {path: "$..a"}))
     * // Output: [6, 8, null] - The new length of the string values at path '$..a' in the key stored at `doc` after the append operation.
     *
     * console.log(await GlideJson.strappend(client, "doc", '"foo"', {path: "nested.a"}));
     * // Output: 11 - The length of the string value after appending "foo" to the string at path 'nested.array' in the key stored at `doc`.
     *
     * const result = JSON.parse(await GlideJson.get(client, "doc", {path: "$"}));
     * console.log(result);
     * // Output: [{"a":"foobaz", "nested": {"a": "hellobazfoo"}, "nested2": {"a": 31}}] - The updated JSON value in the key stored at `doc`.
     * ```
     */
    static async strappend(
        client: BaseClient,
        key: GlideString,
        value: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.STRAPPEND", key];

        if (options) {
            args.push(options.path);
        }

        args.push(value);

        return _executeCommand<ReturnTypeJson<number>>(client, args);
    }

    /**
     * Appends one or more `values` to the JSON array at the specified `path` within the JSON
     * document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param values - The JSON values to be appended to the array.
     *     JSON string values must be wrapped with quotes. For example, to append `"foo"`, pass `"\"foo\""`.
     * @returns
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the new length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the new length of the array. If multiple paths are
     *       matched, returns the length of the first modified array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     *
     * @example
     * ```typescript
     * await GlideJson.set(client, "doc", "$", '{"a": 1, "b": ["one", "two"]}');
     * const result = await GlideJson.arrappend(client, "doc", "$.b", ["three"]);
     * console.log(result); // Output: [3] - the new length of the array at path '$.b' after appending the value.
     * const result = await GlideJson.arrappend(client, "doc", ".b", ["four"]);
     * console.log(result); // Output: 4 - the new length of the array at path '.b' after appending the value.
     * const doc = await json.get(client, "doc");
     * console.log(doc); // Output: '{"a": 1, "b": ["one", "two", "three", "four"]}'
     * ```
     */
    static async arrappend(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        values: GlideString[],
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.ARRAPPEND", key, path, ...values];
        return _executeCommand(client, args);
    }

    /**
     * Reports memory usage in bytes of a JSON object at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, returns total memory usage if no path is given.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of numbers for every possible path, indicating the memory usage.
     *         If `path` does not exist, an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns an integer representing the memory usage. If multiple paths are matched,
     *         returns the data of the first matching object. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, returns `null`.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '[1, 2.3, "foo", true, null, {}, [], {a:1, b:2}, [1, 2, 3]]'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.debugMemory(client, "doc", {path: ".."});
     * // Output: 258
     * ```
     */
    static async debugMemory(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.DEBUG", "MEMORY", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args);
    }

    /**
     * Reports the number of fields at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, returns total number of fields if no path is given.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of numbers for every possible path, indicating the number of fields.
     *         If `path` does not exist, an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns an integer representing the memory usage. If multiple paths are matched,
     *         returns the data of the first matching object. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, returns `null`.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '[1, 2.3, "foo", true, null, {}, [], {a:1, b:2}, [1, 2, 3]]'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.debugFields(client, "doc", {path: "$[*]"});
     * // Output: [1, 1, 1, 1, 1, 0, 0, 2, 3]
     * ```
     */
    static async debugFields(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.DEBUG", "FIELDS", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args);
    }

    /**
     * Increments or decrements the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param num - The number to increment or decrement by.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns a string representation of an array of strings, indicating the new values after incrementing for each matched `path`.
     *         If a value is not a number, its corresponding return value will be `null`.
     *         If `path` doesn't exist, a byte string representation of an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a string representation of the resulting value after the increment or decrement.
     *         If multiple paths match, the result of the last updated value is returned.
     *         If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
     *     - If `key` does not exist, an error is raised.
     *     - If the result is out of the range of 64-bit IEEE double, an error is raised.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"a": [], "b": [1], "c": [1, 2], "d": [1, 2, 3]}'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.numincrby(client, "doc", "$.d[*]", 10))
     * // Output: '[11,12,13]' - Increment each element in `d` array by 10.
     *
     * console.log(await GlideJson.numincrby(client, "doc", ".c[1]", 10));
     * // Output: '12' - Increment the second element in the `c` array by 10.
     * ```
     */
    static async numincrby(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        num: number,
    ): Promise<GlideString> {
        const args = ["JSON.NUMINCRBY", key, path, num.toString()];
        return _executeCommand(client, args);
    }

    /**
     * Multiplies the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param num - The number to multiply by.
     * @returns
     *     - For JSONPath (path starts with `$`):
     *       - Returns a GlideString representation of an array of strings, indicating the new values after multiplication for each matched `path`.
     *         If a value is not a number, its corresponding return value will be `null`.
     *         If `path` doesn't exist, a byte string representation of an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a GlideString representation of the resulting value after multiplication.
     *         If multiple paths match, the result of the last updated value is returned.
     *         If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
     *     - If `key` does not exist, an error is raised.
     *     - If the result is out of the range of 64-bit IEEE double, an error is raised.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"a": [], "b": [1], "c": [1, 2], "d": [1, 2, 3]}'));
     * // Output: 'OK' - Indicates successful setting of the value at path '$' in the key stored at `doc`.
     * console.log(await GlideJson.nummultby(client, "doc", "$.d[*]", 2))
     * // Output: '[2,4,6]' - Multiplies each element in the `d` array by 2.
     *
     * console.log(await GlideJson.nummultby(client, "doc", ".c[1]", 2));
     * // Output: '4' - Multiplies the second element in the `c` array by 2.
     * ```
     */
    static async nummultby(
        client: BaseClient,
        key: GlideString,
        path: GlideString,
        num: number,
    ): Promise<GlideString> {
        const args = ["JSON.NUMMULTBY", key, path, num.toString()];
        return _executeCommand(client, args);
    }

    /**
     * Retrieves the number of key-value pairs in the object stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided.
     * @returns ReturnTypeJson<number>:
     *    - For JSONPath (`path` starts with `$`):
     *      - Returns a list of integer replies for every possible path, indicating the length of the object,
     *        or `null` for JSON values matching the path that are not an object.
     *      - If `path` doesn't exist, an empty array will be returned.
     *    - For legacy path (`path` doesn't starts with `$`):
     *      - Returns the length of the object at `path`.
     *      - If multiple paths match, the length of the first object match is returned.
     *      - If the JSON value at `path` is not an object or if `path` doesn't exist, an error is raised.
     *    - If `key` doesn't exist, `null` is returned.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"a": 1.0, "b": {"a": {"x": 1, "y": 2}, "b": 2.5, "c": true}}'));
     * // Output: 'OK' - Indicates successful setting of the value at the root path '$' in the key `doc`.
     * console.log(await GlideJson.objlen(client, "doc", { path: "$" }));
     * // Output: [2] - Returns the number of key-value pairs at the root object, which has 2 keys: 'a' and 'b'.
     * console.log(await GlideJson.objlen(client, "doc", { path: "." }));
     * // Output: 2 - Returns the number of key-value pairs for the object matching the path '.', which has 2 keys: 'a' and 'b'.
     * ```
     */
    static async objlen(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString },
    ): Promise<ReturnTypeJson<number>> {
        const args = ["JSON.OBJLEN", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand<ReturnTypeJson<number>>(client, args);
    }

    /**
     * Retrieves key names in the object values at the specified `path` within the JSON document stored at `key`.
     *
     * @param client - The client to execute the command.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document where the key names will be retrieved. Defaults to root (`"."`) if not provided.
     * @returns ReturnTypeJson<GlideString[]>:
     *    - For JSONPath (`path` starts with `$`):
     *      - Returns a list of arrays containing key names for each matching object.
     *      - If a value matching the path is not an object, an empty array is returned.
     *      - If `path` doesn't exist, an empty array is returned.
     *    - For legacy path (`path` starts with `.`):
     *      - Returns a list of key names for the object value matching the path.
     *      - If multiple objects match the path, the key names of the first object is returned.
     *      - If a value matching the path is not an object, an error is raised.
     *      - If `path` doesn't exist, `null` is returned.
     *    - If `key` doesn't exist, `null` is returned.
     *
     * @example
     * ```typescript
     * console.log(await GlideJson.set(client, "doc", "$", '{"a": 1.0, "b": {"a": {"x": 1, "y": 2}, "b": 2.5, "c": true}}'));
     * // Output: 'OK' - Indicates successful setting of the value at the root path '$' in the key `doc`.
     * console.log(await GlideJson.objkeys(client, "doc", { path: "$" }));
     * // Output: [["a", "b"]] - Returns a list of arrays containing the key names for objects matching the path '$'.
     * console.log(await GlideJson.objkeys(client, "doc", { path: "." }));
     * // Output: ["a", "b"] - Returns key names for the object matching the path '.' as it is the only match.
     * ```
     */
    static async objkeys(
        client: BaseClient,
        key: GlideString,
        options?: { path: GlideString } & DecoderOption,
    ): Promise<ReturnTypeJson<GlideString[]>> {
        const args = ["JSON.OBJKEYS", key];

        if (options) {
            args.push(options.path);
        }

        return _executeCommand(client, args, options);
    }
}

/**
 * Transaction implementation for JSON module. Transactions allow the execution of a group of
 * commands in a single step. See {@link Transaction} and {@link ClusterTransaction}.
 *
 * @example
 * ```typescript
 * const transaction = new Transaction();
 * GlideMultiJson.set(transaction, "doc", ".", '{"a": 1.0, "b": 2}');
 * GlideMultiJson.get(transaction, "doc");
 * const result = await client.exec(transaction);
 *
 * console.log(result[0]); // Output: 'OK' - result of GlideMultiJson.set()
 * console.log(result[1]); // Output: '{"a": 1.0, "b": 2}' - result of GlideMultiJson.get()
 * ```
 */
export class GlideMultiJson {
    /**
     * Sets the JSON value at the specified `path` stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - Represents the path within the JSON document where the value will be set.
     *      The key will be modified only if `value` is added as the last child in the specified `path`, or if the specified `path` acts as the parent of a new child being added.
     * @param value - The value to set at the specific path, in JSON formatted bytes or str.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `conditionalChange` - Set the value only if the given condition is met (within the key or path).
     *      Equivalent to [`XX` | `NX`] in the module API.
     *
     * Command Response - If the value is successfully set, returns `"OK"`.
     *       If `value` isn't set because of `conditionalChange`, returns `null`.
     */
    static set(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        value: GlideString,
        options?: { conditionalChange: ConditionalChange },
    ): Transaction | ClusterTransaction {
        const args: GlideString[] = ["JSON.SET", key, path, value];

        if (options?.conditionalChange !== undefined) {
            args.push(options.conditionalChange);
        }

        return transaction.customCommand(args);
    }

    /**
     * Retrieves the JSON value at the specified `paths` stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) Options for formatting the byte representation of the JSON data. See {@link JsonGetOptions}.
     *
     * Command Response -
     *   - If one path is given:
     *     - For JSONPath (path starts with `$`):
     *       - Returns a stringified JSON list of bytes replies for every possible path,
     *         or a byte string representation of an empty array, if path doesn't exist.
     *         If `key` doesn't exist, returns `null`.
     *     - For legacy path (path doesn't start with `$`):
     *         Returns a byte string representation of the value in `path`.
     *         If `path` doesn't exist, an error is raised.
     *         If `key` doesn't exist, returns `null`.
     *  - If multiple paths are given:
     *         Returns a stringified JSON object in bytes, in which each path is a key, and it's corresponding value, is the value as if the path was executed in the command as a single path.
     * In case of multiple paths, and `paths` are a mix of both JSONPath and legacy path, the command behaves as if all are JSONPath paths.
     */
    static get(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: JsonGetOptions,
    ): Transaction | ClusterTransaction {
        const args = ["JSON.GET", key];

        if (options) {
            const optionArgs = _jsonGetOptionsToArgs(options);
            args.push(...optionArgs);
        }

        return transaction.customCommand(args);
    }

    /**
     * Retrieves the JSON values at the specified `path` stored at multiple `keys`.
     *
     * @remarks When in cluster mode, all keys in the transaction must be mapped to the same slot.
     *
     * @param client - The client to execute the command.
     * @param keys - The keys of the JSON documents.
     * @param path - The path within the JSON documents.
     *
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns a stringified JSON list replies for every possible path, or a string representation
     *       of an empty array, if path doesn't exist.
     * - For legacy path (path doesn't start with `$`):
     *       Returns a string representation of the value in `path`. If `path` doesn't exist,
     *       the corresponding array element will be `null`.
     * - If a `key` doesn't exist, the corresponding array element will be `null`.
     */
    static mget(
        transaction: Transaction | ClusterTransaction,
        keys: GlideString[],
        path: GlideString,
    ): Transaction | ClusterTransaction {
        const args = ["JSON.MGET", ...keys, path];
        return transaction.customCommand(args);
    }

    /**
     * Inserts one or more values into the array at the specified `path` within the JSON
     * document stored at `key`, before the given `index`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param index - The array index before which values are inserted.
     * @param values - The JSON values to be inserted into the array.
     *     JSON string values must be wrapped with quotes. For example, to insert `"foo"`, pass `"\"foo\""`.
     *
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the new length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the new length of the array. If multiple paths are
     *       matched, returns the length of the first modified array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     */
    static arrinsert(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        index: number,
        values: GlideString[],
    ): Transaction | ClusterTransaction {
        const args = ["JSON.ARRINSERT", key, path, index.toString(), ...values];

        return transaction.customCommand(args);
    }

    /**
     * Pops an element from the array located at `path` in the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) See {@link JsonArrPopOptions}.
     *
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a strings for every possible path, representing the popped JSON
     *       values, or `null` for JSON values matching the path that are not an array
     *       or an empty array.
     * - For legacy path (path doesn't start with `$`):
     *       Returns a string representing the popped JSON value, or `null` if the
     *       array at `path` is empty. If multiple paths are matched, the value from
     *       the first matching array that is not empty is returned. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     */
    static arrpop(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: JsonArrPopOptions,
    ): Transaction | ClusterTransaction {
        const args = ["JSON.ARRPOP", key];
        if (options?.path) args.push(options?.path);
        if (options && "index" in options && options.index)
            args.push(options?.index.toString());

        return transaction.customCommand(args);
    }

    /**
     * Retrieves the length of the array at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified.
     *
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the length of the array. If multiple paths are
     *       matched, returns the length of the first matching array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     */
    static arrlen(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.ARRLEN", key];
        if (options?.path) args.push(options?.path);

        return transaction.customCommand(args);
    }

    /**
     * Trims an array at the specified `path` within the JSON document stored at `key` so that it becomes a subarray [start, end], both inclusive.
     * If `start` < 0, it is treated as 0.
     * If `end` >= size (size of the array), it is treated as size-1.
     * If `start` >= size or `start` > `end`, the array is emptied and 0 is returned.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param start - The start index, inclusive.
     * @param end - The end index, inclusive.
     *
     * Command Response -
     *     - For JSONPath (`path` starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the new length of the array,
     *         or `null` for JSON values matching the path that are not an array.
     *       - If the array is empty, its corresponding return value is 0.
     *       - If `path` doesn't exist, an empty array will be returned.
     *       - If an index argument is out of bounds, an error is raised.
     *     - For legacy path (`path` doesn't start with `$`):
     *       - Returns an integer representing the new length of the array.
     *       - If the array is empty, its corresponding return value is 0.
     *       - If multiple paths match, the length of the first trimmed array match is returned.
     *       - If `path` doesn't exist, or the value at `path` is not an array, an error is raised.
     *       - If an index argument is out of bounds, an error is raised.
     */
    static arrtrim(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        start: number,
        end: number,
    ): Transaction | ClusterTransaction {
        const args: GlideString[] = [
            "JSON.ARRTRIM",
            key,
            path,
            start.toString(),
            end.toString(),
        ];
        return transaction.customCommand(args);
    }

    /**
     * Searches for the first occurrence of a `scalar` JSON value in the arrays at the `path`.
     * Out of range errors are treated by rounding the index to the array's `start` and `end.
     * If `start` > `end`, return `-1` (not found).
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param scalar - The scalar value to search for.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `start`: The start index, inclusive. Default to 0 if not provided.
     * - (Optional) `end`: The end index, exclusive. Default to 0 if not provided.
     *                     0 or -1 means the last element is included.
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the index of the matching element. The value is `-1` if not found.
     *       If a value is not an array, its corresponding return value is `null`.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the index of matching element, or `-1` if
     *       not found. If the value at the `path` is not an array, an error is raised.
     */
    static arrindex(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        scalar: GlideString | number | boolean | null,
        options?: { start: number; end?: number },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.ARRINDEX", key, path];

        if (typeof scalar === `number`) {
            args.push(scalar.toString());
        } else if (typeof scalar === `boolean`) {
            args.push(scalar ? `true` : `false`);
        } else if (scalar !== null) {
            args.push(scalar);
        } else {
            args.push(`null`);
        }

        if (options?.start !== undefined) args.push(options?.start.toString());
        if (options?.end !== undefined) args.push(options?.end.toString());

        return transaction.customCommand(args);
    }

    /**
     * Toggles a Boolean value stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified.
     *
     * Command Response - For JSONPath (`path` starts with `$`), returns a list of boolean replies for every possible path, with the toggled boolean value,
     * or `null` for JSON values matching the path that are not boolean.
     * - For legacy path (`path` doesn't starts with `$`), returns the value of the toggled boolean in `path`.
     * - Note that when sending legacy path syntax, If `path` doesn't exist or the value at `path` isn't a boolean, an error is raised.
     */
    static toggle(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.TOGGLE", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Deletes the JSON value at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: If `null`, deletes the entire JSON document at `key`.
     *
     * Command Response - The number of elements removed. If `key` or `path` doesn't exist, returns 0.
     */
    static del(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.DEL", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Deletes the JSON value at the specified `path` within the JSON document stored at `key`. This command is
     * an alias of {@link del}.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: If `null`, deletes the entire JSON document at `key`.
     *
     * Command Response - The number of elements removed. If `key` or `path` doesn't exist, returns 0.
     */
    static forget(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.FORGET", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Reports the type of values at the given path.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: Defaults to root (`"."`) if not provided.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of strings that represents the type of value at each path.
     *         The type is one of "null", "boolean", "string", "number", "integer", "object" and "array".
     *       - If a path does not exist, its corresponding return value is `null`.
     *       - Empty array if the document key does not exist.
     *     - For legacy path (path doesn't start with `$`):
     *       - String that represents the type of the value.
     *       - `null` if the document key does not exist.
     *       - `null` if the JSON path is invalid or does not exist.
     */
    static type(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.TYPE", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Clears arrays or objects at the specified JSON path in the document stored at `key`.
     * Numeric values are set to `0`, boolean values are set to `false`, and string values are converted to empty strings.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The JSON path to the arrays or objects to be cleared. Defaults to root if not provided.
     *
     * Command Response - The number of containers cleared, numeric values zeroed, and booleans toggled to `false`,
     * and string values converted to empty strings.
     * If `path` doesn't exist, or the value at `path` is already empty (e.g., an empty array, object, or string), `0` is returned.
     * If `key doesn't exist, an error is raised.
     */
    static clear(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.CLEAR", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Retrieve the JSON value at the specified `path` within the JSON document stored at `key`.
     * The returning result is in the Valkey or Redis OSS Serialization Protocol (RESP).
     * - JSON null is mapped to the RESP Null Bulk String.
     * - JSON Booleans are mapped to RESP Simple string.
     * - JSON integers are mapped to RESP Integers.
     * - JSON doubles are mapped to RESP Bulk Strings.
     * - JSON strings are mapped to RESP Bulk Strings.
     * - JSON arrays are represented as RESP arrays, where the first element is the simple string [, followed by the array's elements.
     * - JSON objects are represented as RESP object, where the first element is the simple string {, followed by key-value pairs, each of which is a RESP bulk string.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of replies for every possible path, indicating the RESP form of the JSON value.
     *         If `path` doesn't exist, returns an empty array.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a single reply for the JSON value at the specified `path`, in its RESP form.
     *         If multiple paths match, the value of the first JSON value match is returned. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, `null` is returned.
     */
    static resp(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.RESP", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Returns the length of the JSON string value stored at the specified `path` within
     * the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the length of
     *         the JSON string value, or <code>null</code> for JSON values matching the path that
     *         are not string.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns the length of the JSON value at `path` or `null` if `key` doesn't exist.
     *       - If multiple paths match, the length of the first matched string is returned.
     *       - If the JSON value at`path` is not a string or if `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, `null` is returned.
     */
    static strlen(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.STRLEN", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Appends the specified `value` to the string stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns a list of integer replies for every possible path, indicating the length of the resulting string after appending `value`,
     *         or None for JSON values matching the path that are not string.
     *       - If `key` doesn't exist, an error is raised.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns the length of the resulting string after appending `value` to the string at `path`.
     *       - If multiple paths match, the length of the last updated string is returned.
     *       - If the JSON value at `path` is not a string of if `path` doesn't exist, an error is raised.
     *       - If `key` doesn't exist, an error is raised.
     */
    static strappend(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        value: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.STRAPPEND", key];

        if (options) {
            args.push(options.path);
        }

        args.push(value);

        return transaction.customCommand(args);
    }

    /**
     * Appends one or more `values` to the JSON array at the specified `path` within the JSON
     * document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param values - The JSON values to be appended to the array.
     *     JSON string values must be wrapped with quotes. For example, to append `"foo"`, pass `"\"foo\""`.
     *
     * Command Response -
     * - For JSONPath (path starts with `$`):
     *       Returns an array with a list of integers for every possible path,
     *       indicating the new length of the array, or `null` for JSON values matching
     *       the path that are not an array. If `path` does not exist, an empty array
     *       will be returned.
     * - For legacy path (path doesn't start with `$`):
     *       Returns an integer representing the new length of the array. If multiple paths are
     *       matched, returns the length of the first modified array. If `path` doesn't
     *       exist or the value at `path` is not an array, an error is raised.
     * - If the index is out of bounds or `key` doesn't exist, an error is raised.
     */
    static arrappend(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        values: GlideString[],
    ): Transaction | ClusterTransaction {
        const args = ["JSON.ARRAPPEND", key, path, ...values];
        return transaction.customCommand(args);
    }

    /**
     * Reports memory usage in bytes of a JSON object at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, returns total memory usage if no path is given.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of numbers for every possible path, indicating the memory usage.
     *         If `path` does not exist, an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns an integer representing the memory usage. If multiple paths are matched,
     *         returns the data of the first matching object. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, returns `null`.
     */
    static debugMemory(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.DEBUG", "MEMORY", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Reports the number of fields at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param value - The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, returns total number of fields if no path is given.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns an array of numbers for every possible path, indicating the number of fields.
     *         If `path` does not exist, an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns an integer representing the memory usage. If multiple paths are matched,
     *         returns the data of the first matching object. If `path` doesn't exist, an error is raised.
     *     - If `key` doesn't exist, returns `null`.
     */
    static debugFields(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.DEBUG", "FIELDS", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Increments or decrements the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param num - The number to increment or decrement by.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns a string representation of an array of strings, indicating the new values after incrementing for each matched `path`.
     *         If a value is not a number, its corresponding return value will be `null`.
     *         If `path` doesn't exist, a byte string representation of an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a string representation of the resulting value after the increment or decrement.
     *         If multiple paths match, the result of the last updated value is returned.
     *         If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
     *     - If `key` does not exist, an error is raised.
     *     - If the result is out of the range of 64-bit IEEE double, an error is raised.
     */
    static numincrby(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        num: number,
    ): Transaction | ClusterTransaction {
        const args = ["JSON.NUMINCRBY", key, path, num.toString()];
        return transaction.customCommand(args);
    }

    /**
     * Multiplies the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param path - The path within the JSON document.
     * @param num - The number to multiply by.
     *
     * Command Response -
     *     - For JSONPath (path starts with `$`):
     *       - Returns a GlideString representation of an array of strings, indicating the new values after multiplication for each matched `path`.
     *         If a value is not a number, its corresponding return value will be `null`.
     *         If `path` doesn't exist, a byte string representation of an empty array will be returned.
     *     - For legacy path (path doesn't start with `$`):
     *       - Returns a GlideString representation of the resulting value after multiplication.
     *         If multiple paths match, the result of the last updated value is returned.
     *         If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
     *     - If `key` does not exist, an error is raised.
     *     - If the result is out of the range of 64-bit IEEE double, an error is raised.
     */
    static nummultby(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        path: GlideString,
        num: number,
    ): Transaction | ClusterTransaction {
        const args = ["JSON.NUMMULTBY", key, path, num.toString()];
        return transaction.customCommand(args);
    }

    /**
     * Retrieves the number of key-value pairs in the object stored at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided.
     *
     * Command Response - ReturnTypeJson<number>:
     *    - For JSONPath (`path` starts with `$`):
     *      - Returns a list of integer replies for every possible path, indicating the length of the object,
     *        or `null` for JSON values matching the path that are not an object.
     *      - If `path` doesn't exist, an empty array will be returned.
     *    - For legacy path (`path` doesn't starts with `$`):
     *      - Returns the length of the object at `path`.
     *      - If multiple paths match, the length of the first object match is returned.
     *      - If the JSON value at `path` is not an object or if `path` doesn't exist, an error is raised.
     *    - If `key` doesn't exist, `null` is returned.
     */
    static objlen(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.OBJLEN", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }

    /**
     * Retrieves key names in the object values at the specified `path` within the JSON document stored at `key`.
     *
     * @param transaction - A transaction to add commands to.
     * @param key - The key of the JSON document.
     * @param options - (Optional) Additional parameters:
     * - (Optional) `path`: The path within the JSON document where the key names will be retrieved. Defaults to root (`"."`) if not provided.
     *
     * Command Response - ReturnTypeJson<GlideString[]>:
     *    - For JSONPath (`path` starts with `$`):
     *      - Returns a list of arrays containing key names for each matching object.
     *      - If a value matching the path is not an object, an empty array is returned.
     *      - If `path` doesn't exist, an empty array is returned.
     *    - For legacy path (`path` starts with `.`):
     *      - Returns a list of key names for the object value matching the path.
     *      - If multiple objects match the path, the key names of the first object is returned.
     *      - If a value matching the path is not an object, an error is raised.
     *      - If `path` doesn't exist, `null` is returned.
     *    - If `key` doesn't exist, `null` is returned.
     */
    static objkeys(
        transaction: Transaction | ClusterTransaction,
        key: GlideString,
        options?: { path: GlideString },
    ): Transaction | ClusterTransaction {
        const args = ["JSON.OBJKEYS", key];

        if (options) {
            args.push(options.path);
        }

        return transaction.customCommand(args);
    }
}
