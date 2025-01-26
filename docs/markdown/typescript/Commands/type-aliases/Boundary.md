[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / Boundary

# Type Alias: Boundary\<T\>

> **Boundary**\<`T`\>: [`InfBoundary`](../enumerations/InfBoundary.md) \| \{ `isInclusive`: `boolean`; `value`: `T`; \}

Defines the boundaries of a range.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Type declaration

[`InfBoundary`](../enumerations/InfBoundary.md)

\{ `isInclusive`: `boolean`; `value`: `T`; \}

| Name | Type | Description |
| ------ | ------ | ------ |
| `isInclusive`? | `boolean` | Whether the value is inclusive. Defaults to `true`. |
| `value` | `T` | The comparison value. |
