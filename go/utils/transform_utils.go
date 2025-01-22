// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package utils

import (
	"strconv"
	"unsafe"
)

// Convert `s` of type `string` into `[]byte`
func StringToBytes(s string) []byte {
	p := unsafe.StringData(s)
	b := unsafe.Slice(p, len(s))
	return b
}

func IntToString(value int64) string {
	return strconv.FormatInt(value, 10 /*base*/)
}

func FloatToString(value float64) string {
	return strconv.FormatFloat(value, 'g', -1 /*precision*/, 64 /*bit*/)
}

// ConvertMapToKeyValueStringArray converts a map of string keys and values to a slice of the initial key followed by the
// key-value pairs.
func ConvertMapToKeyValueStringArray(key string, args map[string]string) []string {
	// Preallocate the slice with space for the initial key and twice the number of map entries (each entry has a key and a
	// value).
	values := make([]string, 1, 1+2*len(args))

	// Set the first element of the slice to the provided key.
	values[0] = key

	// Loop over each key-value pair in the map and append them to the slice.
	for k, v := range args {
		// Append the key and value directly to the slice.
		values = append(values, k, v)
	}

	return values
}

// Flattens the Map: { (key1, value1), (key2, value2), ..} to a slice { key1, value1, key2, value2, ..}
func MapToString(parameter map[string]string) []string {
	flat := make([]string, 0, len(parameter)*2)
	for key, value := range parameter {
		flat = append(flat, key, value)
	}
	return flat
}

// Flattens a map[string, V] to a value-key string array like { value1, key1, value2, key2..}
func ConvertMapToValueKeyStringArray[V any](args map[string]V) []string {
	result := make([]string, 0, len(args)*2)
	for key, value := range args {
		// Convert the value to a string after type checking
		switch v := any(value).(type) {
		case string:
			result = append(result, v)
		case int64:
			result = append(result, strconv.FormatInt(v, 10))
		case float64:
			result = append(result, strconv.FormatFloat(v, 'f', -1, 64))
		}
		// Append the key
		result = append(result, key)
	}
	return result
}

// Concat concatenates multiple slices of strings into a single slice.
func Concat(slices ...[]string) []string {
	size := 0
	for _, s := range slices {
		size += len(s)
	}

	newSlice := make([]string, 0, size)
	for _, s := range slices {
		newSlice = append(newSlice, s...)
	}

	return newSlice
}
