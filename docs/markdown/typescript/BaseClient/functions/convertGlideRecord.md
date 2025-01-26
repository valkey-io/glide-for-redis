[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / convertGlideRecord

# Function: convertGlideRecord()

> **convertGlideRecord**(`keysAndValues`): [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`GlideString`](../type-aliases/GlideString.md)\>

**`Internal`**

This function converts an input from GlideRecord or Record types to GlideRecord.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keysAndValues` | `Record`\<`string`, [`GlideString`](../type-aliases/GlideString.md)\> \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | key names and their values. |

## Returns

[`GlideRecord`](../type-aliases/GlideRecord.md)\<[`GlideString`](../type-aliases/GlideString.md)\>

GlideRecord array containing keys and their values.
