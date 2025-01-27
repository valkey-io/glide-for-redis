package api

import (
	"fmt"

	"github.com/google/uuid"
)

func ExampleGlideClient_PfAdd() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.PfAdd(uuid.New().String(), []string{"value1", "value2", "value3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 1
}

func ExampleGlideClient_PfCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := uuid.New().String()
	result, err := client.PfAdd(key, []string{"value1", "value2", "value3"})
	result1, err := client.PfCount([]string{key})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 1
	// 3
}
