[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Errors](../README.md) / ConnectionError

# Class: ConnectionError

Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

## Extends

- [`RequestError`](RequestError.md)

## Constructors

### new ConnectionError()

> **new ConnectionError**(`message`?): [`ConnectionError`](ConnectionError.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message`? | `string` |

#### Returns

[`ConnectionError`](ConnectionError.md)

#### Inherited from

[`RequestError`](RequestError.md).[`constructor`](RequestError.md#constructors)

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="cause"></a> `cause?` | `public` | `unknown` | - | [`RequestError`](RequestError.md).[`cause`](RequestError.md#cause) |
| <a id="message-1"></a> `message` | `public` | `string` | - | [`RequestError`](RequestError.md).[`message`](RequestError.md#message-1) |
| <a id="stack"></a> `stack?` | `public` | `string` | - | [`RequestError`](RequestError.md).[`stack`](RequestError.md#stack) |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | [`RequestError`](RequestError.md).[`prepareStackTrace`](RequestError.md#preparestacktrace) |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | - | [`RequestError`](RequestError.md).[`stackTraceLimit`](RequestError.md#stacktracelimit) |

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Inherited from

[`RequestError`](RequestError.md).[`name`](RequestError.md#name)

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

[`RequestError`](RequestError.md).[`captureStackTrace`](RequestError.md#capturestacktrace)
