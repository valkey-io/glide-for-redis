[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / ExpireOptions

# Enumeration: ExpireOptions

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="hasexistingexpiry"></a> `HasExistingExpiry` | `"XX"` | `HasExistingExpiry` - Sets expiry only when the key has an existing expiry. |
| <a id="hasnoexpiry"></a> `HasNoExpiry` | `"NX"` | `HasNoExpiry` - Sets expiry only when the key has no expiry. |
| <a id="newexpirygreaterthancurrent"></a> `NewExpiryGreaterThanCurrent` | `"GT"` | `NewExpiryGreaterThanCurrent` - Sets expiry only when the new expiry is greater than current one. |
| <a id="newexpirylessthancurrent"></a> `NewExpiryLessThanCurrent` | `"LT"` | `NewExpiryLessThanCurrent` - Sets expiry only when the new expiry is less than current one. |
