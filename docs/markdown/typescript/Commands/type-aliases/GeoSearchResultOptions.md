[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / GeoSearchResultOptions

# Type Alias: GeoSearchResultOptions

> **GeoSearchResultOptions**: `GeoSearchCommonResultOptions` & `object`

Optional parameters for [geosearch](../../BaseClient/classes/BaseClient.md#geosearch) command which defines what should be included in the
search results and how results should be ordered and limited.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `withCoord`? | `boolean` | Include the coordinate of the returned items. |
| `withDist`? | `boolean` | Include the distance of the returned items from the specified center point. The distance is returned in the same unit as specified for the `searchBy` argument. |
| `withHash`? | `boolean` | Include the geohash of the returned items. |
