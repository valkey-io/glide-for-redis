// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

import "github.com/valkey-io/valkey-glide/go/glide/api"

// check if sliceA is a subset of sliceB
func isSubset(sliceA []api.Result[string], sliceB []api.Result[string]) bool {
	setB := make(map[string]struct{})
	for _, v := range sliceB {
		setB[v.Value()] = struct{}{}
	}
	for _, v := range sliceA {
		if _, found := setB[v.Value()]; !found {
			return false
		}
	}
	return true
}

func convertMapKeysAndValuesToResultList(m map[string]string) ([]api.Result[string], []api.Result[string]) {
	keys := make([]api.Result[string], 0)
	values := make([]api.Result[string], 0)
	for key, value := range m {
		keys = append(keys, api.CreateStringResult(key))
		values = append(values, api.CreateStringResult(value))
	}
	return keys, values
}
