// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// Supports commands and transactions for the "HyperLogLog" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#hyperloglog
type HyperLogLogCommands interface {
	// PfAdd adds all elements to the HyperLogLog data structure stored at the specified key.
	// Creates a new structure if the key does not exist.
	// When no elements are provided, and key exists and is a HyperLogLog, then no operation is performed.
	// If key does not exist, then the HyperLogLog structure is created.
	//
	// Parameters:
	//  key - The key of the HyperLogLog data structure to add elements into.
	//  elements - An array of members to add to the HyperLogLog stored at key.
	//
	// Return value:
	//  If the HyperLogLog is newly created, or if the HyperLogLog approximated cardinality is
	//  altered, then returns `1`. Otherwise, returns `0`.
	//
	// Example:
	//  result, err := client.PfAdd("key",[]string{"value1", "value2", "value3"})
	//  result: 1
	//
	// [valkey.io]: https://valkey.io/commands/pfadd/
	PfAdd(key string, elements []string) (int64, error)

	// Estimates the cardinality of the data stored in a HyperLogLog structure for a single key or
	// calculates the combined cardinality of multiple keys by merging their HyperLogLogs temporarily.
	//
	// Note:
	//  In cluster mode, if keys in `keyValueMap` map to different hash slots, the command
	//  will be split across these slots and executed separately for each. This means the command
	//  is atomic only at the slot level. If one or more slot-specific requests fail, the entire
	//  call will return the first encountered error, even though some requests may have succeeded
	//  while others did not. If this behavior impacts your application logic, consider splitting
	//  the request into sub-requests per slot to ensure atomicity.
	//
	// Parameters:
	//  key - The keys of the HyperLogLog data structures to be analyzed.
	//
	// Return value:
	//  The approximated cardinality of given HyperLogLog data structures.
	//  The cardinality of a key that does not exist is `0`.
	//
	// Example:
	//  result, err := client.PfCount([]string{"key1","key2"})
	//  result: 5
	//
	// [valkey.io]: https://valkey.io/commands/pfcount/
	PfCount(keys []string) (int64, error)
}
