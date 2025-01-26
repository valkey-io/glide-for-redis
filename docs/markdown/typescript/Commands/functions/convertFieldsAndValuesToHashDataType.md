[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / convertFieldsAndValuesToHashDataType

# Function: convertFieldsAndValuesToHashDataType()

> **convertFieldsAndValuesToHashDataType**(`fieldsAndValues`): [`HashDataType`](../../BaseClient/type-aliases/HashDataType.md)

This function converts an input from [HashDataType](../../BaseClient/type-aliases/HashDataType.md) or `Record` types to `HashDataType`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `fieldsAndValues` | `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> \| [`HashDataType`](../../BaseClient/type-aliases/HashDataType.md) | field names and their values. |

## Returns

[`HashDataType`](../../BaseClient/type-aliases/HashDataType.md)

HashDataType array containing field names and their values.
