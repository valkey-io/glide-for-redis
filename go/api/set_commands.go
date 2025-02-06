// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

import "github.com/valkey-io/valkey-glide/go/glide/api/options"

// Supports commands and transactions for the "Set" group of commands for standalone and cluster clients.
//
// See [valkey.io] for details.
//
// [valkey.io]: https://valkey.io/commands/#set
type SetCommands interface {
	SAdd(key string, members []string) (int64, error)

	SRem(key string, members []string) (int64, error)

	SMembers(key string) (map[string]struct{}, error)

	SCard(key string) (int64, error)

	SIsMember(key string, member string) (bool, error)

	SDiff(keys []string) (map[string]struct{}, error)

	SDiffStore(destination string, keys []string) (int64, error)

	SInter(keys []string) (map[string]struct{}, error)

	SInterStore(destination string, keys []string) (int64, error)

	SInterCard(keys []string) (int64, error)

	SInterCardLimit(keys []string, limit int64) (int64, error)

	SRandMember(key string) (Result[string], error)

	SPop(key string) (Result[string], error)

	SMIsMember(key string, members []string) ([]bool, error)

	SUnionStore(destination string, keys []string) (int64, error)

	SUnion(keys []string) (map[string]struct{}, error)

	SScan(key string, cursor string) (string, []string, error)

	SScanWithOptions(key string, cursor string, options *options.BaseScanOptions) (string, []string, error)

	SMove(source string, destination string, member string) (bool, error)
}
