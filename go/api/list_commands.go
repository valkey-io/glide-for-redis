// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "List" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#list
type ListCommands interface {
	// Inserts all the specified values at the head of the list stored at key. elements are inserted one after the other to the
	// head of the list, from the leftmost element to the rightmost element. If key does not exist, it is created as an empty
	// list before performing the push operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the list.
	//  elements - The elements to insert at the head of the list stored at key.
	//
	// Return value:
	//  The length of the list after the push operation.
	//
	// For example:
	//  result, err := client.LPush("my_list", []string{"value1", "value2"})
	//  result: 2
	//
	// [valkey.io]: https://valkey.io/commands/lpush/
	LPush(key string, elements []string) (int64, error)

	// Removes and returns the first elements of the list stored at key. The command pops a single element from the beginning
	// of the list.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the list.
	//
	// Return value:
	//  The Result[string] containing the value of the first element.
	//  If key does not exist, [api.CreateNilStringResult()] will be returned.
	//
	// For example:
	//  1. result, err := client.LPush("my_list", []string{"value1", "value2"})
	//     value, err := client.LPop("my_list")
	//     value.Value(): "value2"
	//     result.IsNil(): false
	//  2. result, err := client.LPop("non_existent")
	//     result.Value(): ""
	//     result.IsNil(); true
	//
	// [valkey.io]: https://valkey.io/commands/lpop/
	LPop(key string) (Result[string], error)

	// Removes and returns up to count elements of the list stored at key, depending on the list's length.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the list.
	//  count - The count of the elements to pop from the list.
	//
	// Return value:
	//  An array of the popped elements as Result[string] will be returned depending on the list's length
	//  If key does not exist, nil will be returned.
	//
	// For example:
	//  1. result, err := client.LPopCount("my_list", 2)
	//     result: []api.Result[string]{api.CreateStringResult("value1"), api.CreateStringResult("value2")}
	//  2. result, err := client.LPopCount("non_existent")
	//     result: nil
	//
	// [valkey.io]: https://valkey.io/commands/lpop/
	LPopCount(key string, count int64) ([]Result[string], error)

	// Returns the index of the first occurrence of element inside the list specified by key. If no match is found,
	// [api.CreateNilInt64Result()] is returned.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The name of the list.
	//  element - The value to search for within the list.
	//
	// Return value:
	// The Result[int64] containing the index of the first occurrence of element, or [api.CreateNilInt64Result()] if element is
	// not in the list.
	//
	// For example:
	//  result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e"})
	//  position, err := client.LPos("my_list", "e")
	//  position.Value(): 4
	//  position.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/lpos/
	LPos(key string, element string) (Result[int64], error)

	// Returns the index of an occurrence of element within a list based on the given options. If no match is found,
	// [api.CreateNilInt64Result()] is returned.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The name of the list.
	//  element - The value to search for within the list.
	//  options - The LPos options.
	//
	// Return value:
	//  The Result[int64] containing the index of element, or [api.CreateNilInt64Result()] if element is not in the list.
	//
	// For example:
	//  1. result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e"})
	//     result, err := client.LPosWithOptions("my_list", "e", api.NewLPosOptionsBuilder().SetRank(2))
	//     result.Value(): 5 (Returns the second occurrence of the element "e")
	//  2. result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e"})
	//     result, err := client.LPosWithOptions("my_list", "e", api.NewLPosOptionsBuilder().SetRank(1).SetMaxLen(1000))
	//     result.Value(): 4
	//
	// [valkey.io]: https://valkey.io/commands/lpos/
	LPosWithOptions(key string, element string, options *LPosOptions) (Result[int64], error)

	// Returns an array of indices of matching elements within a list.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The name of the list.
	//  element - The value to search for within the list.
	//  count   - The number of matches wanted.
	//
	// Return value:
	//  An array that holds the indices of the matching elements within the list.
	//
	// For example:
	//  result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	//  result, err := client.LPosCount("my_list", "e", int64(3))
	//  result: []api.Result[int64]{api.CreateInt64Result(4), api.CreateInt64Result(5), api.CreateInt64Result(6)}
	//
	//
	// [valkey.io]: https://valkey.io/commands/lpos/
	LPosCount(key string, element string, count int64) ([]Result[int64], error)

	// Returns an array of indices of matching elements within a list based on the given options. If no match is found, an
	// empty array is returned.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The name of the list.
	//  element - The value to search for within the list.
	//  count   - The number of matches wanted.
	//  options - The LPos options.
	//
	// Return value:
	//  An array that holds the indices of the matching elements within the list.
	//
	// For example:
	//  1. result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	//     result, err := client.LPosWithOptions("my_list", "e", int64(1), api.NewLPosOptionsBuilder().SetRank(2))
	//     result: []api.Result[int64]{api.CreateInt64Result(5)}
	//  2. result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	//     result, err := client.LPosWithOptions(
	//             "my_list",
	//             "e",
	//             int64(3),
	//             api.NewLPosOptionsBuilder().SetRank(2).SetMaxLen(1000),
	//            )
	//     result: []api.Result[int64]{api.CreateInt64Result(5), api.CreateInt64Result(6)}
	//
	//
	// [valkey.io]: https://valkey.io/commands/lpos/
	LPosCountWithOptions(key string, element string, count int64, options *LPosOptions) ([]Result[int64], error)

	// Inserts all the specified values at the tail of the list stored at key.
	// elements are inserted one after the other to the tail of the list, from the leftmost element to the rightmost element.
	// If key does not exist, it is created as an empty list before performing the push operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the list.
	//  elements - The elements to insert at the tail of the list stored at key.
	//
	// Return value:
	//  The length of the list after the push operation.
	//
	// For example:
	//  result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	//  result: 7
	//
	// [valkey.io]: https://valkey.io/commands/rpush/
	RPush(key string, elements []string) (int64, error)

	// Returns the specified elements of the list stored at key.
	// The offsets start and end are zero-based indexes, with 0 being the first element of the list, 1 being the next element
	// and so on. These offsets can also be negative numbers indicating offsets starting at the end of the list, with -1 being
	// the last element of the list, -2 being the penultimate, and so on.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the list.
	//  start - The starting point of the range.
	//  end   - The end of the range.
	//
	// Return value:
	//  Array of elements as Result[string] in the specified range.
	//  If start exceeds the end of the list, or if start is greater than end, an empty array will be returned.
	//  If end exceeds the actual end of the list, the range will stop at the actual end of the list.
	//  If key does not exist an empty array will be returned.
	//
	// For example:
	//  1. result, err := client.LRange("my_list", 0, 2)
	// result: []api.Result[string]{api.CreateStringResult("value1"), api.CreateStringResult("value2"),
	// api.CreateStringResult("value3")}
	//  2. result, err := client.LRange("my_list", -2, -1)
	//     result: []api.Result[string]{api.CreateStringResult("value2"), api.CreateStringResult("value3")}
	//  3. result, err := client.LRange("non_existent_key", 0, 2)
	//     result: []api.Result[string]{}
	//
	// [valkey.io]: https://valkey.io/commands/lrange/
	LRange(key string, start int64, end int64) ([]Result[string], error)

	// Returns the element at index from the list stored at key.
	// The index is zero-based, so 0 means the first element, 1 the second element and so on. Negative indices can be used to
	// designate elements starting at the tail of the list. Here, -1 means the last element, -2 means the penultimate and so
	// forth.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the list.
	//  index - The index of the element in the list to retrieve.
	//
	// Return value:
	//  The Result[string] containing element at index in the list stored at key.
	//  If index is out of range or if key does not exist, [api.CreateNilStringResult()] is returned.
	//
	// For example:
	//  1. result, err := client.LIndex("myList", 0)
	//     result.Value(): "value1" // Returns the first element in the list stored at 'myList'.
	//     result.IsNil(): false
	//  2. result, err := client.LIndex("myList", -1)
	//     result.Value(): "value3" // Returns the last element in the list stored at 'myList'.
	//     result.IsNil(): false
	//
	// [valkey.io]: https://valkey.io/commands/lindex/
	LIndex(key string, index int64) (Result[string], error)

	// Trims an existing list so that it will contain only the specified range of elements specified.
	// The offsets start and end are zero-based indexes, with 0 being the first element of the list, 1 being the next element
	// and so on. These offsets can also be negative numbers indicating offsets starting at the end of the list, with -1 being
	// the last element of the list, -2 being the penultimate, and so on.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the list.
	//  start - The starting point of the range.
	//  end   - The end of the range.
	//
	// Return value:
	//  Always `"OK"`.
	//  If start exceeds the end of the list, or if start is greater than end, the result will be an empty list (which causes
	//  key to be removed).
	//  If end exceeds the actual end of the list, it will be treated like the last element of the list.
	//  If key does not exist, `"OK"` will be returned without changes to the database.
	//
	// For example:
	//  result, err := client.LTrim("my_list", 0, 1)
	//  result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/ltrim/
	LTrim(key string, start int64, end int64) (string, error)

	// Returns the length of the list stored at key.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the list.
	//
	// Return value:
	//  The length of the list at `key`.
	//  If `key` does not exist, it is interpreted as an empty list and `0` is returned.
	//
	// For example:
	//  result, err := client.LLen("my_list")
	//  result: 3 // Indicates that there are 3 elements in the list.
	//
	// [valkey.io]: https://valkey.io/commands/llen/
	LLen(key string) (int64, error)

	// Removes the first count occurrences of elements equal to element from the list stored at key.
	// If count is positive: Removes elements equal to element moving from head to tail.
	// If count is negative: Removes elements equal to element moving from tail to head.
	// If count is 0 or count is greater than the occurrences of elements equal to element, it removes all elements equal to
	// element.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key of the list.
	//  count   - The count of the occurrences of elements equal to element to remove.
	//  element - The element to remove from the list.
	//
	// Return value:
	//  The number of the removed elements.
	//  If `key` does not exist, `0` is returned.
	//
	// For example:
	//  result, err := client.LRem("my_list", 2, "value")
	//  result: 2
	//
	// [valkey.io]: https://valkey.io/commands/lrem/
	LRem(key string, count int64, element string) (int64, error)

	// Removes and returns the last elements of the list stored at key.
	// The command pops a single element from the end of the list.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the list.
	//
	// Return value:
	//  The Result[string] containing the value of the last element.
	//  If key does not exist, [api.CreateNilStringResult()] will be returned.
	//
	// For example:
	//  1. result, err := client.RPop("my_list")
	//     result.Value(): "value1"
	//     result.IsNil(): false
	//  2. result, err := client.RPop("non_exiting_key")
	//     result.Value(): ""
	//     result.IsNil(): true
	//
	// [valkey.io]: https://valkey.io/commands/rpop/
	RPop(key string) (Result[string], error)

	// Removes and returns up to count elements from the list stored at key, depending on the list's length.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key   - The key of the list.
	//  count - The count of the elements to pop from the list.
	//
	// Return value:
	//  An array of popped elements as Result[string] will be returned depending on the list's length.
	//  If key does not exist, nil will be returned.
	//
	// For example:
	//  1. result, err := client.RPopCount("my_list", 2)
	//     result: []api.Result[string]{api.CreateStringResult("value1"), api.CreateStringResult("value2")}
	//  2. result, err := client.RPop("non_exiting_key")
	//     result: nil
	//
	// [valkey.io]: https://valkey.io/commands/rpop/
	RPopCount(key string, count int64) ([]Result[string], error)

	// Inserts element in the list at key either before or after the pivot.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key            - The key of the list.
	//  insertPosition - The relative position to insert into - either api.Before or api.After the pivot.
	//  pivot          - An element of the list.
	//  element        - The new element to insert.
	//
	// Return value:
	//  The list length after a successful insert operation.
	//  If the `key` doesn't exist returns `-1`.
	//  If the `pivot` wasn't found, returns `0`.
	//
	// For example:
	//  "my_list": {"Hello", "Wprld"}
	//  result, err := client.LInsert("my_list", api.Before, "World", "There")
	//  result: 3
	//
	// [valkey.io]: https://valkey.io/commands/linsert/
	LInsert(key string, insertPosition InsertPosition, pivot string, element string) (int64, error)

	// Pops an element from the head of the first list that is non-empty, with the given keys being checked in the order that
	// they are given.
	// Blocks the connection when there are no elements to pop from any of the given lists.
	//
	// Note:
	//  - When in cluster mode, all keys must map to the same hash slot.
	//  - BLPop is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys        - The keys of the lists to pop from.
	//  timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
	//
	// Return value:
	//  A two-element array of Result[string] containing the key from which the element was popped and the value of the popped
	//  element, formatted as [key, value].
	//  If no element could be popped and the timeout expired, returns nil.
	//
	// For example:
	//  result, err := client.BLPop("list1", "list2", 0.5)
	//  result: []api.Result[string]{api.CreateStringResult("list1"), api.CreateStringResult("element")}
	//
	// [valkey.io]: https://valkey.io/commands/blpop/
	// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BLPop(keys []string, timeoutSecs float64) ([]Result[string], error)

	// Pops an element from the tail of the first list that is non-empty, with the given keys being checked in the order that
	// they are given.
	// Blocks the connection when there are no elements to pop from any of the given lists.
	//
	// Note:
	//  - When in cluster mode, all keys must map to the same hash slot.
	//  - BRPop is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys        - The keys of the lists to pop from.
	//  timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
	//
	// Return value:
	//  A two-element array of Result[string] containing the key from which the element was popped and the value of the popped
	//  element, formatted as [key, value].
	//  If no element could be popped and the timeoutSecs expired, returns nil.
	//
	// For example:
	//  result, err := client.BRPop("list1", "list2", 0.5)
	//  result: []api.Result[string]{api.CreateStringResult("list1"), api.CreateStringResult("element")}
	//
	// [valkey.io]: https://valkey.io/commands/brpop/
	// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BRPop(keys []string, timeoutSecs float64) ([]Result[string], error)

	// Inserts all the specified values at the tail of the list stored at key, only if key exists and holds a list. If key is
	// not a list, this performs no operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the list.
	//  elements - The elements to insert at the tail of the list stored at key.
	//
	// Return value:
	//  The length of the list after the push operation.
	//
	// For example:
	//  my_list: {"value1", "value2"}
	//  result, err := client.RPushX("my_list", []string{"value3", value4})
	//  result: 4
	//
	// [valkey.io]: https://valkey.io/commands/rpushx/
	RPushX(key string, elements []string) (int64, error)

	// Inserts all the specified values at the head of the list stored at key, only if key exists and holds a list. If key is
	// not a list, this performs no operation.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the list.
	//  elements - The elements to insert at the head of the list stored at key.
	//
	// Return value:
	//  The length of the list after the push operation.
	//
	// For example:
	//  my_list: {"value1", "value2"}
	//  result, err := client.LPushX("my_list", []string{"value3", value4})
	//  result: 4
	//
	// [valkey.io]: https://valkey.io/commands/rpushx/
	LPushX(key string, elements []string) (int64, error)

	// Pops one element from the first non-empty list from the provided keys.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys          - An array of keys to lists.
	//  listDirection - The direction based on which elements are popped from - see [api.ListDirection].
	//
	// Return value:
	//  A map of key name mapped array of popped element.
	//
	// For example:
	//  result, err := client.LPush("my_list", []string{"one", "two", "three"})
	//  result, err := client.LMPop([]string{"my_list"}, api.Left)
	//  result[api.CreateStringResult("my_list")] = []api.Result[string]{api.CreateStringResult("three")}
	//
	// [valkey.io]: https://valkey.io/commands/lmpop/
	LMPop(keys []string, listDirection ListDirection) (map[Result[string]][]Result[string], error)

	// Pops one or more elements from the first non-empty list from the provided keys.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys          - An array of keys to lists.
	//  listDirection - The direction based on which elements are popped from - see [api.ListDirection].
	//  count         - The maximum number of popped elements.
	//
	// Return value:
	//  A map of key name mapped array of popped elements.
	//
	// For example:
	//  result, err := client.LPush("my_list", []string{"one", "two", "three"})
	//  result, err := client.LMPopCount([]string{"my_list"}, api.Left, int64(1))
	//  result[api.CreateStringResult("my_list")] = []api.Result[string]{api.CreateStringResult("three")}
	//
	// [valkey.io]: https://valkey.io/commands/lmpop/
	LMPopCount(keys []string, listDirection ListDirection, count int64) (map[Result[string]][]Result[string], error)

	// Blocks the connection until it pops one element from the first non-empty list from the provided keys. BLMPop is the
	// blocking variant of [api.LMPop].
	//
	// Note:
	//  - When in cluster mode, all keys must map to the same hash slot.
	//  - BLMPop is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys          - An array of keys to lists.
	//  listDirection - The direction based on which elements are popped from - see [api.ListDirection].
	//  timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of 0 will block
	//  indefinitely.
	//
	// Return value:
	//  A map of key name mapped array of popped element.
	//  If no member could be popped and the timeout expired, returns nil.
	//
	// For example:
	//  result, err := client.LPush("my_list", []string{"one", "two", "three"})
	//  result, err := client.BLMPop([]string{"my_list"}, api.Left, float64(0.1))
	//  result[api.CreateStringResult("my_list")] = []api.Result[string]{api.CreateStringResult("three")}
	//
	// [valkey.io]: https://valkey.io/commands/blmpop/
	// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BLMPop(keys []string, listDirection ListDirection, timeoutSecs float64) (map[Result[string]][]Result[string], error)

	// Blocks the connection until it pops one or more elements from the first non-empty list from the provided keys.
	// BLMPopCount is the blocking variant of [api.LMPopCount].
	//
	// Note:
	//  - When in cluster mode, all keys must map to the same hash slot.
	//  - BLMPopCount is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// Since:
	//  Valkey 7.0 and above.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  keys          - An array of keys to lists.
	//  listDirection - The direction based on which elements are popped from - see [api.ListDirection].
	//  count         - The maximum number of popped elements.
	//  timeoutSecs   - The number of seconds to wait for a blocking operation to complete. A value of 0 will block
	// indefinitely.
	//
	// Return value:
	//  A map of key name mapped array of popped element.
	//  If no member could be popped and the timeout expired, returns nil.
	//
	// For example:
	//  result, err: client.LPush("my_list", []string{"one", "two", "three"})
	//  result, err := client.BLMPopCount([]string{"my_list"}, api.Left, int64(1), float64(0.1))
	//  result[api.CreateStringResult("my_list")] = []api.Result[string]{api.CreateStringResult("three")}
	//
	// [valkey.io]: https://valkey.io/commands/blmpop/
	// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BLMPopCount(
		keys []string,
		listDirection ListDirection,
		count int64,
		timeoutSecs float64,
	) (map[Result[string]][]Result[string], error)

	// Sets the list element at index to element.
	// The index is zero-based, so 0 means the first element,1 the second element and so on. Negative indices can be used to
	// designate elements starting at the tail of the list. Here, -1 means the last element, -2 means the penultimate and so
	// forth.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key of the list.
	//  index   - The index of the element in the list to be set.
	//  element - The element to be set.
	//
	// Return value:
	//  `"OK"`.
	//
	// For example:
	//  result, err: client.LSet("my_list", int64(1), "two")
	//  result: "OK"
	//
	// [valkey.io]: https://valkey.io/commands/lset/
	LSet(key string, index int64, element string) (string, error)

	// Atomically pops and removes the left/right-most element to the list stored at source depending on whereFrom, and pushes
	// the element at the first/last element of the list stored at destination depending on whereTo.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  source      - The key to the source list.
	//  destination - The key to the destination list.
	//  wherefrom   - The ListDirection the element should be removed from.
	//  whereto     - The ListDirection the element should be added to.
	//
	// Return value:
	//  A Result[string] containing the popped element or api.CreateNilStringResult() if source does not exist.
	//
	// For example:
	//  result, err: client.LPush("my_list", []string{"two", "one"})
	//  result, err: client.LPush("my_list2", []string{"four", "three"})
	//  result, err: client.LMove("my_list1", "my_list2", api.Left, api.Left)
	//  result.Value(): "one"
	//  updatedList1, err: client.LRange("my_list1", int64(0), int64(-1))
	//  updatedList2, err: client.LRange("my_list2", int64(0), int64(-1))
	//  updatedList1: []api.Result[string]{api.CreateStringResult("two")}
	//  updatedList2: []api.Result[string]{api.CreateStringResult("one"), api.CreateStringResult("three"),
	//  api.CreateStringResult("four")}
	//
	// [valkey.io]: https://valkey.io/commands/lmove/
	LMove(source string, destination string, whereFrom ListDirection, whereTo ListDirection) (Result[string], error)

	// Blocks the connection until it pops atomically and removes the left/right-most element to the list stored at source
	// depending on whereFrom, and pushes the element at the first/last element of the list stored at <destination depending on
	// wherefrom.
	// BLMove is the blocking variant of [api.LMove].
	//
	// Note:
	//  - When in cluster mode, all source and destination must map to the same hash slot.
	//  - BLMove is a client blocking command, see [Blocking Commands] for more details and best practices.
	//
	// Since:
	//  Valkey 6.2.0 and above.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  source      - The key to the source list.
	//  destination - The key to the destination list.
	//  wherefrom   - The ListDirection the element should be removed from.
	//  whereto     - The ListDirection the element should be added to.
	//  timeoutSecs - The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely.
	//
	// Return value:
	// A Result[string] containing the popped element or api.CreateNilStringResult() if source does not exist or if the
	// operation timed-out.
	//
	// For example:
	//  result, err: client.LPush("my_list", []string{"two", "one"})
	//  result, err: client.LPush("my_list2", []string{"four", "three"})
	//  result, err: client.BLMove("my_list1", "my_list2", api.Left, api.Left, float64(0.1))
	//  result.Value(): "one"
	//  updatedList1, err: client.LRange("my_list1", int64(0), int64(-1))
	//  updatedList2, err: client.LRange("my_list2", int64(0), int64(-1))
	//  updatedList1: []api.Result[string]{api.CreateStringResult("two")}
	//  updatedList2: []api.Result[string]{api.CreateStringResult("one"), api.CreateStringResult("three"),
	//  api.CreateStringResult("four")}
	//
	// [valkey.io]: https://valkey.io/commands/blmove/
	// [Blocking Commands]: https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands
	BLMove(
		source string,
		destination string,
		whereFrom ListDirection,
		whereTo ListDirection,
		timeoutSecs float64,
	) (Result[string], error)
}
