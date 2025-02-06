package api

import (
	"encoding/json"
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
	matches, _ := regexp.Match(
		`^\d{13}-0$`,
		[]byte(result.Value()),
	) // matches a number that is 13 digits long followed by "-0"
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

	// Output: {0-0 map[0-1:[[entry1_field1 entry1_value1] [entry1_field2 entry1_value2]] 0-2:[[entry2_field1 entry2_value1]]]
	// []}
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

	response, err := client.XReadGroup(group, consumer, map[string]string{key: "0"})
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

	response, err := client.XReadWithOptions(
		map[string]string{key: genStreamId(key, streambase, 0)},
		options.NewXReadOptions().SetCount(1),
	)
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

func ExampleGlideClient_XPending() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer := "c12345"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	summary, err := client.XPending(key, group)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonSummary, _ := json.Marshal(summary)
	fmt.Println(string(jsonSummary))

	// Output: {"NumOfMessages":1,"StartId":{},"EndId":{},"ConsumerMessages":[{"ConsumerName":"c12345","MessageCount":1}]}
}

func ExampleGlideClient_XPendingWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer := "c12345"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	details, err := client.XPendingWithOptions(
		key,
		group,
		options.NewXPendingOptions("-", "+", 10).SetConsumer(consumer),
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonDetails, _ := json.Marshal(details)
	fmt.Println(string(jsonDetails))

	// Output: [{"Id":"12345-1","ConsumerName":"c12345","IdleTime":1,"DeliveryCount":1}]
}

func ExampleGlideClient_XGroupSetId() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer := "c12345"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})
	client.XAck(key, group, []string{streamId}) // ack the message and remove it from the pending list

	client.XGroupSetId(key, group, "0-0")                           // reset the last acknowledged message to 0-0
	client.XReadGroup(group, consumer, map[string]string{key: ">"}) // read the group again

	summary, err := client.XPending(key, group) // get the pending messages, which should include the entry we previously acked
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonSummary, _ := json.Marshal(summary)
	fmt.Println(string(jsonSummary))

	// Output: {"NumOfMessages":1,"StartId":{},"EndId":{},"ConsumerMessages":[{"ConsumerName":"c12345","MessageCount":1}]}
}

func ExampleGlideClient_XGroupSetIdWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId1 := "12345-1"
	streamId2 := "12345-2"
	group := "g12345"
	consumer := "c12345"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer)
	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId(streamId1),
	)
	client.XAddWithOptions(
		key,
		[][]string{{"field3", "value3"}, {"field4", "value4"}},
		options.NewXAddOptions().SetId(streamId2),
	)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})
	client.XAck(key, group, []string{streamId1, streamId2}) // ack the message and remove it from the pending list

	opts := options.NewXGroupSetIdOptionsOptions().SetEntriesRead(1)
	client.XGroupSetIdWithOptions(key, group, "$", opts)            // reset the last acknowledged message to 0-0
	client.XReadGroup(group, consumer, map[string]string{key: ">"}) // read the group again

	summary, err := client.XPending(key, group) // get the pending messages, which should include the entry we previously acked
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonSummary, _ := json.Marshal(summary)
	fmt.Println(string(jsonSummary))

	// Output: {"NumOfMessages":1,"StartId":{},"EndId":{},"ConsumerMessages":[{"ConsumerName":"c12345","MessageCount":1}]}
}

func ExampleGlideClient_XGroupCreate() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"

	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId(streamId),
	) // This will create the stream if it does not exist

	response, err := client.XGroupCreate(key, group, "0") // create the group (no MKSTREAM needed)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: OK
}

func ExampleGlideClient_XGroupCreateWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	group := "g12345"

	opts := options.NewXGroupCreateOptions().SetMakeStream()
	response, err := client.XGroupCreateWithOptions(key, group, "0", opts) // create the group (no MKSTREAM needed)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: OK
}

func ExampleGlideClient_XGroupDestroy() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	group := "g12345"

	opts := options.NewXGroupCreateOptions().SetMakeStream()
	client.XGroupCreateWithOptions(key, group, "0", opts) // create the group (no MKSTREAM needed)

	success, err := client.XGroupDestroy(key, group) // destroy the group
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(success)

	// Output: true
}

func ExampleGlideClient_XGroupCreateConsumer() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	group := "g12345"
	consumer := "c12345"

	opts := options.NewXGroupCreateOptions().SetMakeStream()
	client.XGroupCreateWithOptions(key, group, "0", opts) // create the group (no MKSTREAM needed)

	success, err := client.XGroupCreateConsumer(key, group, consumer)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(success)

	// Output: true
}

func ExampleGlideClient_XGroupDelConsumer() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	group := "g12345"
	consumer := "c12345"
	streamId := "12345-1"

	client.XAddWithOptions(
		key,
		[][]string{{"field1", "value1"}, {"field2", "value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XGroupCreate(key, group, "0")
	client.XGroupCreateConsumer(key, group, consumer)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	count, err := client.XGroupDelConsumer(key, group, consumer)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println("Consumer deleted. Messages pending:", count)

	// Output:
	// Consumer deleted. Messages pending: 1
}

func ExampleGlideClient_XAck() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	group := "g12345"
	consumer := "c12345"

	streamId, _ := client.XAdd(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
	)
	client.XGroupCreate(key, group, "0")
	client.XGroupCreateConsumer(key, group, consumer)
	client.XReadGroup(group, consumer, map[string]string{key: ">"})

	count, err := client.XAck(key, group, []string{streamId.Value()}) // ack the message and remove it from the pending list
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(count)

	// Output: 1
}

func ExampleGlideClient_XClaim() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer1 := "c12345-1"
	consumer2 := "c12345-2"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer1)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer1, map[string]string{key: ">"})

	result, err := client.XPendingWithOptions(
		key,
		group,
		options.NewXPendingOptions("-", "+", 10).SetConsumer(consumer1),
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	if len(result) == 0 {
		fmt.Println("No pending messages")
		return
	}

	response, err := client.XClaim(key, group, consumer2, 1, []string{result[0].Id})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Printf("Claimed %d message\n", len(response))

	// Output: Claimed 1 message
}

func ExampleGlideClient_XClaimWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer1 := "c12345-1"
	consumer2 := "c12345-2"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer1)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer1, map[string]string{key: ">"})

	result, err := client.XPendingWithOptions(
		key,
		group,
		options.NewXPendingOptions("-", "+", 10).SetConsumer(consumer1),
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	if len(result) == 0 {
		fmt.Println("No pending messages")
		return
	}

	opts := options.NewStreamClaimOptions().SetRetryCount(3)
	response, err := client.XClaimWithOptions(key, group, consumer2, 1, []string{result[0].Id}, opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Printf("Claimed %d message\n", len(response))

	// Output: Claimed 1 message
}

func ExampleGlideClient_XClaimJustId() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer1 := "c12345-1"
	consumer2 := "c12345-2"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer1)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer1, map[string]string{key: ">"})

	result, err := client.XPendingWithOptions(
		key,
		group,
		options.NewXPendingOptions("-", "+", 10).SetConsumer(consumer1),
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	if len(result) == 0 {
		fmt.Println("No pending messages")
		return
	}

	response, err := client.XClaimJustId(key, group, consumer2, 1, []string{result[0].Id})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: [12345-1]
}

func ExampleGlideClient_XClaimJustIdWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId := "12345-1"
	group := "g12345"
	consumer1 := "c12345-1"
	consumer2 := "c12345-2"

	client.XGroupCreateWithOptions(key, group, "0", options.NewXGroupCreateOptions().SetMakeStream())
	client.XGroupCreateConsumer(key, group, consumer1)
	client.XAddWithOptions(
		key,
		[][]string{{"entry1_field1", "entry1_value1"}, {"entry1_field2", "entry1_value2"}},
		options.NewXAddOptions().SetId(streamId),
	)
	client.XReadGroup(group, consumer1, map[string]string{key: ">"})

	result, err := client.XPendingWithOptions(
		key,
		group,
		options.NewXPendingOptions("-", "+", 10).SetConsumer(consumer1),
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	if len(result) == 0 {
		fmt.Println("No pending messages")
		return
	}

	opts := options.NewStreamClaimOptions().SetRetryCount(3)
	response, err := client.XClaimJustIdWithOptions(key, group, consumer2, 1, []string{result[0].Id}, opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// Output: [12345-1]
}

func ExampleGlideClient_XRange() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"

	client.XAdd(key, [][]string{{"field1", "value1"}})
	client.XAdd(key, [][]string{{"field2", "value2"}})

	response, err := client.XRange(key,
		options.NewInfiniteStreamBoundary(options.NegativeInfinity),
		options.NewInfiniteStreamBoundary(options.PositiveInfinity))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(len(response))

	// TODO: This output is incorrect. It should be an slice since the values should be ordered.
	// Output: 2
}

func ExampleGlideClient_XRangeWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"

	streamId1, _ := client.XAdd(key, [][]string{{"field1", "value1"}})
	streamId2, _ := client.XAdd(key, [][]string{{"field2", "value2"}})

	response, err := client.XRangeWithOptions(key,
		options.NewStreamBoundary(streamId1.Value(), true),
		options.NewStreamBoundary(streamId2.Value(), true),
		options.NewStreamRangeOptions().SetCount(1))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(len(response))

	// Output: 1
}

func ExampleGlideClient_XRevRange() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId1 := "12345-1"
	streamId2 := "12345-2"

	client.XAddWithOptions(key, [][]string{{"field1", "value1"}}, options.NewXAddOptions().SetId(streamId1))
	client.XAddWithOptions(key, [][]string{{"field2", "value2"}}, options.NewXAddOptions().SetId(streamId2))

	response, err := client.XRevRange(key,
		options.NewStreamBoundary(streamId2, true),
		options.NewStreamBoundary(streamId1, true))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// TODO: This output is incorrect. It should be an slice since the values should be ordered.
	// Output: map[12345-1:[[field1 value1]] 12345-2:[[field2 value2]]]
}

func ExampleGlideClient_XRevRangeWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	key := "12345"
	streamId1 := "12345-1"
	streamId2 := "12345-2"

	client.XAddWithOptions(key, [][]string{{"field1", "value1"}}, options.NewXAddOptions().SetId(streamId1))
	client.XAddWithOptions(key, [][]string{{"field2", "value2"}}, options.NewXAddOptions().SetId(streamId2))

	response, err := client.XRevRangeWithOptions(key,
		options.NewStreamBoundary(streamId2, true),
		options.NewStreamBoundary(streamId1, true),
		options.NewStreamRangeOptions().SetCount(2))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(response)

	// TODO: This output is incorrect. It should be an slice since the values should be ordered.
	// Output: map[12345-1:[[field1 value1]] 12345-2:[[field2 value2]]]
}
