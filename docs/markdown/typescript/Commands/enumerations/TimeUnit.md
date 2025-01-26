[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / TimeUnit

# Enumeration: TimeUnit

Time unit representation which is used in optional arguments for [getex](../../BaseClient/classes/BaseClient.md#getex) and [set](../../BaseClient/classes/BaseClient.md#set) command.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="milliseconds"></a> `Milliseconds` | `"PX"` | Set the specified expire time, in milliseconds. Equivalent to `PX` in the VALKEY API. |
| <a id="seconds"></a> `Seconds` | `"EX"` | Set the specified expire time, in seconds. Equivalent to `EX` in the VALKEY API. |
| <a id="unixmilliseconds"></a> `UnixMilliseconds` | `"PXAT"` | Set the specified Unix time at which the key will expire, in milliseconds. Equivalent to `PXAT` in the VALKEY API. |
| <a id="unixseconds"></a> `UnixSeconds` | `"EXAT"` | Set the specified Unix time at which the key will expire, in seconds. Equivalent to `EXAT` in the VALKEY API. |
