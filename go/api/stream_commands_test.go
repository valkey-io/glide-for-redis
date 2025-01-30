package api

import (
	"fmt"
	"regexp"

	"github.com/google/uuid"
	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_XAdd() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.XAdd("mystream", [][]string{
		{"key1", "value1"},
		{"key2", "value2"},
	})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	matches, _ := regexp.Match(`^\d{13}-0$`, []byte(result.Value())) // matches a number that is 13 digits long followed by "-0"
	fmt.Println(matches)

	// Output: true

}

func ExampleGlideClient_XAddWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	options := options.NewXAddOptions().
		SetId("1000-50")
	values := [][]string{
		{"key1", "value1"},
		{"key2", "value2"},
	}
	result, err := client.XAddWithOptions("mystream", values, options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result.Value())

	// Output: 1000-50
}

func ExampleGlideClient_XTrim() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.XAdd("mystream", [][]string{{"field1", "foo4"}, {"field2", "bar4"}})
	client.XAdd("mystream", [][]string{{"field3", "foo4"}, {"field4", "bar4"}})

	count, err := client.XTrim("mystream", options.NewXTrimOptionsWithMaxLen(0).SetExactTrimming())
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(count)

	// Output: 1
}

func ExampleGlideClient_XLen() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.XAdd("mystream", [][]string{{"field1", "foo4"}, {"field2", "bar4"}})
	count, err := client.XLen("mystream")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(count)

	// Output: 1
}

func ExampleGlideClient_XAutoClaim() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := uuid.NewString()
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId("0-1"),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"entry2_field1", "entry2_value1"}},
		options.NewXAddOptions().SetId("0-2"),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	response, err := client.XAutoClaim(key, group, consumer, 0, "0-1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: {0-0 map[0-1:[[entry1_field1 entry1_value1] [entry1_field2 entry1_value2]] 0-2:[[entry2_field1 entry2_value1]]] []}
}

func ExampleGlideClient_XAutoClaimWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := uuid.NewString()
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId("0-1"),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"entry2_field1", "entry2_value1"}},
		options.NewXAddOptions().SetId("0-2"),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	options := options.NewXAutoClaimOptionsWithCount(1)
	response, err := client.XAutoClaimWithOptions(key, group, consumer, 0, "0-1", options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: {0-2 map[0-1:[[entry1_field1 entry1_value1] [entry1_field2 entry1_value2]]] []}
}

func ExampleGlideClient_XAutoClaimJustId() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := uuid.NewString()
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId("0-1"),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"entry2_field1", "entry2_value1"}},
		options.NewXAddOptions().SetId("0-2"),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	response, err := client.XAutoClaimJustId(key, group, consumer, 0, "0-0")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: {0-0 [0-1 0-2] []}
}

func ExampleGlideClient_XAutoClaimJustIdWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := uuid.NewString()
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId("0-1"),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"entry2_field1", "entry2_value1"}},
		options.NewXAddOptions().SetId("0-2"),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	options := options.NewXAutoClaimOptionsWithCount(1)
	response, err := client.XAutoClaimJustIdWithOptions(key, group, consumer, 0, "0-1", options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: {0-2 [0-1] []}
}

func ExampleGlideClient_XReadGroup() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)

	response, err := client.XReadGroup(group, consumer, map[string]string{key: ">"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: map[12345:map[]]
}

func ExampleGlideClient_XReadGroupWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := uuid.NewString()
	consumer := uuid.NewString()

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)

	options := options.NewXReadGroupOptions().SetNoAck()
	response, err := client.XReadGroupWithOptions(group, consumer, map[string]string{key: ">"}, options)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: map[12345:map[12345-1:[[entry1_field1 entry1_value1] [entry1_field2 entry1_value2]]]]
}

func ExampleGlideClient_XRead() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"

	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId(streamId),
	)

	response, err := client.XRead(map[string]string{key: "0-0"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: map[12345:map[12345-1:[[field1 value1] [field2 value2]]]]
}

func ExampleGlideClient_XReadWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streambase := 1

	genStreamId := func(key string, base int, offset int) string { return fmt.Sprintf("%s-%d", key, base+offset) } // helper function to generate stream ids

	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId(genStreamId(key, streambase, 0)),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"field3", "value3"}, {"field4", "value4"}},
		options.NewXAddOptions().SetId(genStreamId(key, streambase, 1)),
	)

	response, err := client.XReadWithOptions(map[string]string{key: genStreamId(key, streambase, 0)}, options.NewXReadOptions().SetCount(1))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: map[12345:map[12345-1:[[field1 value1] [field2 value2]]]]
}

func ExampleGlideClient_XDel() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"

	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId("0-1"),
	)

	count, err := client.XDel(key, []string{"0-1", "0-2", "0-3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(count)

	// Output: 1
}

// func ExampleGlideClient_XPending() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XPending("mystream", "mygroup")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: {0 0 0 []}
// }

// func ExampleGlideClient_XPendingWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewXPendingOptions().
// 		SetCount(100)
// 	response, err := client.XPendingWithOptions("mystream", "mygroup", options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: []
// }

// func ExampleGlideClient_XGroupSetId() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XGroupSetId("mystream", "mygroup", "0")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: 0
// }

// func ExampleGlideClient_XGroupSetIdWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewXGroupSetIdOptions().
// 		SetNoAck(true)
// 	response, err := client.XGroupSetIdWithOptions("mystream", "mygroup", "0", options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: 0
// }

// func ExampleGlideClient_XGroupCreate() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XGroupCreate("mystream", "mygroup", "0")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: 0
// }

// func ExampleGlideClient_XGroupCreateWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewXGroupCreateOptions().
// 		SetNoAck(true)
// 	response, err := client.XGroupCreateWithOptions("mystream", "mygroup", "0", options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: 0
// }

// func ExampleGlideClient_XGroupDestroy() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XGroupDestroy("mystream", "mygroup")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: true
// }

// func ExampleGlideClient_XGroupCreateConsumer() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XGroupCreateConsumer("mystream", "mygroup", "myconsumer")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: true
// }

// func ExampleGlideClient_XGroupDelConsumer() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	count, err := client.XGroupDelConsumer("mystream", "mygroup", "myconsumer")
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(count)

// 	// Output: 1
// }

// func ExampleGlideClient_XAck() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	count, err := client.XAck("mystream", "mygroup", []string{"0"})
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(count)

// 	// Output: 1
// }

// func ExampleGlideClient_XClaim() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XClaim("mystream", "mygroup", "myconsumer", 1000, []string{"0"})
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }

// func ExampleGlideClient_XClaimWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewStreamClaimOptions().
// 		SetMinIdleTime(1000)
// 	response, err := client.XClaimWithOptions("mystream", "mygroup", "myconsumer", 1000, []string{"0"}, options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }

// func ExampleGlideClient_XClaimJustId() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XClaimJustId("mystream", "mygroup", "myconsumer", 1000, []string{"0"})
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: []
// }

// func ExampleGlideClient_XClaimJustIdWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewStreamClaimOptions().
// 		SetMinIdleTime(1000)
// 	response, err := client.XClaimJustIdWithOptions("mystream", "mygroup", "myconsumer", 1000, []string{"0"}, options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: []
// }

// func ExampleGlideClient_XRange() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XRange("mystream", options.StreamBoundary{}, options.StreamBoundary{})
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }

// func ExampleGlideClient_XRangeWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewStreamRangeOptions().
// 		SetCount(100)
// 	response, err := client.XRangeWithOptions("mystream", options.StreamBoundary{}, options.StreamBoundary{}, options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }

// func ExampleGlideClient_XRevRange() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	response, err := client.XRevRange("mystream", options.StreamBoundary{}, options.StreamBoundary{})
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }

// func ExampleGlideClient_XRevRangeWithOptions() {
// 	var client *GlideClient = getExampleGlideClient() // example helper function

// 	options := options.NewStreamRangeOptions().
// 		SetCount(100)
// 	response, err := client.XRevRangeWithOptions("mystream", options.StreamBoundary{}, options.StreamBoundary{}, options)
// 	if err != nil {
// 		fmt.Println("Glide example failed with an error: ", err)
// 	}
// 	fmt.Println(response)

// 	// Output: map[]
// }
