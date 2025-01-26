[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitOverflowControl

# Enumeration: BitOverflowControl

Enumeration specifying bit overflow controls for the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) command.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="fail"></a> `FAIL` | `"FAIL"` | Returns `None` when overflows occur. |
| <a id="sat"></a> `SAT` | `"SAT"` | Underflows remain set to the minimum value, and overflows remain set to the maximum value. |
| <a id="wrap"></a> `WRAP` | `"WRAP"` | Performs modulo when overflows occur with unsigned encoding. When overflows occur with signed encoding, the value restarts at the most negative value. When underflows occur with signed encoding, the value restarts at the most positive value. |
