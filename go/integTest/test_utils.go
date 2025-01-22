// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package integTest

// check if sliceA is a subset of sliceB
func isSubset[T comparable](sliceA []T, sliceB []T) bool {
	setB := make(map[T]struct{})
	for _, v := range sliceB {
		setB[v] = struct{}{}
	}
	for _, v := range sliceA {
		if _, found := setB[v]; !found {
			return false
		}
	}
	return true
}

func convertMapKeysAndValuesToLists(m map[string]string) ([]string, []string) {
	keys := make([]string, 0)
	values := make([]string, 0)
	for key, value := range m {
		keys = append(keys, key)
		values = append(values, value)
	}
	return keys, values
}
