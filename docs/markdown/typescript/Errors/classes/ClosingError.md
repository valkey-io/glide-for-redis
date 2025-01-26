[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Errors](../README.md) / ClosingError

# Class: ClosingError

Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

## Extends

- [`ValkeyError`](ValkeyError.md)

## Constructors

### new ClosingError()

> **new ClosingError**(`message`?): [`ClosingError`](ClosingError.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message`? | `string` |

#### Returns

[`ClosingError`](ClosingError.md)

#### Inherited from

[`ValkeyError`](ValkeyError.md).[`constructor`](ValkeyError.md#constructors)

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="cause"></a> `cause?` | `public` | `unknown` | - | [`ValkeyError`](ValkeyError.md).[`cause`](ValkeyError.md#cause) |
| <a id="message-1"></a> `message` | `public` | `string` | - | [`ValkeyError`](ValkeyError.md).[`message`](ValkeyError.md#message-1) |
| <a id="stack"></a> `stack?` | `public` | `string` | - | [`ValkeyError`](ValkeyError.md).[`stack`](ValkeyError.md#stack) |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | [`ValkeyError`](ValkeyError.md).[`prepareStackTrace`](ValkeyError.md#preparestacktrace) |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | - | [`ValkeyError`](ValkeyError.md).[`stackTraceLimit`](ValkeyError.md#stacktracelimit) |

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Inherited from

[`ValkeyError`](ValkeyError.md).[`name`](ValkeyError.md#name)

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

[`ValkeyError`](ValkeyError.md).[`captureStackTrace`](ValkeyError.md#capturestacktrace)
