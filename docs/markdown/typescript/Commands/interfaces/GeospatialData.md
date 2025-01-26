[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / GeospatialData

# Interface: GeospatialData

Represents a geographic position defined by longitude and latitude.
The exact limits, as specified by `EPSG:900913 / EPSG:3785 / OSGEO:41001` are the
following:

  Valid longitudes are from `-180` to `180` degrees.
  Valid latitudes are from `-85.05112878` to `85.05112878` degrees.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="latitude"></a> `latitude` | `number` | The latitude coordinate. |
| <a id="longitude"></a> `longitude` | `number` | The longitude coordinate. |
