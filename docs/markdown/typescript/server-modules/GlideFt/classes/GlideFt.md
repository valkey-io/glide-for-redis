[**@valkey/valkey-glide**](../../../README.md)

***

[@valkey/valkey-glide](../../../modules.md) / [server-modules/GlideFt](../README.md) / GlideFt

# Class: GlideFt

Module for Vector Search commands.

## Constructors

### new GlideFt()

> **new GlideFt**(): [`GlideFt`](GlideFt.md)

#### Returns

[`GlideFt`](GlideFt.md)

## Methods

### aggregate()

> `static` **aggregate**(`client`, `indexName`, `query`, `options`?): `Promise`\<[`FtAggregateReturnType`](../type-aliases/FtAggregateReturnType.md)\>

Runs a search query on an index, and perform aggregate transformations on the results.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. |
| `options`? | DecoderOption & FtAggregateOptions | Additional parameters for the command - see FtAggregateOptions and [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`FtAggregateReturnType`](../type-aliases/FtAggregateReturnType.md)\>

Results of the last stage of the pipeline.

#### Example

```typescript
const options: FtAggregateOptions = {
     loadFields: ["__key"],
     clauses: [
         {
             type: "GROUPBY",
             properties: ["@condition"],
             reducers: [
                 {
                     function: "TOLIST",
                     args: ["__key"],
                     name: "bicycles",
                 },
             ],
         },
     ],
 };
const result = await GlideFt.aggregate(client, "myIndex", "*", options);
console.log(result); // Output:
// [
//     [
//         {
//             key: "condition",
//             value: "refurbished"
//         },
//         {
//             key: "bicycles",
//             value: [ "bicycle:9" ]
//         }
//     ],
//     [
//         {
//             key: "condition",
//             value: "used"
//         },
//         {
//             key: "bicycles",
//             value: [ "bicycle:1", "bicycle:2", "bicycle:3" ]
//         }
//     ],
//     [
//         {
//             key: "condition",
//             value: "new"
//         },
//         {
//             key: "bicycles",
//             value: [ "bicycle:0", "bicycle:5" ]
//         }
//     ]
// ]
```

***

### aliasadd()

> `static` **aliasadd**(`client`, `indexName`, `alias`): `Promise`\<`"OK"`\>

Adds an alias for an index. The new alias name can be used anywhere that an index name is required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The alias to be added to the index. |
| `alias` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name for which the alias has to be added. |

#### Returns

`Promise`\<`"OK"`\>

`"OK"`

#### Example

```typescript
// Example usage of FT.ALIASADD to add an alias for an index.
await GlideFt.aliasadd(client, "index", "alias"); // "OK"
```

***

### aliasdel()

> `static` **aliasdel**(`client`, `alias`): `Promise`\<`"OK"`\>

Deletes an existing alias for an index.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `alias` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The existing alias to be deleted for an index. |

#### Returns

`Promise`\<`"OK"`\>

`"OK"`

#### Example

```typescript
// Example usage of FT.ALIASDEL to delete an existing alias.
await GlideFt.aliasdel(client, "alias"); // "OK"
```

***

### aliaslist()

> `static` **aliaslist**(`client`, `options`?): `Promise`\<[`GlideRecord`](../../../BaseClient/type-aliases/GlideRecord.md)\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)\>\>

List the index aliases.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `options`? | [`DecoderOption`](../../../BaseClient/interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideRecord`](../../../BaseClient/type-aliases/GlideRecord.md)\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)\>\>

A map of index aliases for indices being aliased.

#### Example

```typescript
// Example usage of FT._ALIASLIST to query index aliases
const result = await GlideFt.aliaslist(client);
console.log(result); // Output:
//[{"key": "alias1", "value": "index1"}, {"key": "alias2", "value": "index2"}]
```

***

### aliasupdate()

> `static` **aliasupdate**(`client`, `alias`, `indexName`): `Promise`\<`"OK"`\>

Updates an existing alias to point to a different physical index. This command only affects future references to the alias.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `alias` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The alias name. This alias will now be pointed to a different index. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name for which an existing alias has to updated. |

#### Returns

`Promise`\<`"OK"`\>

`"OK"`

#### Example

```typescript
// Example usage of FT.ALIASUPDATE to update an alias to point to a different index.
await GlideFt.aliasupdate(client, "newAlias", "index"); // "OK"
```

***

### create()

> `static` **create**(`client`, `indexName`, `schema`, `options`?): `Promise`\<`"OK"`\>

Creates an index and initiates a backfill of that index.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name for the index to be created. |
| `schema` | `Field`[] | The fields of the index schema, specifying the fields and their types. |
| `options`? | `FtCreateOptions` | (Optional) Options for the `FT.CREATE` command. See FtCreateOptions. |

#### Returns

`Promise`\<`"OK"`\>

If the index is successfully created, returns "OK".

#### Example

```typescript
// Example usage of FT.CREATE to create a 6-dimensional JSON index using the HNSW algorithm
await GlideFt.create(client, "json_idx1", [{
     type: "VECTOR",
     name: "$.vec",
     alias: "VEC",
     attributes: {
         algorithm: "HNSW",
         type: "FLOAT32",
         dimension: 6,
         distanceMetric: "L2",
         numberOfEdges: 32,
     },
 }], {
     dataType: "JSON",
     prefixes: ["json:"]
 });
```

***

### dropindex()

> `static` **dropindex**(`client`, `indexName`): `Promise`\<`"OK"`\>

Deletes an index and associated content. Indexed document keys are unaffected.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |

#### Returns

`Promise`\<`"OK"`\>

"OK"

#### Example

```typescript
// Example usage of FT.DROPINDEX to drop an index
await GlideFt.dropindex(client, "json_idx1"); // "OK"
```

***

### explain()

> `static` **explain**(`client`, `indexName`, `query`, `options`?): `Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)\>

Parse a query and return information about how that query was parsed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. It is the same as the query passed as an argument to [FT.SEARCH](GlideFt.md#search) or [FT.AGGREGATE](GlideFt.md#aggregate). |
| `options`? | [`DecoderOption`](../../../BaseClient/interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)\>

A query execution plan.

#### Example

```typescript
const result = GlideFt.explain(client, "myIndex", "@price:[0 10]");
console.log(result); // Output: "Field {\n\tprice\n\t0\n\t10\n}"
```

***

### explaincli()

> `static` **explaincli**(`client`, `indexName`, `query`, `options`?): `Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[]\>

Parse a query and return information about how that query was parsed.
Same as [FT.EXPLAIN](GlideFt.md#explain), except that the results are
displayed in a different format.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. It is the same as the query passed as an argument to [FT.SEARCH](GlideFt.md#search) or [FT.AGGREGATE](GlideFt.md#aggregate). |
| `options`? | [`DecoderOption`](../../../BaseClient/interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[]\>

A query execution plan.

#### Example

```typescript
const result = GlideFt.explaincli(client, "myIndex", "@price:[0 10]");
console.log(result); // Output: ["Field {", "price", "0", "10", "}"]
```

***

### info()

> `static` **info**(`client`, `indexName`, `options`?): `Promise`\<[`FtInfoReturnType`](../type-aliases/FtInfoReturnType.md)\>

Returns information about a given index.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `options`? | [`DecoderOption`](../../../BaseClient/interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`FtInfoReturnType`](../type-aliases/FtInfoReturnType.md)\>

Nested maps with info about the index. See example for more details.

#### Example

```typescript
const info = await GlideFt.info(client, "myIndex");
console.log(info); // Output:
// {
//     index_name: 'myIndex',
//     index_status: 'AVAILABLE',
//     key_type: 'JSON',
//     creation_timestamp: 1728348101728771,
//     key_prefixes: [ 'json:' ],
//     num_indexed_vectors: 0,
//     space_usage: 653471,
//     num_docs: 0,
//     vector_space_usage: 653471,
//     index_degradation_percentage: 0,
//     fulltext_space_usage: 0,
//     current_lag: 0,
//     fields: [
//         {
//             identifier: '$.vec',
//             type: 'VECTOR',
//             field_name: 'VEC',
//             option: '',
//             vector_params: {
//                 data_type: 'FLOAT32',
//                 initial_capacity: 1000,
//                 current_capacity: 1000,
//                 distance_metric: 'L2',
//                 dimension: 6,
//                 block_size: 1024,
//                 algorithm: 'FLAT'
//             }
//         },
//         {
//             identifier: 'name',
//             type: 'TEXT',
//             field_name: 'name',
//             option: ''
//         },
//     ]
// }
```

***

### list()

> `static` **list**(`client`, `options`?): `Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[]\>

Lists all indexes.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `options`? | [`DecoderOption`](../../../BaseClient/interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[]\>

An array of index names.

#### Example

```typescript
console.log(await GlideFt.list(client)); // Output: ["index1", "index2"]
```

***

### profileAggregate()

> `static` **profileAggregate**(`client`, `indexName`, `query`, `options`?): `Promise`\<\[[`FtAggregateReturnType`](../type-aliases/FtAggregateReturnType.md), `Record`\<`string`, `number`\>\]\>

Runs an aggregate query and collects performance profiling information.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. |
| `options`? | DecoderOption & (FtAggregateOptions & \{ limited?: boolean \| undefined; \}) | (Optional) See FtAggregateOptions and [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). Additionally: - `limited` (Optional) - Either provide a full verbose output or some brief version. |

#### Returns

`Promise`\<\[[`FtAggregateReturnType`](../type-aliases/FtAggregateReturnType.md), `Record`\<`string`, `number`\>\]\>

A two-element array. The first element contains results of the aggregate query being profiled, the
    second element stores profiling information.

#### Example

```typescript
// Example of running profile on an aggregate query
const options: FtAggregateOptions = {
     loadFields: ["__key"],
     clauses: [
         {
             type: "GROUPBY",
             properties: ["@condition"],
             reducers: [
                 {
                     function: "TOLIST",
                     args: ["__key"],
                     name: "bicycles",
                 },
             ],
         },
     ],
 };
const result = await GlideFt.profileAggregate(client, "myIndex", "*", options);
console.log(result); // Output:
// result[0] contains `FT.AGGREGATE` response with the given query
// result[1] contains profiling data as a `Record<string, number>`
```

***

### profileSearch()

> `static` **profileSearch**(`client`, `indexName`, `query`, `options`?): `Promise`\<\[[`FtSearchReturnType`](../type-aliases/FtSearchReturnType.md), `Record`\<`string`, `number`\>\]\>

Runs a search query and collects performance profiling information.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. |
| `options`? | DecoderOption & (FtSearchOptions & \{ limited?: boolean \| undefined; \}) | (Optional) See FtSearchOptions and [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). Additionally: - `limited` (Optional) - Either provide a full verbose output or some brief version. |

#### Returns

`Promise`\<\[[`FtSearchReturnType`](../type-aliases/FtSearchReturnType.md), `Record`\<`string`, `number`\>\]\>

A two-element array. The first element contains results of the search query being profiled, the
    second element stores profiling information.

#### Example

```typescript
// Example of running profile on a search query
const vector = Buffer.alloc(24);
const result = await GlideFt.profileSearch(client, "json_idx1", "*=>[KNN 2 @VEC $query_vec]", {params: [{key: "query_vec", value: vector}]});
console.log(result); // Output:
// result[0] contains `FT.SEARCH` response with the given query
// result[1] contains profiling data as a `Record<string, number>`
```

***

### search()

> `static` **search**(`client`, `indexName`, `query`, `options`?): `Promise`\<[`FtSearchReturnType`](../type-aliases/FtSearchReturnType.md)\>

Uses the provided query expression to locate keys within an index. Once located, the count
and/or content of indexed fields within those keys can be returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `client` | [`GlideClient`](../../../GlideClient/classes/GlideClient.md) \| [`GlideClusterClient`](../../../GlideClusterClient/classes/GlideClusterClient.md) | The client to execute the command. |
| `indexName` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The index name to search into. |
| `query` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The text query to search. |
| `options`? | FtSearchOptions & DecoderOption | (Optional) See FtSearchOptions and [DecoderOption](../../../BaseClient/interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`FtSearchReturnType`](../type-aliases/FtSearchReturnType.md)\>

A two-element array, where the first element is the number of documents in the result set, and the
second element has the format: `GlideRecord<GlideRecord<GlideString>>`:
a mapping between document names and a map of their attributes.

If `count` or `limit` with values `{offset: 0, count: 0}` is
set, the command returns array with only one element: the number of documents.

#### Example

```typescript
//
const vector = Buffer.alloc(24);
const result = await GlideFt.search(client, "json_idx1", "*=>[KNN 2 @VEC $query_vec]", {params: [{key: "query_vec", value: vector}]});
console.log(result); // Output:
// [
//   2,
//   [
//     {
//       key: "json:2",
//       value: [
//         {
//           key: "$",
//           value: '{"vec":[1.1,1.2,1.3,1.4,1.5,1.6]}',
//         },
//         {
//           key: "__VEC_score",
//           value: "11.1100006104",
//         },
//       ],
//     },
//     {
//       key: "json:0",
//       value: [
//         {
//           key: "$",
//           value: '{"vec":[1,2,3,4,5,6]}',
//         },
//         {
//           key: "__VEC_score",
//           value: "91",
//         },
//       ],
//     },
//   ],
// ]
```
