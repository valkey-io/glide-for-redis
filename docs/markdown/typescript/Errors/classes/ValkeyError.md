[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Errors](../README.md) / ValkeyError

# Class: `abstract` ValkeyError

Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

## Extends

- `Error`

## Extended by

- [`ClosingError`](ClosingError.md)
- [`RequestError`](RequestError.md)

## Constructors

### new ValkeyError()

> **new ValkeyError**(`message`?): [`ValkeyError`](ValkeyError.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message`? | `string` |

#### Returns

[`ValkeyError`](ValkeyError.md)

#### Overrides

`Error.constructor`

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="cause"></a> `cause?` | `public` | `unknown` | - | - | `Error.cause` |
| <a id="message-1"></a> `message` | `public` | `string` | - | `Error.message` | - |
| <a id="stack"></a> `stack?` | `public` | `string` | - | - | `Error.stack` |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | - | `Error.prepareStackTrace` |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | - | - | `Error.stackTraceLimit` |

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Overrides

`Error.name`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt`?): `void`

Create .stack property on a target object

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt`? | `Function` |

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`
