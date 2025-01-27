package api

import (
	"fmt"
)

func ExampleGlideClient_Set() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.Set("my_key", "my_value")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: OK
}

func ExampleGlideClient_SetWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	options := NewSetOptionsBuilder().
		SetExpiry(NewExpiryBuilder().
			SetType(Seconds).
			SetCount(uint64(5)))
	result, err := client.SetWithOptions("my_key", "my_value", options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())

	// Output: OK
}
