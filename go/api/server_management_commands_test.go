package api

import (
	"fmt"
)

func ExampleGlideClient_Select() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Select(2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: OK
}

func ExampleGlideClient_ConfigGet() {
	var client *GlideClient = getExampleGlideClient()                          // example helper function
	client.ConfigSet(map[string]string{"timeout": "1000", "maxmemory": "1GB"}) // example configuration
	result, err := client.ConfigGet([]string{"timeout", "maxmemory"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// map[maxmemory:1073741824 timeout:1000]
}

func ExampleGlideClient_ConfigSet() {
	var client *GlideClient = getExampleGlideClient()                                         // example helper function
	result, err := client.ConfigSet(map[string]string{"timeout": "1000", "maxmemory": "1GB"}) // example configuration
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// OK
}

func ExampleGlideClient_DBSize() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	// Assume flushed client, so no keys are currently stored
	client.Set("key", "val")
	result, err := client.DBSize()
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// 1
}
