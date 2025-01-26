[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / InfoOptions

# Enumeration: InfoOptions

INFO option: a specific section of information:
When no parameter is provided, the default option is assumed.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="all"></a> `All` | `"all"` | ALL: Return all sections (excluding module generated ones) |
| <a id="clients"></a> `Clients` | `"clients"` | CLIENTS: Client connections section |
| <a id="cluster"></a> `Cluster` | `"cluster"` | CLUSTER: Valkey Cluster section |
| <a id="commandstats"></a> `Commandstats` | `"commandstats"` | COMMANDSTATS: Valkey command statistics |
| <a id="cpu"></a> `Cpu` | `"cpu"` | CPU: CPU consumption statistics |
| <a id="default"></a> `Default` | `"default"` | DEFAULT: Return only the default set of sections |
| <a id="errorstats"></a> `Errorstats` | `"errorstats"` | ERRORSTATS: Valkey error statistics |
| <a id="everything"></a> `Everything` | `"everything"` | EVERYTHING: Includes all and modules |
| <a id="keyspace"></a> `Keyspace` | `"keyspace"` | KEYSPACE: Database related statistics |
| <a id="latencystats"></a> `Latencystats` | `"latencystats"` | LATENCYSTATS: Valkey command latency percentile distribution statistics |
| <a id="memory"></a> `Memory` | `"memory"` | MEMORY: Memory consumption related information |
| <a id="modules"></a> `Modules` | `"modules"` | MODULES: Modules section |
| <a id="persistence"></a> `Persistence` | `"persistence"` | PERSISTENCE: RDB and AOF related information |
| <a id="replication"></a> `Replication` | `"replication"` | REPLICATION: Master/replica replication information |
| <a id="sentinel"></a> `Sentinel` | `"sentinel"` | SENTINEL: Valkey Sentinel section (only applicable to Sentinel instances) |
| <a id="server"></a> `Server` | `"server"` | SERVER: General information about the server |
| <a id="stats"></a> `Stats` | `"stats"` | STATS: General statistics |
