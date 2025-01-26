[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / ConditionalChange

# Enumeration: ConditionalChange

An optional condition to the [geoadd](../../BaseClient/classes/BaseClient.md#geoadd),
[zadd](../../BaseClient/classes/BaseClient.md#zadd) and [set](../../BaseClient/classes/BaseClient.md#set) commands.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="only_if_does_not_exist"></a> `ONLY_IF_DOES_NOT_EXIST` | `"NX"` | Only add new elements. Don't update already existing elements. Equivalent to `NX` in the Valkey API. |
| <a id="only_if_exists"></a> `ONLY_IF_EXISTS` | `"XX"` | Only update elements that already exist. Don't add new elements. Equivalent to `XX` in the Valkey API. |
