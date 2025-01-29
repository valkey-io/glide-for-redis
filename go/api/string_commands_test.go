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

func ExampleGlideClient_Get_keyexists() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	result, err := client.Get("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())

	// Output: my_value
}

func ExampleGlideClient_Get_keynotexists() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.Get("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.IsNil()) // missing key returns nil result

	// Output: true
}

func ExampleGlideClient_GetEx() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	result, err := client.GetEx("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())
	ttl, _ := client.TTL("my_key")
	fmt.Println(ttl)

	// Output:
	// my_value
	// -1
}

func ExampleGlideClient_GetExWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	options := NewGetExOptionsBuilder().
		SetExpiry(NewExpiryBuilder().
			SetType(Seconds).
			SetCount(uint64(5)))
	result, err := client.GetExWithOptions("my_key", options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())
	ttl, _ := client.TTL("my_key")
	fmt.Println(ttl)

	// Output:
	// my_value
	// 5
}

func ExampleGlideClient_MSet() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	keyValueMap := map[string]string{
		"key1": "value1",
		"key2": "value2",
	}
	result, err := client.MSet(keyValueMap)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: OK
}

func ExampleGlideClient_MGet() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.MSet(map[string]string{"my_key1": "my_value1", "my_key2": "my_value2", "my_key3": "my_value3"})
	keys := []string{"my_key1", "my_key2", "my_key3"}
	result, err := client.MGet(keys)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	for _, res := range result {
		fmt.Println(res.Value())
	}

	// Output:
	// my_value1
	// my_value2
	// my_value3
}

func ExampleGlideClient_MSetNX() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	keyValueMap := map[string]string{"my_key1": "my_value1", "my_key2": "my_value2"}
	result, err := client.MSetNX(keyValueMap)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	client.Set("my_key3", "my_value3")
	result, _ = client.MSetNX(map[string]string{"my_key3": "my_value3"})
	fmt.Println(result)

	// Output:
	// true
	// false
}

func ExampleGlideClient_Incr() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "1")
	result, err := client.Incr("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_IncrBy() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "5")
	result, err := client.IncrBy("my_key", 5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 10
}

func ExampleGlideClient_IncrByFloat() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "1")
	result, err := client.IncrByFloat("my_key", 5.5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 6.5
}

func ExampleGlideClient_Decr() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "0")
	result, err := client.Decr("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: -1
}

func ExampleGlideClient_DecrBy() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "20")
	result, err := client.DecrBy("my_key", 5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 15
}

func ExampleGlideClient_Strlen() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	result, err := client.Strlen("my_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 8
}

func ExampleGlideClient_SetRange_one() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	result, err := client.SetRange("my_key", 3, "example")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	value, _ := client.Get("my_key")
	fmt.Println(value.Value())

	// Output:
	// 10
	// my_example
}

func ExampleGlideClient_SetRange_two() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "愛") // "愛" is a single character in UTF-8, but 3 bytes long
	result, err := client.SetRange("my_key", 1, "a")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 3
}

func ExampleGlideClient_GetRange_one() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "Welcome to Valkey Glide!")
	result, err := client.GetRange("my_key", 0, 7)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: Welcome
}

func ExampleGlideClient_GetRange_two() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "愛")
	fmt.Println([]byte("愛")) // "愛" is a single character in UTF-8, but 3 bytes long
	result, err := client.GetRange("my_key", 0, 1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println([]byte(result))

	// Output:
	// [230 132 155]
	// [230 132]
}

func ExampleGlideClient_Append() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_valu")
	result, err := client.Append("my_key", "e")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	value, _ := client.Get("my_key")
	fmt.Println(value.Value())

	// Output:
	// 8
	// my_value
}

func ExampleGlideClient_LCS() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.MSet(map[string]string{"my_key1": "oh my gosh", "my_key2": "hello world"})
	result, err := client.LCS("my_key1", "my_key2")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: h o
}

func ExampleGlideClient_GetDel() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.Set("my_key", "my_value")
	result, err := client.GetDel("my_key") // return value and delete key
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())
	value, _ := client.Get("my_key") // key should be missing
	fmt.Println(value.IsNil())

	// Output:
	// my_value
	// true
}
