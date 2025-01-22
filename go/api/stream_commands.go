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

	XAutoClaim(key string, group string, consumer string, minIdleTime int64, start string) (XAutoClaimResponse, error)

	XAutoClaimWithOptions(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		start string,
		options *options.XAutoClaimOptions,
	) (XAutoClaimResponse, error)

	XAutoClaimJustId(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		start string,
	) (XAutoClaimJustIdResponse, error)

	XAutoClaimJustIdWithOptions(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		start string,
		options *options.XAutoClaimOptions,
	) (XAutoClaimJustIdResponse, error)

	XReadGroup(group string, consumer string, keysAndIds map[string]string) (map[string]map[string][][]string, error)

	XReadGroupWithOptions(
		group string,
		consumer string,
		keysAndIds map[string]string,
		options *options.XReadGroupOptions,
	) (map[string]map[string][][]string, error)

	XRead(keysAndIds map[string]string) (map[string]map[string][][]string, error)

	XReadWithOptions(keysAndIds map[string]string, options *options.XReadOptions) (map[string]map[string][][]string, error)

	XDel(key string, ids []string) (int64, error)

	XPending(key string, group string) (XPendingSummary, error)

	XPendingWithOptions(key string, group string, options *options.XPendingOptions) ([]XPendingDetail, error)

	XGroupSetId(key string, group string, id string) (string, error)

	XGroupSetIdWithOptions(key string, group string, id string, opts *options.XGroupSetIdOptions) (string, error)

	XGroupCreate(key string, group string, id string) (string, error)

	XGroupCreateWithOptions(key string, group string, id string, opts *options.XGroupCreateOptions) (string, error)

	XGroupDestroy(key string, group string) (bool, error)

	XGroupCreateConsumer(key string, group string, consumer string) (bool, error)

	XGroupDelConsumer(key string, group string, consumer string) (int64, error)

	XAck(key string, group string, ids []string) (int64, error)

	XClaim(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		ids []string,
	) (map[string][][]string, error)

	XClaimWithOptions(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		ids []string,
		options *options.StreamClaimOptions,
	) (map[string][][]string, error)

	XClaimJustId(key string, group string, consumer string, minIdleTime int64, ids []string) ([]string, error)

	XClaimJustIdWithOptions(
		key string,
		group string,
		consumer string,
		minIdleTime int64,
		ids []string,
		options *options.StreamClaimOptions,
	) ([]string, error)
}
