// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Stream" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#stream
type StreamCommands interface {
	// Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the stream.
	//  values   - Field-value pairs to be added to the entry.
	//
	// Return value:
	//  The id of the added entry.
	//
	// For example:
	//  result, err := client.XAdd("myStream", [][]string{{"field1", "value1"}, {"field2", "value2"}})
	//  result.IsNil(): false
	//  result.Value(): "1526919030474-55"
	//
	// [valkey.io]: https://valkey.io/commands/xadd/
	XAdd(key string, values [][]string) (Result[string], error)

	// Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key      - The key of the stream.
	//  values   - Field-value pairs to be added to the entry.
	//  options  - Stream add options.
	//
	// Return value:
	//  The id of the added entry.
	//
	// For example:
	//  options := options.NewXAddOptions().SetId("100-500").SetDontMakeNewStream()
	//  result, err := client.XAddWithOptions("myStream", [][]string{{"field1", "value1"}, {"field2", "value2"}}, options)
	//  result.IsNil(): false
	//  result.Value(): "100-500"
	//
	// [valkey.io]: https://valkey.io/commands/xadd/
	XAddWithOptions(key string, values [][]string, options *options.XAddOptions) (Result[string], error)

	// Trims the stream by evicting older entries.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key     - The key of the stream.
	//  options - Stream trim options
	//
	// Return value:
	//  The number of entries deleted from the stream.
	//
	// For example:
	//  xAddResult, err = client.XAddWithOptions(
	//		"key1",
	//		[][]string{{field1, "foo4"}, {field2, "bar4"}},
	//		options.NewXAddOptions().SetTrimOptions(
	//			options.NewXTrimOptionsWithMinId(id).SetExactTrimming(),
	//		),
	//	)
	//	xTrimResult, err := client.XTrim(
	//		"key1",
	//		options.NewXTrimOptionsWithMaxLen(1).SetExactTrimming(),
	//  )
	//  fmt.Println(xTrimResult) // Output: 1
	//
	// [valkey.io]: https://valkey.io/commands/xtrim/
	XTrim(key string, options *options.XTrimOptions) (int64, error)

	// Returns the number of entries in the stream stored at `key`.
	//
	// See [valkey.io] for details.
	//
	// Parameters:
	//  key - The key of the stream.
	//
	// Return value:
	//  The number of entries in the stream. If `key` does not exist, return 0.
	//
	// For example:
	//	xAddResult, err = client.XAddWithOptions(
	//		"key1",
	//		[][]string{{field1, "foo4"}, {field2, "bar4"}},
	//		options.NewXAddOptions().SetTrimOptions(
	//			options.NewXTrimOptionsWithMinId(id).SetExactTrimming(),
	//		),
	//	)
	//	xLenResult, err = client.XLen("key1")
	//  fmt.Println(xLenResult) // Output: 2
	//
	// [valkey.io]: https://valkey.io/commands/xlen/
	XLen(key string) (int64, error)

	XRead(keysAndIds map[string]string) (map[string]map[string][][]string, error)

	XReadWithOptions(keysAndIds map[string]string, options *options.XReadOptions) (map[string]map[string][][]string, error)

	XDel(key string, ids []string) (int64, error)
}
