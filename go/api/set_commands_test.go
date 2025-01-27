package api

import (
	"fmt"
)

func ExampleGlideClient_SAdd() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.SAdd("my_set", []string{"member1", "member2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_SRem() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.SRem("my_set", []string{"member1", "member2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}
