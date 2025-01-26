[**@valkey/valkey-glide**](../README.md)

***

[@valkey/valkey-glide](../modules.md) / Commands

# Commands

## Enumerations

| Enumeration | Description |
| ------ | ------ |
| [BitmapIndexType](enumerations/BitmapIndexType.md) | Enumeration specifying if index arguments are BYTE indexes or BIT indexes. Can be specified in [BitOffsetOptions](interfaces/BitOffsetOptions.md), which is an optional argument to the [bitcount](../BaseClient/classes/BaseClient.md#bitcount) command. Can also be specified as an optional argument to the BaseClient.bitposInverval\|bitposInterval command. |
| [BitOverflowControl](enumerations/BitOverflowControl.md) | Enumeration specifying bit overflow controls for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) command. |
| [BitwiseOperation](enumerations/BitwiseOperation.md) | Enumeration defining the bitwise operation to use in the [bitop](../BaseClient/classes/BaseClient.md#bitop) command. Specifies the bitwise operation to perform between the passed in keys. |
| [ConditionalChange](enumerations/ConditionalChange.md) | An optional condition to the [geoadd](../BaseClient/classes/BaseClient.md#geoadd), [zadd](../BaseClient/classes/BaseClient.md#zadd) and [set](../BaseClient/classes/BaseClient.md#set) commands. |
| [ExpireOptions](enumerations/ExpireOptions.md) | - |
| [FlushMode](enumerations/FlushMode.md) | Defines flushing mode for [GlideClient.flushall](../GlideClient/classes/GlideClient.md#flushall), [GlideClusterClient.flushall](../GlideClusterClient/classes/GlideClusterClient.md#flushall), [GlideClient.functionFlush](../GlideClient/classes/GlideClient.md#functionflush), [GlideClusterClient.functionFlush](../GlideClusterClient/classes/GlideClusterClient.md#functionflush), [GlideClient.flushdb](../GlideClient/classes/GlideClient.md#flushdb) and [GlideClusterClient.flushdb](../GlideClusterClient/classes/GlideClusterClient.md#flushdb) commands. |
| [FunctionRestorePolicy](enumerations/FunctionRestorePolicy.md) | Option for `FUNCTION RESTORE` command: [GlideClient.functionRestore](../GlideClient/classes/GlideClient.md#functionrestore) and [GlideClusterClient.functionRestore](../GlideClusterClient/classes/GlideClusterClient.md#functionrestore). |
| [GeoUnit](enumerations/GeoUnit.md) | Enumeration representing distance units options. |
| [InfBoundary](enumerations/InfBoundary.md) | - |
| [InfoOptions](enumerations/InfoOptions.md) | INFO option: a specific section of information: When no parameter is provided, the default option is assumed. |
| [InsertPosition](enumerations/InsertPosition.md) | Defines where to insert new elements into a list. |
| [ListDirection](enumerations/ListDirection.md) | Enumeration representing element popping or adding direction for the List Based Commands. |
| [ScoreFilter](enumerations/ScoreFilter.md) | Mandatory option for zmpop. Defines which elements to pop from the sorted set. |
| [SortOrder](enumerations/SortOrder.md) | Defines the sort order for nested results. |
| [TimeUnit](enumerations/TimeUnit.md) | Time unit representation which is used in optional arguments for [getex](../BaseClient/classes/BaseClient.md#getex) and [set](../BaseClient/classes/BaseClient.md#set) command. |
| [UpdateByScore](enumerations/UpdateByScore.md) | Options for updating elements of a sorted set key. |

## Classes

| Class | Description |
| ------ | ------ |
| [BitFieldGet](classes/BitFieldGet.md) | Represents the "GET" subcommand for getting a value in the binary representation of the string stored in `key`. |
| [BitFieldIncrBy](classes/BitFieldIncrBy.md) | Represents the "INCRBY" subcommand for increasing or decreasing bits in the binary representation of the string stored in `key`. |
| [BitFieldOverflow](classes/BitFieldOverflow.md) | Represents the "OVERFLOW" subcommand that determines the result of the "SET" or "INCRBY" [bitfield](../BaseClient/classes/BaseClient.md#bitfield) subcommands when an underflow or overflow occurs. |
| [BitFieldSet](classes/BitFieldSet.md) | Represents the "SET" subcommand for setting bits in the binary representation of the string stored in `key`. |
| [BitOffset](classes/BitOffset.md) | Represents an offset in an array of bits for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) or [bitfieldReadOnly](../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. |
| [BitOffsetMultiplier](classes/BitOffsetMultiplier.md) | Represents an offset in an array of bits for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) or [bitfieldReadOnly](../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. The bit offset index is calculated as the numerical value of the offset multiplied by the encoding value. |
| [SignedEncoding](classes/SignedEncoding.md) | Represents a signed argument encoding. |
| [UnsignedEncoding](classes/UnsignedEncoding.md) | Represents an unsigned argument encoding. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [BaseScanOptions](interfaces/BaseScanOptions.md) | This base class represents the common set of optional arguments for the SCAN family of commands. Concrete implementations of this class are tied to specific SCAN commands (`SCAN`, `SSCAN`). |
| [BitEncoding](interfaces/BitEncoding.md) | Represents a signed or unsigned argument encoding for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) or [bitfieldReadOnly](../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. |
| [BitFieldOffset](interfaces/BitFieldOffset.md) | Represents an offset for an array of bits for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) or [bitfieldReadOnly](../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. |
| [BitFieldSubCommands](interfaces/BitFieldSubCommands.md) | Represents subcommands for the [bitfield](../BaseClient/classes/BaseClient.md#bitfield) or [bitfieldReadOnly](../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. |
| [BitOffsetOptions](interfaces/BitOffsetOptions.md) | Represents offsets specifying a string interval to analyze in the [bitcount](../BaseClient/classes/BaseClient.md#bitcount) and [bitpos](../BaseClient/classes/BaseClient.md#bitpos) commands. The offsets are zero-based indexes, with `0` being the first index of the string, `1` being the next index and so on. The offsets can also be negative numbers indicating offsets starting at the end of the string, with `-1` being the last index of the string, `-2` being the penultimate, and so on. |
| [ClusterScanOptions](interfaces/ClusterScanOptions.md) | Options for the SCAN command. `match`: The match filter is applied to the result of the command and will only include keys that match the pattern specified. `count`: `COUNT` is a just a hint for the command for how many elements to fetch from the server, the default is 10. `type`: The type of the object to scan. Types are the data types of Valkey: `string`, `list`, `set`, `zset`, `hash`, `stream`. `allowNonCoveredSlots`: If true, the scan will keep scanning even if slots are not covered by the cluster. By default, the scan will stop if slots are not covered by the cluster. |
| [CoordOrigin](interfaces/CoordOrigin.md) | The search origin represented by a [GeospatialData](interfaces/GeospatialData.md) position. |
| [FunctionListOptions](interfaces/FunctionListOptions.md) | Optional arguments for `FUNCTION LIST` command. |
| [GeoAddOptions](interfaces/GeoAddOptions.md) | Optional arguments for the GeoAdd command. |
| [GeoBoxShape](interfaces/GeoBoxShape.md) | Rectangle search shape defined by the width and height and measurement unit. |
| [GeoCircleShape](interfaces/GeoCircleShape.md) | Circle search shape defined by the radius value and measurement unit. |
| [GeospatialData](interfaces/GeospatialData.md) | Represents a geographic position defined by longitude and latitude. The exact limits, as specified by `EPSG:900913 / EPSG:3785 / OSGEO:41001` are the following: |
| [Limit](interfaces/Limit.md) | The `LIMIT` argument is commonly used to specify a subset of results from the matching elements, similar to the `LIMIT` clause in SQL (e.g., `SELECT LIMIT offset, count`). |
| [LolwutOptions](interfaces/LolwutOptions.md) | Additional parameters for `LOLWUT` command. |
| [LPosOptions](interfaces/LPosOptions.md) | Optional arguments to LPOS command. |
| [MemberOrigin](interfaces/MemberOrigin.md) | The search origin represented by an existing member. |
| [RangeByIndex](interfaces/RangeByIndex.md) | Represents a range by index (rank) in a sorted set. The `start` and `end` arguments represent zero-based indexes. |
| [RestoreOptions](interfaces/RestoreOptions.md) | Optional arguments for `RESTORE` command. |
| [ScanOptions](interfaces/ScanOptions.md) | Options for the SCAN command. `match`: The match filter is applied to the result of the command and will only include keys that match the pattern specified. `count`: `COUNT` is a just a hint for the command for how many elements to fetch from the server, the default is 10. `type`: The type of the object to scan. Types are the data types of Valkey: `string`, `list`, `set`, `zset`, `hash`, `stream`. |
| [SortOptions](interfaces/SortOptions.md) | Optional arguments to [sort](../BaseClient/classes/BaseClient.md#sort), [sortStore](../BaseClient/classes/BaseClient.md#sortstore) and [sortReadOnly](../BaseClient/classes/BaseClient.md#sortreadonly) commands. |
| [StreamAddOptions](interfaces/StreamAddOptions.md) | - |
| [StreamClaimOptions](interfaces/StreamClaimOptions.md) | Optional parameters for [xclaim](../BaseClient/classes/BaseClient.md#xclaim) command. |
| [StreamGroupOptions](interfaces/StreamGroupOptions.md) | Optional arguments for [xgroupCreate](../BaseClient/classes/BaseClient.md#xgroupcreate). |
| [StreamPendingOptions](interfaces/StreamPendingOptions.md) | Optional arguments for [xpending](../BaseClient/classes/BaseClient.md#xpendingwithoptions). |
| [StreamReadOptions](interfaces/StreamReadOptions.md) | Optional arguments for [xread](../BaseClient/classes/BaseClient.md#xread) command. |
| [ZAddOptions](interfaces/ZAddOptions.md) | - |

## Type Aliases

| Type alias | Description |
| ------ | ------ |
| [AggregationType](type-aliases/AggregationType.md) | `AggregationType` - representing aggregation types for `ZINTERSTORE` and `ZUNIONSTORE` sorted set commands. |
| [Boundary](type-aliases/Boundary.md) | Defines the boundaries of a range. |
| [FunctionListResponse](type-aliases/FunctionListResponse.md) | Type of the response of `FUNCTION LIST` command. |
| [FunctionStatsFullResponse](type-aliases/FunctionStatsFullResponse.md) | Full response for `FUNCTION STATS` command across multiple nodes. It maps node addresses to the per-node response. |
| [FunctionStatsSingleResponse](type-aliases/FunctionStatsSingleResponse.md) | Response for `FUNCTION STATS` command on a single node. The response is a map with 2 keys: 1. Information about the current running function/script (or null if none). 2. Details about the execution engines. |
| [GeoSearchResultOptions](type-aliases/GeoSearchResultOptions.md) | Optional parameters for [geosearch](../BaseClient/classes/BaseClient.md#geosearch) command which defines what should be included in the search results and how results should be ordered and limited. |
| [GeoSearchShape](type-aliases/GeoSearchShape.md) | - |
| [GeoSearchStoreResultOptions](type-aliases/GeoSearchStoreResultOptions.md) | Optional parameters for [geosearchstore](../BaseClient/classes/BaseClient.md#geosearchstore) command which defines what should be included in the search results and how results should be ordered and limited. |
| [HScanOptions](type-aliases/HScanOptions.md) | Options specific to the HSCAN command, extending from the base scan options. |
| [KeyWeight](type-aliases/KeyWeight.md) | `KeyWeight` - pair of variables represents a weighted key for the `ZINTERSTORE` and `ZUNIONSTORE` sorted sets commands. |
| [RangeByLex](type-aliases/RangeByLex.md) | - |
| [RangeByScore](type-aliases/RangeByScore.md) | - |
| [SearchOrigin](type-aliases/SearchOrigin.md) | - |
| [SetOptions](type-aliases/SetOptions.md) | - |
| [StreamReadGroupOptions](type-aliases/StreamReadGroupOptions.md) | Optional arguments for [xreadgroup](../BaseClient/classes/BaseClient.md#xreadgroup) command. |
| [StreamTrimOptions](type-aliases/StreamTrimOptions.md) | - |
| [ZScanOptions](type-aliases/ZScanOptions.md) | Options specific to the ZSCAN command, extending from the base scan options. |

## Functions

| Function | Description |
| ------ | ------ |
| [convertElementsAndScores](functions/convertElementsAndScores.md) | Convert input from `Record` to `SortedSetDataType` to ensure the only one type. |
| [convertFieldsAndValuesToHashDataType](functions/convertFieldsAndValuesToHashDataType.md) | This function converts an input from [HashDataType](../BaseClient/type-aliases/HashDataType.md) or `Record` types to `HashDataType`. |
| [convertKeysAndEntries](functions/convertKeysAndEntries.md) | This function converts an input from Record or GlideRecord types to GlideRecord. |
| [createAppend](functions/createAppend.md) | - |
| [createBitCount](functions/createBitCount.md) | - |
| [createBitField](functions/createBitField.md) | - |
| [createBitOp](functions/createBitOp.md) | - |
| [createBitPos](functions/createBitPos.md) | - |
| [createBLMove](functions/createBLMove.md) | - |
| [createBLMPop](functions/createBLMPop.md) | - |
| [createBLPop](functions/createBLPop.md) | - |
| [createBRPop](functions/createBRPop.md) | - |
| [createBZMPop](functions/createBZMPop.md) | - |
| [createBZPopMax](functions/createBZPopMax.md) | - |
| [createBZPopMin](functions/createBZPopMin.md) | - |
| [createClientGetName](functions/createClientGetName.md) | - |
| [createClientId](functions/createClientId.md) | - |
| [createConfigGet](functions/createConfigGet.md) | - |
| [createConfigResetStat](functions/createConfigResetStat.md) | - |
| [createConfigRewrite](functions/createConfigRewrite.md) | - |
| [createConfigSet](functions/createConfigSet.md) | - |
| [createCopy](functions/createCopy.md) | - |
| [createCustomCommand](functions/createCustomCommand.md) | - |
| [createDBSize](functions/createDBSize.md) | - |
| [createDecr](functions/createDecr.md) | - |
| [createDecrBy](functions/createDecrBy.md) | - |
| [createDel](functions/createDel.md) | - |
| [createDump](functions/createDump.md) | - |
| [createEcho](functions/createEcho.md) | - |
| [createExists](functions/createExists.md) | - |
| [createExpire](functions/createExpire.md) | - |
| [createExpireAt](functions/createExpireAt.md) | - |
| [createExpireTime](functions/createExpireTime.md) | - |
| [createFCall](functions/createFCall.md) | - |
| [createFCallReadOnly](functions/createFCallReadOnly.md) | - |
| [createFlushAll](functions/createFlushAll.md) | - |
| [createFlushDB](functions/createFlushDB.md) | - |
| [createFunctionDelete](functions/createFunctionDelete.md) | - |
| [createFunctionDump](functions/createFunctionDump.md) | - |
| [createFunctionFlush](functions/createFunctionFlush.md) | - |
| [createFunctionKill](functions/createFunctionKill.md) | - |
| [createFunctionList](functions/createFunctionList.md) | - |
| [createFunctionLoad](functions/createFunctionLoad.md) | - |
| [createFunctionRestore](functions/createFunctionRestore.md) | - |
| [createFunctionStats](functions/createFunctionStats.md) | - |
| [createGeoAdd](functions/createGeoAdd.md) | - |
| [createGeoDist](functions/createGeoDist.md) | - |
| [createGeoHash](functions/createGeoHash.md) | - |
| [createGeoPos](functions/createGeoPos.md) | - |
| [createGeoSearch](functions/createGeoSearch.md) | - |
| [createGeoSearchStore](functions/createGeoSearchStore.md) | - |
| [createGet](functions/createGet.md) | - |
| [createGetBit](functions/createGetBit.md) | - |
| [createGetDel](functions/createGetDel.md) | - |
| [createGetEx](functions/createGetEx.md) | - |
| [createGetRange](functions/createGetRange.md) | - |
| [createHDel](functions/createHDel.md) | - |
| [createHExists](functions/createHExists.md) | - |
| [createHGet](functions/createHGet.md) | - |
| [createHGetAll](functions/createHGetAll.md) | - |
| [createHIncrBy](functions/createHIncrBy.md) | - |
| [createHIncrByFloat](functions/createHIncrByFloat.md) | - |
| [createHKeys](functions/createHKeys.md) | - |
| [createHLen](functions/createHLen.md) | - |
| [createHMGet](functions/createHMGet.md) | - |
| [createHRandField](functions/createHRandField.md) | - |
| [createHScan](functions/createHScan.md) | - |
| [createHSet](functions/createHSet.md) | - |
| [createHSetNX](functions/createHSetNX.md) | - |
| [createHStrlen](functions/createHStrlen.md) | - |
| [createHVals](functions/createHVals.md) | - |
| [createIncr](functions/createIncr.md) | - |
| [createIncrBy](functions/createIncrBy.md) | - |
| [createIncrByFloat](functions/createIncrByFloat.md) | - |
| [createInfo](functions/createInfo.md) | - |
| [createLastSave](functions/createLastSave.md) | - |
| [createLCS](functions/createLCS.md) | - |
| [createLIndex](functions/createLIndex.md) | - |
| [createLInsert](functions/createLInsert.md) | - |
| [createLLen](functions/createLLen.md) | - |
| [createLMove](functions/createLMove.md) | - |
| [createLMPop](functions/createLMPop.md) | - |
| [createLolwut](functions/createLolwut.md) | - |
| [createLPop](functions/createLPop.md) | - |
| [createLPos](functions/createLPos.md) | - |
| [createLPush](functions/createLPush.md) | - |
| [createLPushX](functions/createLPushX.md) | - |
| [createLRange](functions/createLRange.md) | - |
| [createLRem](functions/createLRem.md) | - |
| [createLSet](functions/createLSet.md) | - |
| [createLTrim](functions/createLTrim.md) | - |
| [createMGet](functions/createMGet.md) | - |
| [createMove](functions/createMove.md) | - |
| [createMSet](functions/createMSet.md) | - |
| [createMSetNX](functions/createMSetNX.md) | - |
| [createObjectEncoding](functions/createObjectEncoding.md) | - |
| [createObjectFreq](functions/createObjectFreq.md) | - |
| [createObjectIdletime](functions/createObjectIdletime.md) | - |
| [createObjectRefcount](functions/createObjectRefcount.md) | - |
| [createPersist](functions/createPersist.md) | - |
| [createPExpire](functions/createPExpire.md) | - |
| [createPExpireAt](functions/createPExpireAt.md) | - |
| [createPExpireTime](functions/createPExpireTime.md) | - |
| [createPfAdd](functions/createPfAdd.md) | - |
| [createPfCount](functions/createPfCount.md) | - |
| [createPfMerge](functions/createPfMerge.md) | - |
| [createPing](functions/createPing.md) | - |
| [createPTTL](functions/createPTTL.md) | - |
| [createPublish](functions/createPublish.md) | - |
| [createPubSubChannels](functions/createPubSubChannels.md) | - |
| [createPubSubNumPat](functions/createPubSubNumPat.md) | - |
| [createPubSubNumSub](functions/createPubSubNumSub.md) | - |
| [createPubsubShardChannels](functions/createPubsubShardChannels.md) | - |
| [createPubSubShardNumSub](functions/createPubSubShardNumSub.md) | - |
| [createRandomKey](functions/createRandomKey.md) | - |
| [createRename](functions/createRename.md) | - |
| [createRenameNX](functions/createRenameNX.md) | - |
| [createRestore](functions/createRestore.md) | - |
| [createRPop](functions/createRPop.md) | - |
| [createRPush](functions/createRPush.md) | - |
| [createRPushX](functions/createRPushX.md) | - |
| [createSAdd](functions/createSAdd.md) | - |
| [createScan](functions/createScan.md) | - |
| [createSCard](functions/createSCard.md) | - |
| [createScriptExists](functions/createScriptExists.md) | - |
| [createScriptFlush](functions/createScriptFlush.md) | - |
| [createScriptKill](functions/createScriptKill.md) | - |
| [createScriptShow](functions/createScriptShow.md) | - |
| [createSDiff](functions/createSDiff.md) | - |
| [createSDiffStore](functions/createSDiffStore.md) | - |
| [createSelect](functions/createSelect.md) | - |
| [createSet](functions/createSet.md) | - |
| [createSetBit](functions/createSetBit.md) | - |
| [createSetRange](functions/createSetRange.md) | - |
| [createSInter](functions/createSInter.md) | - |
| [createSInterCard](functions/createSInterCard.md) | - |
| [createSInterStore](functions/createSInterStore.md) | - |
| [createSIsMember](functions/createSIsMember.md) | - |
| [createSMembers](functions/createSMembers.md) | - |
| [createSMIsMember](functions/createSMIsMember.md) | - |
| [createSMove](functions/createSMove.md) | - |
| [createSort](functions/createSort.md) | - |
| [createSortReadOnly](functions/createSortReadOnly.md) | - |
| [createSPop](functions/createSPop.md) | - |
| [createSRandMember](functions/createSRandMember.md) | - |
| [createSRem](functions/createSRem.md) | - |
| [createSScan](functions/createSScan.md) | - |
| [createStrlen](functions/createStrlen.md) | - |
| [createSUnion](functions/createSUnion.md) | - |
| [createSUnionStore](functions/createSUnionStore.md) | - |
| [createTime](functions/createTime.md) | - |
| [createTouch](functions/createTouch.md) | - |
| [createTTL](functions/createTTL.md) | - |
| [createType](functions/createType.md) | - |
| [createUnlink](functions/createUnlink.md) | - |
| [createUnWatch](functions/createUnWatch.md) | - |
| [createWait](functions/createWait.md) | - |
| [createWatch](functions/createWatch.md) | - |
| [createXAck](functions/createXAck.md) | - |
| [createXAdd](functions/createXAdd.md) | - |
| [createXAutoClaim](functions/createXAutoClaim.md) | - |
| [createXClaim](functions/createXClaim.md) | - |
| [createXDel](functions/createXDel.md) | - |
| [createXGroupCreate](functions/createXGroupCreate.md) | - |
| [createXGroupCreateConsumer](functions/createXGroupCreateConsumer.md) | - |
| [createXGroupDelConsumer](functions/createXGroupDelConsumer.md) | - |
| [createXGroupDestroy](functions/createXGroupDestroy.md) | - |
| [createXGroupSetid](functions/createXGroupSetid.md) | - |
| [createXInfoConsumers](functions/createXInfoConsumers.md) | - |
| [createXInfoGroups](functions/createXInfoGroups.md) | - |
| [createXInfoStream](functions/createXInfoStream.md) | - |
| [createXLen](functions/createXLen.md) | - |
| [createXPending](functions/createXPending.md) | - |
| [createXRange](functions/createXRange.md) | - |
| [createXRead](functions/createXRead.md) | - |
| [createXReadGroup](functions/createXReadGroup.md) | - |
| [createXRevRange](functions/createXRevRange.md) | - |
| [createXTrim](functions/createXTrim.md) | - |
| [createZAdd](functions/createZAdd.md) | - |
| [createZCard](functions/createZCard.md) | - |
| [createZCount](functions/createZCount.md) | - |
| [createZDiff](functions/createZDiff.md) | - |
| [createZDiffStore](functions/createZDiffStore.md) | - |
| [createZDiffWithScores](functions/createZDiffWithScores.md) | - |
| [createZIncrBy](functions/createZIncrBy.md) | - |
| [createZInter](functions/createZInter.md) | - |
| [createZInterCard](functions/createZInterCard.md) | - |
| [createZInterstore](functions/createZInterstore.md) | - |
| [createZLexCount](functions/createZLexCount.md) | - |
| [createZMPop](functions/createZMPop.md) | - |
| [createZMScore](functions/createZMScore.md) | - |
| [createZPopMax](functions/createZPopMax.md) | - |
| [createZPopMin](functions/createZPopMin.md) | - |
| [createZRandMember](functions/createZRandMember.md) | - |
| [createZRange](functions/createZRange.md) | - |
| [createZRangeStore](functions/createZRangeStore.md) | - |
| [createZRangeWithScores](functions/createZRangeWithScores.md) | - |
| [createZRank](functions/createZRank.md) | - |
| [createZRem](functions/createZRem.md) | - |
| [createZRemRangeByLex](functions/createZRemRangeByLex.md) | - |
| [createZRemRangeByRank](functions/createZRemRangeByRank.md) | - |
| [createZRemRangeByScore](functions/createZRemRangeByScore.md) | - |
| [createZRevRank](functions/createZRevRank.md) | - |
| [createZRevRankWithScore](functions/createZRevRankWithScore.md) | - |
| [createZScan](functions/createZScan.md) | - |
| [createZScore](functions/createZScore.md) | - |
| [createZUnion](functions/createZUnion.md) | - |
| [createZUnionStore](functions/createZUnionStore.md) | - |
| [parseInfoResponse](functions/parseInfoResponse.md) | - |
