[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / convertGlideRecordToRecord

# Function: convertGlideRecordToRecord()

> **convertGlideRecordToRecord**\<`T`\>(`data`): `Record`\<`string`, `T`\>

**`Internal`**

Recursively downcast `GlideRecord` to `Record`. Use if `data` keys are always strings.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | [`GlideRecord`](../type-aliases/GlideRecord.md)\<`T`\> |

## Returns

`Record`\<`string`, `T`\>
