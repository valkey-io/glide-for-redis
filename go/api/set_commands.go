// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Set" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#set
type SetCommands interface {
	// SAdd adds specified members to the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key where members will be added to its set.
	//  members - A list of members to add to the set stored at key.
	//
	// Return value:
	//  The number of members that were added to the set, excluding members already present.
	//
	// For example:
	//  result, err := client.SAdd("my_set", []string{"member1", "member2"})
	//  // result: 2
	//
	// [valkey.io]: https://valkey.io/commands/sadd/
	SAdd(key string, members []string) (int64, error)

	// SRem removes specified members from the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key from which members will be removed.
	//  members - A list of members to remove from the set stored at key.
	//
	// Return value:
	//  The number of members that were removed from the set, excluding non-existing members.
	//
	// For example:
	//  result, err := client.SRem("my_set", []string{"member1", "member2"})
	//  // result: 2
	//
	// [valkey.io]: https://valkey.io/commands/srem/
	SRem(key string, members []string) (int64, error)

	// SMembers retrieves all the members of the set value stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key from which to retrieve the set members.
	//
	// Return value:
	//   A `map[string]struct{}` containing all members of the set.
	//   Returns an empty collection if key does not exist.
	//
	// For example:
	//   // Assume set "my_set" contains: "member1", "member2"
	//   result, err := client.SMembers("my_set")
	//   // result: map[string]struct{}{ "member1": {}, "member2": {} }
	//
	// [valkey.io]: https://valkey.io/commands/smembers/
	SMembers(key string) (map[string]struct{}, error)

	// SCard retrieves the set cardinality (number of elements) of the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key from which to retrieve the number of set members.
	//
	// Return value:
	//   The cardinality (number of elements) of the set, or `0` if the key does not exist.
	//
	// Example:
	//   result, err := client.SCard("my_set")
	//   // result: 3
	//
	// [valkey.io]: https://valkey.io/commands/scard/
	SCard(key string) (int64, error)

	// SIsMember returns if member is a member of the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key    - The key of the set.
	//   member - The member to check for existence in the set.
	//
	// Return value:
	//   A bool containing true if the member exists in the set, false otherwise.
	//   If key doesn't exist, it is treated as an empty set and the method returns false.
	//
	// Example:
	//   result1, err := client.SIsMember("mySet", "member1")
	//   // result1.Value(): true
	//   // Indicates that "member1" exists in the set "mySet".
	//   result2, err := client.SIsMember("mySet", "nonExistingMember")
	//   // result2.Value(): false
	//   // Indicates that "nonExistingMember" does not exist in the set "mySet".
	//
	// [valkey.io]: https://valkey.io/commands/sismember/
	SIsMember(key string, member string) (bool, error)

	// SDiff computes the difference between the first set and all the successive sets in keys.
	//
	// Note: When in cluster mode, all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   keys - The keys of the sets to diff.
	//
	// Return value:
	//   A `map[string]struct{}` representing the difference between the sets.
	//   If a key does not exist, it is treated as an empty set.
	//
	// Example:
	//   result, err := client.SDiff([]string{"set1", "set2"})
	//   // result: map[string]struct{}{ "element": {} }
	//   // Indicates that "element" is present in "set1", but missing in "set2"
	//
	// [valkey.io]: https://valkey.io/commands/sdiff/
	SDiff(keys []string) (map[string]struct{}, error)

	// SDiffStore stores the difference between the first set and all the successive sets in keys
	// into a new set at destination.
	//
	// Note: When in cluster mode, destination and all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   destination - The key of the destination set.
	//   keys        - The keys of the sets to diff.
	//
	// Return value:
	//   The number of elements in the resulting set.
	//
	// Example:
	//   result, err := client.SDiffStore("mySet", []string{"set1", "set2"})
	//   // result: 5
	//   // Indicates that the resulting set "mySet" contains 5 elements
	//
	// [valkey.io]: https://valkey.io/commands/sdiffstore/
	SDiffStore(destination string, keys []string) (int64, error)

	// SInter gets the intersection of all the given sets.
	//
	// Note: When in cluster mode, all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   keys - The keys of the sets to intersect.
	//
	// Return value:
	//   A `map[string]struct{}` containing members which are present in all given sets.
	//   If one or more sets do not exist, an empty collection will be returned.
	//
	// Example:
	//   result, err := client.SInter([]string{"set1", "set2"})
	//   // result: map[string]struct{}{ "element": {} }
	//   // Indicates that "element" is present in both "set1" and "set2"
	//
	// [valkey.io]: https://valkey.io/commands/sinter/
	SInter(keys []string) (map[string]struct{}, error)

	// Stores the members of the intersection of all given sets specified by `keys` into a new set at `destination`
	//
	// Note: When in cluster mode, `destination` and all `keys` must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//	 destination - The key of the destination set.
	//   keys - The keys from which to retrieve the set members.
	//
	// Return value:
	//   The number of elements in the resulting set.
	//
	// Example:
	//   result, err := client.SInterStore("my_set", []string{"set1", "set2"})
	//   if err != nil {
	//       fmt.Println(result)
	//   }
	//   // Output: 2 - Two elements were stored at "my_set", and those elements are the intersection of "set1" and "set2".
	//
	// [valkey.io]: https://valkey.io/commands/sinterstore/
	SInterStore(destination string, keys []string) (int64, error)

	// SInterCard gets the cardinality of the intersection of all the given sets.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// Note: When in cluster mode, all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   keys - The keys of the sets to intersect.
	//
	// Return value:
	//   The cardinality of the intersection result. If one or more sets do not exist, `0` is returned.
	//
	// Example:
	//   result, err := client.SInterCard([]string{"set1", "set2"})
	//   // result: 2
	//   // Indicates that the intersection of "set1" and "set2" contains 2 elements
	//   result, err := client.SInterCard([]string{"set1", "nonExistingSet"})
	//   // result: 0
	//
	// [valkey.io]: https://valkey.io/commands/sintercard/
	SInterCard(keys []string) (int64, error)

	// SInterCardLimit gets the cardinality of the intersection of all the given sets, up to the specified limit.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// Note: When in cluster mode, all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   keys  - The keys of the sets to intersect.
	//   limit - The limit for the intersection cardinality value.
	//
	// Return value:
	//   The cardinality of the intersection result, or the limit if reached.
	//   If one or more sets do not exist, `0` is returned.
	//   If the intersection cardinality reaches 'limit' partway through the computation, returns 'limit' as the cardinality.
	//
	// Example:
	//   result, err := client.SInterCardLimit([]string{"set1", "set2"}, 3)
	//   // result: 2
	//   // Indicates that the intersection of "set1" and "set2" contains 2 elements (or at least 3 if the actual
	//   // intersection is larger)
	//
	// [valkey.io]: https://valkey.io/commands/sintercard/
	SInterCardLimit(keys []string, limit int64) (int64, error)

	// SRandMember returns a random element from the set value stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key from which to retrieve the set member.
	//
	// Return value:
	//   A Result[string] containing a random element from the set.
	//   Returns api.CreateNilStringResult() if key does not exist.
	//
	// Example:
	//   client.SAdd("test", []string{"one"})
	//   response, err := client.SRandMember("test")
	//   // response.Value(): "one"
	//   // err: nil
	//
	// [valkey.io]: https://valkey.io/commands/srandmember/
	SRandMember(key string) (Result[string], error)

	// SPop removes and returns one random member from the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//
	// Return value:
	//   A Result[string] containing the value of the popped member.
	//   Returns a NilResult if key does not exist.
	//
	// Example:
	//   value1, err := client.SPop("mySet")
	//   // value1.Value() might be "value1"
	//   // err: nil
	//   value2, err := client.SPop("nonExistingSet")
	//   // value2.IsNil(): true
	//   // err: nil
	//
	// [valkey.io]: https://valkey.io/commands/spop/
	SPop(key string) (Result[string], error)

	// SMIsMember returns whether each member is a member of the set stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   key - The key of the set.
	//
	// Return value:
	//   A []bool containing whether each member is a member of the set stored at key.
	//
	// Example:
	//	 client.SAdd("myKey", []string{"one", "two"})
	//   value1, err := client.SMIsMember("myKey", []string{"two", "three"})
	//   // value1[0].Value(): true
	//   // value1[1].Value(): false
	//   // err: nil
	//   value2, err := client.SPop("nonExistingKey", []string{"one"})
	//   // value2[0].Value(): false
	//   // err: nil
	//
	// [valkey.io]: https://valkey.io/commands/smismember/
	SMIsMember(key string, members []string) ([]bool, error)

	// SUnionStore stores the members of the union of all given sets specified by `keys` into a new set at `destination`.
	//
	// Note: When in cluster mode, `destination` and all `keys` must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//	 destination - The key of the destination set.
	//   keys - The keys from which to retrieve the set members.
	//
	// Return value:
	//   The number of elements in the resulting set.
	//
	// Example:
	//   result, err := client.SUnionStore("my_set", []string{"set1", "set2"})
	//   if err != nil {
	//       fmt.Println(result)
	//   }
	//   // Output: 2 - Two elements were stored at "my_set", and those elements are the union of "set1" and "set2".
	//
	// [valkey.io]: https://valkey.io/commands/sunionstore/
	SUnionStore(destination string, keys []string) (int64, error)

	// SUnion gets the union of all the given sets.
	//
	// Note: When in cluster mode, all keys must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   keys - The keys of the sets.
	//
	// Return value:
	//   A `map[string]struct{}` of members which are present in at least one of the given sets.
	//   If none of the sets exist, an empty collection will be returned.
	//
	// Example:
	//  result1, err := client.SAdd("my_set1", []string {"member1", "member2"})
	//  // result.Value(): 2
	//  // result.IsNil(): false
	//
	//  result2, err := client.SAdd("my_set2", []string {"member2", "member3"})
	//  // result.Value(): 2
	//  // result.IsNil(): false
	//
	//  result3, err := client.SUnion([]string {"my_set1", "my_set2"})
	//  // result3: "{'member1', 'member2', 'member3'}"
	//  // err: nil
	//
	//  result4, err := client.SUnion([]string {"my_set1", "non_existing_set"})
	//  // result4: "{'member1', 'member2'}"
	//  // err: nil
	//
	// [valkey.io]: https://valkey.io/commands/sunion/
	SUnion(keys []string) (map[string]struct{}, error)

	SScan(key string, cursor string) (string, []string, error)

	SScanWithOptions(key string, cursor string, options *options.BaseScanOptions) (string, []string, error)

	// Moves `member` from the set at `source` to the set at `destination`, removing it from the source set.
	// Creates a new destination set if needed. The operation is atomic.
	//
	// Note: When in cluster mode, `source` and `destination` must map to the same hash slot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//   source - The key of the set to remove the element from.
	//   destination - The key of the set to add the element to.
	//   member - The set element to move.
	//
	// Return value:
	//   `true` on success, or `false` if the `source` set does not exist or the element is not a member of the source set.
	//
	// Example:
	//	 moved := SMove("set1", "set2", "element")
	//   fmt.Println(moved.Value()) // Output: true
	//
	// [valkey.io]: https://valkey.io/commands/smove/
	SMove(source string, destination string, member string) (bool, error)
}
