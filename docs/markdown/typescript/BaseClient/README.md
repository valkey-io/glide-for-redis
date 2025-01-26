[**@valkey/valkey-glide**](../README.md)

***

[@valkey/valkey-glide](../modules.md) / BaseClient

# BaseClient

## Enumerations

| Enumeration | Description |
| ------ | ------ |
| [Decoder](enumerations/Decoder.md) | Enum representing the different types of decoders. |
| [ObjectType](enumerations/ObjectType.md) | Enum of Valkey data types `STRING` `LIST` `SET` `ZSET` `HASH` `STREAM` |
| [ProtocolVersion](enumerations/ProtocolVersion.md) | - |

## Classes

| Class | Description |
| ------ | ------ |
| [BaseClient](classes/BaseClient.md) | - |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AdvancedBaseClientConfiguration](interfaces/AdvancedBaseClientConfiguration.md) | Represents advanced configuration settings for a client, including connection-related options. |
| [BaseClientConfiguration](interfaces/BaseClientConfiguration.md) | Configuration settings for creating a client. Shared settings for standalone and cluster clients. |
| [DecoderOption](interfaces/DecoderOption.md) | An extension to command option types with [Decoder](enumerations/Decoder.md). |
| [PubSubMsg](interfaces/PubSubMsg.md) | - |
| [ReturnTypeAttribute](interfaces/ReturnTypeAttribute.md) | - |
| [ServerCredentials](interfaces/ServerCredentials.md) | Represents the credentials for connecting to a server. |

## Type Aliases

| Type alias | Description |
| ------ | ------ |
| [GlideRecord](type-aliases/GlideRecord.md) | A replacement for `Record<GlideString, T>` - array of key-value pairs. |
| [GlideReturnType](type-aliases/GlideReturnType.md) | - |
| [GlideString](type-aliases/GlideString.md) | Union type that can store either a valid UTF-8 string or array of bytes. |
| [HashDataType](type-aliases/HashDataType.md) | Data type which represents how data are returned from hashes or insterted there. Similar to `Record<GlideString, GlideString>` - see [GlideRecord](type-aliases/GlideRecord.md). |
| [ReadFrom](type-aliases/ReadFrom.md) | Represents the client's read from strategy. |
| [ReturnTypeMap](type-aliases/ReturnTypeMap.md) | - |
| [ReturnTypeRecord](type-aliases/ReturnTypeRecord.md) | - |
| [ReturnTypeXinfoStream](type-aliases/ReturnTypeXinfoStream.md) | Represents the return type of xinfoStream command. |
| [SortedSetDataType](type-aliases/SortedSetDataType.md) | Data type which represents sorted sets data, including elements and their respective scores. Similar to `Record<GlideString, number>` - see [GlideRecord](type-aliases/GlideRecord.md). |
| [StreamEntries](type-aliases/StreamEntries.md) | Represents an array of Stream Entires in the response of xinfoStream command. See [ReturnTypeXinfoStream](type-aliases/ReturnTypeXinfoStream.md). |
| [StreamEntryDataType](type-aliases/StreamEntryDataType.md) | Data type which reflects now stream entries are returned. The keys of the record are stream entry IDs, which are mapped to key-value pairs of the data. |
| [WritePromiseOptions](type-aliases/WritePromiseOptions.md) | A type to combine RouterOption and DecoderOption to be used for creating write promises for the command. See - [DecoderOption](interfaces/DecoderOption.md) and [RouteOption](../GlideClusterClient/interfaces/RouteOption.md) |

## Functions

| Function | Description |
| ------ | ------ |
| [convertGlideRecord](functions/convertGlideRecord.md) | This function converts an input from GlideRecord or Record types to GlideRecord. |
| [convertGlideRecordToRecord](functions/convertGlideRecordToRecord.md) | Recursively downcast `GlideRecord` to `Record`. Use if `data` keys are always strings. |
| [convertRecordToGlideRecord](functions/convertRecordToGlideRecord.md) | Reverse of [convertGlideRecordToRecord](functions/convertGlideRecordToRecord.md). |
| [isGlideRecord](functions/isGlideRecord.md) | Check whether an object is a `GlideRecord` (see [GlideRecord](type-aliases/GlideRecord.md)). |
