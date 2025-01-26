[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / GeoSearchStoreResultOptions

# Type Alias: GeoSearchStoreResultOptions

> **GeoSearchStoreResultOptions**: `GeoSearchCommonResultOptions` & `object`

Optional parameters for [geosearchstore](../../BaseClient/classes/BaseClient.md#geosearchstore) command which defines what should be included in the
search results and how results should be ordered and limited.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `storeDist`? | `boolean` | Determines what is stored as the sorted set score. Defaults to `false`. - If set to `false`, the geohash of the location will be stored as the sorted set score. - If set to `true`, the distance from the center of the shape (circle or box) will be stored as the sorted set score. The distance is represented as a floating-point number in the same unit specified for that shape. |
