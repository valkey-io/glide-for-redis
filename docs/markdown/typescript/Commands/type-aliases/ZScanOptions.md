[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / ZScanOptions

# Type Alias: ZScanOptions

> **ZScanOptions**: [`BaseScanOptions`](../interfaces/BaseScanOptions.md) & `object`

Options specific to the ZSCAN command, extending from the base scan options.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `noScores`? | `boolean` | If true, the scores are not included in the results. Supported from Valkey 8.0.0 and above. |
