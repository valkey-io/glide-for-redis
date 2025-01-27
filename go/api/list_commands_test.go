package api

import (
	"fmt"
)

func ExampleGlideClient_LPush() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"value1", "value2"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 2
}

func ExampleGlideClient_LPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"value1", "value2"})
	result1, err := client.LPop("my_list")
	result2, err := client.LPop("non_existent")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2.IsNil())

	// Output:
	// 2
	// {value2 false}
	// true
}

func ExampleGlideClient_LPopCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"value1", "value2"})
	result1, err := client.LPopCount("my_list", 2)
	result2, err := client.LPop("non_existent")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2.IsNil())

	// Output:
	// 2
	// [value2 value1]
	// true
}

func ExampleGlideClient_LPos() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e"})
	result1, err := client.LPos("my_list", "e")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 6
	// {4 false}
}

func ExampleGlideClient_LPosWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e"})
	result1, err := client.LPosWithOptions(
		"my_list",
		"e",
		NewLPosOptionsBuilder().SetRank(2),
	) // (Returns the second occurrence of the element "e")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 6
	// {5 false}
}

func ExampleGlideClient_LPosCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LPosCount("my_list", "e", 3)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 7
	// [4 5 6]
}

func ExampleGlideClient_LPosCountWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LPosCountWithOptions("my_list", "e", 1, NewLPosOptionsBuilder().SetRank(2))
	result2, err := client.LPosCountWithOptions("my_list", "e", 3,
		NewLPosOptionsBuilder().SetRank(2).SetMaxLen(1000))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 7
	// [5]
	// [5 6]
}

func ExampleGlideClient_RPush() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// 7
}

func ExampleGlideClient_LRange() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LRange("my_list", 0, 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 7
	// [a b c]
}

func ExampleGlideClient_LIndex() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LIndex("my_list", 3)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 7
	// {d false}
}

func ExampleGlideClient_LTrim() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LTrim("my_list", 0, 4)
	result2, err := client.LRange("my_list", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 7
	// OK
	// [a b c d e]
}

func ExampleGlideClient_LLen() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LLen("my_list")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 7
	// 7
}

func ExampleGlideClient_LRem() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.LRem("my_list", 2, "e")
	result2, err := client.LRange("my_list", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 7
	// 2
	// [a b c d e]
}

func ExampleGlideClient_RPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.RPop("my_list")
	result2, err := client.RPop("non_existing_key")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2.IsNil())

	// Output:
	// 7
	// {e false}
	// true
}

func ExampleGlideClient_RPopCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"a", "b", "c", "d", "e", "e", "e"})
	result1, err := client.RPopCount("my_list", 4)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 7
	// [e e e d]
}

func ExampleGlideClient_LInsert() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	client.Del([]string{"my_list"})
	result, err := client.RPush("my_list", []string{"hello", "world"})
	result1, err := client.LInsert("my_list", Before, "world", "there")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 2
	// 3
}

func ExampleGlideClient_BLPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("list_a", []string{"a", "b", "c", "d", "e"})
	result1, err := client.RPush("list_b", []string{"f", "g", "h", "i", "j"})
	result2, err := client.BLPop([]string{"list_a", "list_b"}, 0.5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 5
	// 5
	// [list_a a]
}

func ExampleGlideClient_BRPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	client.Del([]string{"my_list", "list_a", "list_b"})
	result, err := client.RPush("list_a", []string{"a", "b", "c", "d", "e"})
	result1, err := client.RPush("list_b", []string{"f", "g", "h", "i", "j"})
	result2, err := client.BRPop([]string{"list_a", "list_b"}, 0.5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 5
	// 5
	// [list_a e]
}

func ExampleGlideClient_RPushX() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"value1"})
	result1, err := client.RPushX("my_list", []string{"value2", "value3"})
	result2, err := client.LRange("my_list", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 1
	// 3
	// [value1 value2 value3]
}

func ExampleGlideClient_LPushX() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.RPush("my_list", []string{"value1"})
	result1, err := client.LPushX("my_list", []string{"value2", "value3"})
	result2, err := client.LRange("my_list", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 1
	// 3
	// [value3 value2 value1]
}

func ExampleGlideClient_LMPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"one", "two", "three"})
	result1, err := client.LMPop([]string{"my_list"}, Left)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[my_list:[three]]
}

func ExampleGlideClient_LMPopCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"one", "two", "three"})
	result1, err := client.LMPopCount([]string{"my_list"}, Left, 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[my_list:[three two]]
}

func ExampleGlideClient_BLMPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"one", "two", "three"})
	result1, err := client.BLMPop([]string{"my_list"}, Left, 0.1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[my_list:[three]]
}

func ExampleGlideClient_BLMPopCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list", []string{"one", "two", "three"})
	result1, err := client.BLMPopCount([]string{"my_list"}, Left, 2, 0.1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[my_list:[three two]]
}

func ExampleGlideClient_LSet() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	client.Del([]string{"my_list", "list_a", "list_b"})
	result, err := client.LPush("my_list", []string{"one", "two", "three"})
	result1, err := client.LSet("my_list", 1, "someOtherValue")
	result2, err := client.LRange("my_list", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 3
	// OK
	// [three someOtherValue one]
}

func ExampleGlideClient_LMove() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list1", []string{"two", "one"})
	result1, err := client.LPush("my_list2", []string{"four", "three"})
	result2, err := client.LMove("my_list1", "my_list2", Left, Left)
	result3, err := client.LRange("my_list1", 0, -1)
	result4, err := client.LRange("my_list2", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)
	fmt.Println(result3)
	fmt.Println(result4)

	// Output:
	// 2
	// 2
	// {one false}
	// [two]
	// [one three four]
}

func ExampleGlideClient_BLMove() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("my_list1", []string{"two", "one"})
	result1, err := client.LPush("my_list2", []string{"four", "three"})
	result2, err := client.BLMove("my_list1", "my_list2", Left, Left, 0.1)
	result3, err := client.LRange("my_list1", 0, -1)
	result4, err := client.LRange("my_list2", 0, -1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)
	fmt.Println(result3)
	fmt.Println(result4)

	// Output:
	// 2
	// 2
	// {one false}
	// [two]
	// [one three four]
}
