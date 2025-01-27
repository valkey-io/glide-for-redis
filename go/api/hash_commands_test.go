package api

import (
	"fmt"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_HGet() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	payload, err := client.HGet("my_hash", "field1")
	payload2, err := client.HGet("my_hash", "nonexistent_field")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(payload)
	fmt.Println(payload2.IsNil())

	// Output:
	// 2
	// {someValue false}
	// true
}

func ExampleGlideClient_HGetAll() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	payload, err := client.HGetAll("my_hash")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(payload["field1"])
	fmt.Println(payload["field2"])
	fmt.Println(payload["notExistentField"]) // prints nothing

	// Output:
	// 2
	// someValue
	// someOtherValue
}

func ExampleGlideClient_HMGet() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	values, err := client.HMGet("my_hash", []string{"field1", "field2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(values[0])
	fmt.Println(values[1])

	// Output:
	// 2
	// {someValue false}
	// {someOtherValue false}
}

func ExampleGlideClient_HSet() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HGet("my_hash", "field1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// {someValue false}
}

func ExampleGlideClient_HSetNX() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HSetNX("my_hash", "field3", "value")
	payload, err := client.HGet("my_hash", "field3")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(payload)

	// Output:
	// 2
	// true
	// {value false}
}

func ExampleGlideClient_HDel() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HDel("my_hash", []string{"field1", "field2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 2
}

func ExampleGlideClient_HLen() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HLen("my_hash")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 2
}

func ExampleGlideClient_HVals() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HVals("my_hash")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// [someValue someOtherValue]
}

func ExampleGlideClient_HExists() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HExists("my_hash", "field1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// true
}

func ExampleGlideClient_HKeys() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HKeys("my_hash")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// [field1 field2]
}

func ExampleGlideClient_HStrLen() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HStrLen("my_hash", "field1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 9
}

func ExampleGlideClient_HIncrBy() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "10",
		"field2": "14",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HIncrBy("my_hash", "field1", 1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 11
}

func ExampleGlideClient_HIncrByFloat() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "10",
		"field2": "14",
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HIncrByFloat("my_hash", "field1", 1.5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 11.5
}

func ExampleGlideClient_HScan() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
	}

	result, err := client.HSet("my_hash", fields)
	resCursor, resCollection, err := client.HScan("my_hash", "0")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resCursor)
	fmt.Println(resCollection)

	// Output:
	// 2
	// 0
	// [field1 someValue field2 someOtherValue]
}

func ExampleGlideClient_HRandField() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		// other fields here...
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HRandField("my_hash")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// {field1 false}
}

func ExampleGlideClient_HRandFieldWithCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
		// other fields here...
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HRandFieldWithCount("my_hash", 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// [field1 field2]
}

func ExampleGlideClient_HRandFieldWithCountWithValues() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"field1": "someValue",
		"field2": "someOtherValue",
		// other fields here...
	}

	result, err := client.HSet("my_hash", fields)
	result1, err := client.HRandFieldWithCountWithValues("my_hash", 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// [[field1 someValue] [field2 someOtherValue]]
}

func ExampleGlideClient_HScanWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	fields := map[string]string{
		"a": "1",
		"b": "2",
	}

	result, err := client.HSet("my_hash", fields)
	opts := options.NewHashScanOptionsBuilder().SetMatch("a")
	resCursor, resCollection, err := client.HScanWithOptions("my_hash", "0", opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resCursor)
	fmt.Println(
		resCollection,
	) // The resCollection only contains the hash map entry that matches with the match option provided with the command

	// Output:
	// 2
	// 0
	// [a 1]
}
