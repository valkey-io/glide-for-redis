package api

import (
	"fmt"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_SAdd() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	result, err := client.SAdd(key, []string{"member1", "member2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_SRem() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	result, err := client.SRem(key, []string{"member1", "member2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_SMembers() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	client.SAdd(key, []string{"member1", "member2"})

	result, err := client.SMembers(key)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: map[member1:{} member2:{}]
}

func ExampleGlideClient_SCard() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	client.SAdd(key, []string{"member1", "member2"})

	result, err := client.SCard(key)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 2
}

func ExampleGlideClient_SIsMember() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	client.SAdd(key, []string{"member1", "member2"})

	result, err := client.SIsMember(key, "member1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: true
}

func ExampleGlideClient_SDiff() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2"})

	result, err := client.SDiff([]string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: map[member1:{}]
}

func ExampleGlideClient_SDiffStore() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"
	destination := "my_set_diff"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2"})

	result, err := client.SDiffStore(destination, []string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 1
}

func ExampleGlideClient_SInter() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2"})

	result, err := client.SInter([]string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: map[member2:{}]
}

func ExampleGlideClient_SInterStore() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"
	destination := "my_set_inter"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2"})

	result, err := client.SInterStore(destination, []string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 1
}

func ExampleGlideClient_SInterCard() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2"})

	result, err := client.SInterCard([]string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 1
}

func ExampleGlideClient_SInterCardLimit() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"
	limit := int64(1)

	client.SAdd(key1, []string{"member1", "member2", "member3"})
	client.SAdd(key2, []string{"member2", "member3"})

	result, err := client.SInterCardLimit([]string{key1, key2}, limit)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 1
}

func ExampleGlideClient_SRandMember() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	client.SAdd(key, []string{"member1", "member2"})

	result, err := client.SRandMember(key)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.IsNil()) // Unable to test for a random value so just check if it is not nil

	// Output: false
}

func ExampleGlideClient_SPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	client.SAdd(key, []string{"member1", "member2"})

	result, err := client.SPop(key)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.IsNil())
	// Output: false
}

func ExampleGlideClient_SMIsMember() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"

	members := []string{"member1", "member2"}
	client.SAdd(key, members)

	memberTest := []string{"member1", "member2", "member3"}
	result, err := client.SMIsMember(key, memberTest)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: [true true false]
}

func ExampleGlideClient_SUnionStore() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"
	destination := "my_set_union"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2", "member3"})

	result, err := client.SUnionStore(destination, []string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: 3
}

func ExampleGlideClient_SUnion() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key1 := "my_set_1"
	key2 := "my_set_2"

	client.SAdd(key1, []string{"member1", "member2"})
	client.SAdd(key2, []string{"member2", "member3"})

	result, err := client.SUnion([]string{key1, key2})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: map[member1:{} member2:{} member3:{}]
}

func ExampleGlideClient_SScan() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"
	client.SAdd(key, []string{"member1", "member2"})
	cursor := "0"
	result, nextCursor, err := client.SScan(key, cursor)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result, nextCursor)
	// Output: 0 [member1 member2]
}

func ExampleGlideClient_SScanWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "my_set"
	client.SAdd(key, []string{"member1", "member2", "item3"})
	cursor := "0"
	options := options.NewBaseScanOptionsBuilder().SetMatch("mem*")
	result, nextCursor, err := client.SScanWithOptions(key, cursor, options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result, nextCursor)
	// Output: 0 [member1 member2]
}

func ExampleGlideClient_SMove() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	source := "my_set_1"
	destination := "my_set_2"
	member := "member1"

	client.SAdd(source, []string{member})

	result, err := client.SMove(source, destination, member)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	// Output: true
}
