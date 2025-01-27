package api

import (
	"fmt"
)

func ExampleGlideClient_Ping() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Ping()
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: PONG
}

func ExampleGlideClient_PingWithMessage() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.PingWithMessage("Hello")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: Hello
}

func ExampleGlideClient_Echo() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Echo("Hello World")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: {Hello World false}
}
