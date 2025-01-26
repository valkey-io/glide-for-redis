[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / SortOptions

# Interface: SortOptions

Optional arguments to [sort](../../BaseClient/classes/BaseClient.md#sort), [sortStore](../../BaseClient/classes/BaseClient.md#sortstore) and [sortReadOnly](../../BaseClient/classes/BaseClient.md#sortreadonly) commands.

See https://valkey.io/commands/sort/ for more details.

## Remarks

When in cluster mode, [byPattern](SortOptions.md#bypattern) and [getPattern](SortOptions.md#getpatterns) must map to the same hash
    slot as the key, and this is supported only since Valkey version 8.0.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="bypattern"></a> `byPattern?` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | A pattern to sort by external keys instead of by the elements stored at the key themselves. The pattern should contain an asterisk (*) as a placeholder for the element values, where the value from the key replaces the asterisk to create the key name. For example, if `key` contains IDs of objects, `byPattern` can be used to sort these IDs based on an attribute of the objects, like their weights or timestamps. Supported in cluster mode since Valkey version 8.0 and above. |
| <a id="getpatterns"></a> `getPatterns?` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A pattern used to retrieve external keys' values, instead of the elements at `key`. The pattern should contain an asterisk (`*`) as a placeholder for the element values, where the value from `key` replaces the asterisk to create the `key` name. This allows the sorted elements to be transformed based on the related keys values. For example, if `key` contains IDs of users, `getPatterns` can be used to retrieve specific attributes of these users, such as their names or email addresses. E.g., if `getPatterns` is `name_*`, the command will return the values of the keys `name_<element>` for each sorted element. Multiple `getPatterns` arguments can be provided to retrieve multiple attributes. The special value `#` can be used to include the actual element from `key` being sorted. If not provided, only the sorted elements themselves are returned. Supported in cluster mode since Valkey version 8.0 and above. |
| <a id="isalpha"></a> `isAlpha?` | `boolean` | When `true`, sorts elements lexicographically. When `false` (default), sorts elements numerically. Use this when the list, set, or sorted set contains string values that cannot be converted into double precision floating point numbers. |
| <a id="limit"></a> `limit?` | [`Limit`](Limit.md) | Limiting the range of the query by setting offset and result count. See [Limit](Limit.md) class for more information. |
| <a id="orderby"></a> `orderBy?` | [`SortOrder`](../enumerations/SortOrder.md) | Options for sorting order of elements. |
