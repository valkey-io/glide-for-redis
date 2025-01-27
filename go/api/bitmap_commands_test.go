package api

import (
	"fmt"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_SetBit() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.SetBit("my_key", 1, 1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 1
}

func ExampleGlideClient_GetBit() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.GetBit("my_key", 1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 1
}

func ExampleGlideClient_BitCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.BitCount("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_BitCountWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	options := options.NewBitCountOptionsBuilder().
		SetStart(1).
		SetEnd(1).
		SetBitmapIndexType(options.BYTE)
	result, err := client.BitCountWithOptions("my_key", options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 0
}
