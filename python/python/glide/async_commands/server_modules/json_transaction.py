# Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
"""Glide module for `JSON` commands in transaction.

    Examples:
        >>> import json
        >>> from glide import json_transaction
        >>> transaction = ClusterTransaction()
        >>> value = {'a': 1.0, 'b': 2}
        >>> json_str = json.dumps(value) # Convert Python dictionary to JSON string using json.dumps()
        >>> json_transaction.set(transaction, "doc", "$", json_str)
        >>> json_transaction.get(transaction, "doc", "$") # Returns the value at path '$' in the JSON document stored at `doc` as JSON string.
        >>> result = await glide_client.exec(transaction)
        >>> print result[0] # set result
            'OK'  # Indicates successful setting of the value at path '$' in the key stored at `doc`.
        >>> print result[1] # get result
            b"[{\"a\":1.0,\"b\":2}]"
        >>> print json.loads(str(result[1]))
            [{"a": 1.0, "b": 2}] # JSON object retrieved from the key `doc` using json.loads()
        """

from typing import List, Optional, Union, cast

from glide.async_commands.core import ConditionalChange
from glide.async_commands.server_modules.glide_json import (
    JsonArrIndexOptions,
    JsonArrPopOptions,
    JsonGetOptions,
)
from glide.async_commands.transaction import TTransaction
from glide.constants import TEncodable
from glide.protobuf.command_request_pb2 import RequestType


def set(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    value: TEncodable,
    set_condition: Optional[ConditionalChange] = None,
) -> TTransaction:
    """
    Sets the JSON value at the specified `path` stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): Represents the path within the JSON document where the value will be set.
            The key will be modified only if `value` is added as the last child in the specified `path`, or if the specified `path` acts as the parent of a new child being added.
        value (TEncodable): The value to set at the specific path, in JSON formatted bytes or str.
        set_condition (Optional[ConditionalChange]): Set the value only if the given condition is met (within the key or path).
            Equivalent to [`XX` | `NX`] in the RESP API. Defaults to None.

    Command response:
        Optional[TOK]: If the value is successfully set, returns OK.
            If `value` isn't set because of `set_condition`, returns None.
    """
    args = ["JSON.SET", key, path, value]
    if set_condition:
        args.append(set_condition.value)

    return transaction.custom_command(args)


def get(
    transaction: TTransaction,
    key: TEncodable,
    paths: Optional[Union[TEncodable, List[TEncodable]]] = None,
    options: Optional[JsonGetOptions] = None,
) -> TTransaction:
    """
    Retrieves the JSON value at the specified `paths` stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        paths (Optional[Union[TEncodable, List[TEncodable]]]): The path or list of paths within the JSON document. Default to None.
        options (Optional[JsonGetOptions]): Options for formatting the byte representation of the JSON data. See `JsonGetOptions`.

    Command response:
        TJsonResponse[Optional[bytes]]:
            If one path is given:
                For JSONPath (path starts with `$`):
                    Returns a stringified JSON list of bytes replies for every possible path,
                    or a byte string representation of an empty array, if path doesn't exists.
                    If `key` doesn't exist, returns None.
                For legacy path (path doesn't start with `$`):
                    Returns a byte string representation of the value in `path`.
                    If `path` doesn't exist, an error is raised.
                    If `key` doesn't exist, returns None.
            If multiple paths are given:
                Returns a stringified JSON object in bytes, in which each path is a key, and it's corresponding value, is the value as if the path was executed in the command as a single path.
        In case of multiple paths, and `paths` are a mix of both JSONPath and legacy path, the command behaves as if all are JSONPath paths.
        For more information about the returned type, see `TJsonResponse`.
    """
    args = ["JSON.GET", key]
    if options:
        args.extend(options.get_options())
    if paths:
        if isinstance(paths, (str, bytes)):
            paths = [paths]
        args.extend(paths)

    return transaction.custom_command(args)


def mget(
    transaction: TTransaction,
    keys: List[TEncodable],
    path: TEncodable,
) -> TTransaction:
    """
    Retrieves the JSON values at the specified `path` stored at multiple `keys`.

    Note:
        When in cluster mode, all keys in the transaction must be mapped to the same slot.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        keys (List[TEncodable]): A list of keys for the JSON documents.
        path (TEncodable): The path within the JSON documents.

    Command response:
        List[Optional[bytes]]:
            For JSONPath (`path` starts with `$`):
                Returns a list of byte representations of the values found at the given path for each key.
                If `path` does not exist within the key, the entry will be an empty array.
            For legacy path (`path` doesn't starts with `$`):
                Returns a list of byte representations of the values found at the given path for each key.
                If `path` does not exist within the key, the entry will be None.
            If a key doesn't exist, the corresponding list element will be None.
    """
    args = ["JSON.MGET"] + keys + [path]
    return transaction.custom_command(args)


def arrappend(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    values: List[TEncodable],
) -> TTransaction:
    """
    Appends one or more `values` to the JSON array at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): Represents the path within the JSON document where the `values` will be appended.
        values (TEncodable): The values to append to the JSON array at the specified path.
            JSON string values must be wrapped with quotes. For example, to append `"foo"`, pass `"\"foo\""`.

    Command response:
        TJsonResponse[int]:
            For JSONPath (`path` starts with `$`):
                Returns a list of integer replies for every possible path, indicating the new length of the array after appending `values`,
                or None for JSON values matching the path that are not an array.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns the length of the array after appending `values` to the array at `path`.
                If multiple paths match, the length of the first updated array is returned.
                If the JSON value at `path` is not a array or if `path` doesn't exist, an error is raised.
            If `key` doesn't exist, an error is raised.
        For more information about the returned type, see `TJsonResponse`.
    """
    args = ["JSON.ARRAPPEND", key, path] + values
    return transaction.custom_command(args)


def arrindex(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    value: TEncodable,
    options: Optional[JsonArrIndexOptions] = None,
) -> TTransaction:
    """
    Searches for the first occurrence of a scalar JSON value (i.e., a value that is neither an object nor an array) within arrays at the specified `path` in the JSON document stored at `key`.

    If specified, `options.start` and `options.end` define an inclusive-to-exclusive search range within the array.
    (Where `options.start` is inclusive and `options.end` is exclusive).

    Out-of-range indices adjust to the nearest valid position, and negative values count from the end (e.g., `-1` is the last element, `-2` the second last).

    Setting `options.end` to `0` behaves like `-1`, extending the range to the array's end (inclusive).

    If `options.start` exceeds `options.end`, `-1` is returned, indicating that the value was not found.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document.
        value (TEncodable): The value to search for within the arrays.
        options (Optional[JsonArrIndexOptions]): Options specifying an inclusive `start` index and an optional exclusive `end` index for a range-limited search.
            Defaults to the full array if not provided. See `JsonArrIndexOptions`.

    Command response:
        Optional[Union[int, List[int]]]:
            For JSONPath (`path` starts with `$`):
                Returns an array of integers for every possible path, indicating of the first occurrence of `value` within the array,
                or None for JSON values matching the path that are not an array.
                A returned value of `-1` indicates that the value was not found in that particular array.
                If `path` does not exist, an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns an integer representing the index of the first occurrence of `value` within the array at the specified path.
                A returned value of `-1` indicates that the value was not found in that particular array.
                If multiple paths match, the index of the value from the first matching array is returned.
                If the JSON value at the `path` is not an array or if `path` does not exist, an error is raised.
            If `key` does not exist, an error is raised.
    """
    args = ["JSON.ARRINDEX", key, path, value]

    if options:
        args.extend(options.to_args())

    return transaction.custom_command(args)


def arrinsert(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    index: int,
    values: List[TEncodable],
) -> TTransaction:
    """
    Inserts one or more values into the array at the specified `path` within the JSON document stored at `key`, before the given `index`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document.
        index (int): The array index before which values are inserted.
        values (List[TEncodable]): The JSON values to be inserted into the array, in JSON formatted bytes or str.
            Json string values must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.

    Command response:
        TJsonResponse[int]:
            For JSONPath (`path` starts with '$'):
                Returns a list of integer replies for every possible path, indicating the new length of the array,
                or None for JSON values matching the path that are not an array.
                If `path` does not exist, an empty array will be returned.
            For legacy path (`path` doesn't start with '$'):
                Returns an integer representing the new length of the array.
                If multiple paths are matched, returns the length of the first modified array.
                If `path` doesn't exist or the value at `path` is not an array, an error is raised.
            If the index is out of bounds, an error is raised.
            If `key` doesn't exist, an error is raised.
    """
    args = ["JSON.ARRINSERT", key, path, str(index)] + values
    return transaction.custom_command(args)


def arrlen(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Retrieves the length of the array at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Defaults to None.

    Command response:
        Optional[TJsonResponse[int]]:
            For JSONPath (`path` starts with `$`):
                Returns a list of integer replies for every possible path, indicating the length of the array,
                or None for JSON values matching the path that are not an array.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't starts with `$`):
                Returns the length of the array at `path`.
                If multiple paths match, the length of the first array match is returned.
                If the JSON value at `path` is not a array or if `path` doesn't exist, an error is raised.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.ARRLEN", key]
    if path:
        args.append(path)
    return transaction.custom_command(args)


def arrpop(
    transaction: TTransaction,
    key: TEncodable,
    options: Optional[JsonArrPopOptions] = None,
) -> TTransaction:
    """
    Pops an element from the array located at the specified path within the JSON document stored at `key`.
    If `options.index` is provided, it pops the element at that index instead of the last element.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        options (Optional[JsonArrPopOptions]): Options including the path and optional index. See `JsonArrPopOptions`. Default to None.
            If not specified, attempts to pop the last element from the root value if it's an array.
            If the root value is not an array, an error will be raised.

    Command response:
        Optional[TJsonResponse[bytes]]:
            For JSONPath (`options.path` starts with `$`):
                Returns a list of bytes string replies for every possible path, representing the popped JSON values,
                or None for JSON values matching the path that are not an array or are an empty array.
                If `options.path` doesn't exist, an empty list will be returned.
            For legacy path (`options.path` doesn't starts with `$`):
                Returns a bytes string representing the popped JSON value, or None if the array at `options.path` is empty.
                If multiple paths match, the value from the first matching array that is not empty is returned.
                If the JSON value at `options.path` is not a array or if `options.path` doesn't exist, an error is raised.
            If `key` doesn't exist, an error is raised.
    """
    args = ["JSON.ARRPOP", key]
    if options:
        args.extend(options.to_args())

    return transaction.custom_command(args)


def arrtrim(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    start: int,
    end: int,
) -> TTransaction:
    """
    Trims an array at the specified `path` within the JSON document stored at `key` so that it becomes a subarray [start, end], both inclusive.
    If `start` < 0, it is treated as 0.
    If `end` >= size (size of the array), it is treated as size-1.
    If `start` >= size or `start` > `end`, the array is emptied and 0 is returned.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document.
        start (int): The start index, inclusive.
        end (int): The end index, inclusive.

    Command response:
        TJsonResponse[int]:
            For JSONPath (`path` starts with '$'):
                Returns a list of integer replies for every possible path, indicating the new length of the array, or None for JSON values matching the path that are not an array.
                If a value is an empty array, its corresponding return value is 0.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't starts with `$`):
                Returns an integer representing the new length of the array.
                If the array is empty, returns 0.
                If multiple paths match, the length of the first trimmed array match is returned.
                If `path` doesn't exist, or the value at `path` is not an array, an error is raised.
            If `key` doesn't exist, an error is raised.
    """

    return transaction.custom_command(["JSON.ARRTRIM", key, path, str(start), str(end)])


def clear(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[str] = None,
) -> TTransaction:
    """
    Clears arrays or objects at the specified JSON path in the document stored at `key`.
    Numeric values are set to `0`, and boolean values are set to `False`, and string values are converted to empty strings.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[str]): The path within the JSON document. Default to None.

    Command response:
        int: The number of containers cleared, numeric values zeroed, and booleans toggled to `false`,
        and string values converted to empty strings.
        If `path` doesn't exist, or the value at `path` is already empty (e.g., an empty array, object, or string), 0 is returned.
        If `key doesn't exist, an error is raised.
    """
    args = ["JSON.CLEAR", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def debug_fields(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Returns the number of fields of the JSON value at the specified `path` within the JSON document stored at `key`.
    - **Primitive Values**: Each non-container JSON value (e.g., strings, numbers, booleans, and null) counts as one field.
    - **Arrays and Objects:**: Each item in an array and each key-value pair in an object is counted as one field. (Each top-level value counts as one field, regardless of it's type.)
        - Their nested values are counted recursively and added to the total.
        - **Example**: For the JSON `{"a": 1, "b": [2, 3, {"c": 4}]}`, the count would be:
            - Top-level: 2 fields (`"a"` and `"b"`)
            - Nested: 3 fields in the array (`2`, `3`, and `{"c": 4}`) plus 1 for the object (`"c"`)
            - Total: 2 (top-level) + 3 (from array) + 1 (from nested object) = 6 fields.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Defaults to root if not provided.

    Command response:
        Optional[TJsonUniversalResponse[int]]:
            For JSONPath (`path` starts with `$`):
                Returns an array of integers, each indicating the number of fields for each matched `path`.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns an integer indicating the number of fields for each matched `path`.
                If multiple paths match, number of fields of the first JSON value match is returned.
                If `path` doesn't exist, an error is raised.
            If `path` is not provided, it reports the total number of fields in the entire JSON document.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.DEBUG", "FIELDS", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def debug_memory(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Reports memory usage in bytes of a JSON value at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Defaults to None.

    Command response:
        Optional[TJsonUniversalResponse[int]]:
            For JSONPath (`path` starts with `$`):
                Returns an array of integers, indicating the memory usage in bytes of a JSON value for each matched `path`.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns an integer, indicating the memory usage in bytes for the JSON value in `path`.
                If multiple paths match, the memory usage of the first JSON value match is returned.
                If `path` doesn't exist, an error is raised.
            If `path` is not provided, it reports the total memory usage in bytes in the entire JSON document.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.DEBUG", "MEMORY", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def delete(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Deletes the JSON value at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document.
            If None, deletes the entire JSON document at `key`. Defaults to None.

    Command response:
        int: The number of elements removed.
        If `key` or `path` doesn't exist, returns 0.
    """

    return transaction.custom_command(["JSON.DEL", key] + ([path] if path else []))


def forget(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Deletes the JSON value at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document.
            If None, deletes the entire JSON document at `key`. Defaults to None.

    Command response:
        int: The number of elements removed.
        If `key` or `path` doesn't exist, returns 0.
    """

    return transaction.custom_command(["JSON.FORGET", key] + ([path] if path else []))


def numincrby(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    number: Union[int, float],
) -> TTransaction:
    """
    Increments or decrements the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document.
        number (Union[int, float]): The number to increment or decrement by.

    Command response:
        bytes:
            For JSONPath (`path` starts with `$`):
                Returns a bytes string representation of an array of bulk strings, indicating the new values after incrementing for each matched `path`.
                If a value is not a number, its corresponding return value will be `null`.
                If `path` doesn't exist, a byte string representation of an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns a bytes string representation of the resulting value after the increment or decrement.
                If multiple paths match, the result of the last updated value is returned.
                If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
            If `key` does not exist, an error is raised.
            If the result is out of the range of 64-bit IEEE double, an error is raised.
    """
    args = ["JSON.NUMINCRBY", key, path, str(number)]

    return transaction.custom_command(args)


def nummultby(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
    number: Union[int, float],
) -> TTransaction:
    """
    Multiplies the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document.
        number (Union[int, float]): The number to multiply by.

    Command response:
        bytes:
            For JSONPath (`path` starts with `$`):
                Returns a bytes string representation of an array of bulk strings, indicating the new values after multiplication for each matched `path`.
                If a value is not a number, its corresponding return value will be `null`.
                If `path` doesn't exist, a byte string representation of an empty array will be returned.
            For legacy path (`path` doesn't start with `$`):
                Returns a bytes string representation of the resulting value after multiplication.
                If multiple paths match, the result of the last updated value is returned.
                If the value at the `path` is not a number or `path` doesn't exist, an error is raised.
            If `key` does not exist, an error is raised.
            If the result is out of the range of 64-bit IEEE double, an error is raised.
    """
    args = ["JSON.NUMMULTBY", key, path, str(number)]

    return transaction.custom_command(args)


def objlen(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Retrieves the number of key-value pairs in the object stored at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Defaults to None.

    Command response:
        Optional[TJsonResponse[int]]:
            For JSONPath (`path` starts with `$`):
                Returns a list of integer replies for every possible path, indicating the length of the object,
                or None for JSON values matching the path that are not an object.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't starts with `$`):
                Returns the length of the object at `path`.
                If multiple paths match, the length of the first object match is returned.
                If the JSON value at `path` is not an object or if `path` doesn't exist, an error is raised.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.OBJLEN", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def objkeys(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Retrieves key names in the object values at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): Represents the path within the JSON document where the key names will be retrieved.
            Defaults to None.

    Command response:
        Optional[TJsonUniversalResponse[List[bytes]]]:
            For JSONPath (`path` starts with `$`):
                Returns a list of arrays containing key names for each matching object.
                If a value matching the path is not an object, an empty array is returned.
                If `path` doesn't exist, an empty array is returned.
            For legacy path (`path` starts with `.`):
                Returns a list of key names for the object value matching the path.
                If multiple objects match the path, the key names of the first object are returned.
                If a value matching the path is not an object, an error is raised.
                If `path` doesn't exist, None is returned.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.OBJKEYS", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def resp(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Retrieve the JSON value at the specified `path` within the JSON document stored at `key`.
    The returning result is in the Valkey or Redis OSS Serialization Protocol (RESP).\n
    JSON null is mapped to the RESP Null Bulk String.\n
    JSON Booleans are mapped to RESP Simple string.\n
    JSON integers are mapped to RESP Integers.\n
    JSON doubles are mapped to RESP Bulk Strings.\n
    JSON strings are mapped to RESP Bulk Strings.\n
    JSON arrays are represented as RESP arrays, where the first element is the simple string [, followed by the array's elements.\n
    JSON objects are represented as RESP object, where the first element is the simple string {, followed by key-value pairs, each of which is a RESP bulk string.\n

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Default to None.

    Command response:
        TJsonUniversalResponse[Optional[Union[bytes, int, List[Optional[Union[bytes, int]]]]]]
            For JSONPath ('path' starts with '$'):
                Returns a list of replies for every possible path, indicating the RESP form of the JSON value.
                If `path` doesn't exist, returns an empty list.
            For legacy path (`path` doesn't starts with `$`):
                Returns a single reply for the JSON value at the specified path, in its RESP form.
                This can be a bytes object, an integer, None, or a list representing complex structures.
                If multiple paths match, the value of the first JSON value match is returned.
                If `path` doesn't exist, an error is raised.
            If `key` doesn't exist, an None is returned.
    """
    args = ["JSON.RESP", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)


def strappend(
    transaction: TTransaction,
    key: TEncodable,
    value: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Appends the specified `value` to the string stored at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        value (TEncodable): The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'.
        path (Optional[TEncodable]): The path within the JSON document. Default to None.

    Command response:
        TJsonResponse[int]:
            For JSONPath (`path` starts with `$`):
                Returns a list of integer replies for every possible path, indicating the length of the resulting string after appending `value`,
                or None for JSON values matching the path that are not string.
                If `key` doesn't exist, an error is raised.
            For legacy path (`path` doesn't start with `$`):
                Returns the length of the resulting string after appending `value` to the string at `path`.
                If multiple paths match, the length of the last updated string is returned.
                If the JSON value at `path` is not a string of if `path` doesn't exist, an error is raised.
                If `key` doesn't exist, an error is raised.
        For more information about the returned type, see `TJsonResponse`.
    """
    return transaction.custom_command(
        ["JSON.STRAPPEND", key] + ([path, value] if path else [value])
    )


def strlen(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Returns the length of the JSON string value stored at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Default to None.

    Command response:
        TJsonResponse[Optional[int]]:
            For JSONPath (`path` starts with `$`):
                Returns a list of integer replies for every possible path, indicating the length of the JSON string value,
                or None for JSON values matching the path that are not string.
            For legacy path (`path` doesn't start with `$`):
                Returns the length of the JSON value at `path` or None if `key` doesn't exist.
                If multiple paths match, the length of the first mached string is returned.
                If the JSON value at `path` is not a string of if `path` doesn't exist, an error is raised.
            If `key` doesn't exist, None is returned.
        For more information about the returned type, see `TJsonResponse`.
    """
    return transaction.custom_command(
        ["JSON.STRLEN", key, path] if path else ["JSON.STRLEN", key]
    )


def toggle(
    transaction: TTransaction,
    key: TEncodable,
    path: TEncodable,
) -> TTransaction:
    """
    Toggles a Boolean value stored at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (TEncodable): The path within the JSON document. Default to None.

    Command response:
        TJsonResponse[bool]:
            For JSONPath (`path` starts with `$`):
                Returns a list of boolean replies for every possible path, with the toggled boolean value,
                or None for JSON values matching the path that are not boolean.
                If `key` doesn't exist, an error is raised.
            For legacy path (`path` doesn't start with `$`):
                Returns the value of the toggled boolean in `path`.
                If the JSON value at `path` is not a boolean of if `path` doesn't exist, an error is raised.
                If `key` doesn't exist, an error is raised.
        For more information about the returned type, see `TJsonResponse`.
    """
    return transaction.custom_command(["JSON.TOGGLE", key, path])


def type(
    transaction: TTransaction,
    key: TEncodable,
    path: Optional[TEncodable] = None,
) -> TTransaction:
    """
    Retrieves the type of the JSON value at the specified `path` within the JSON document stored at `key`.

    Args:
        transaction (TTransaction): The transaction to execute the command.
        key (TEncodable): The key of the JSON document.
        path (Optional[TEncodable]): The path within the JSON document. Default to None.

    Command response:
        Optional[TJsonUniversalResponse[bytes]]:
            For JSONPath ('path' starts with '$'):
                Returns a list of byte string replies for every possible path, indicating the type of the JSON value.
                If `path` doesn't exist, an empty array will be returned.
            For legacy path (`path` doesn't starts with `$`):
                Returns the type of the JSON value at `path`.
                If multiple paths match, the type of the first JSON value match is returned.
                If `path` doesn't exist, None will be returned.
            If `key` doesn't exist, None is returned.
    """
    args = ["JSON.TYPE", key]
    if path:
        args.append(path)

    return transaction.custom_command(args)
