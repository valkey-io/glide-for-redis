package api

import (
	"fmt"
	"time"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_Del() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Set("key2", "someValue")
	result2, err := client.Del([]string{"key1", "key2", "key3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// OK
	// 2
}

func ExampleGlideClient_Exists() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Set("key2", "someValue")
	result2, err := client.Exists([]string{"key1", "key2", "key3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// OK
	// 2
}

func ExampleGlideClient_Expire() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.ExpireAt("key", time.Now().Unix()+1)
	result2, err := client.Expire("key", 1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// true
	// true
}

func ExampleGlideClient_ExpireWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.ExpireWithOptions("key", 1, HasNoExpiry)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_ExpireAt() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.ExpireAt("key", time.Now().Unix()+1)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_ExpireAtWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.ExpireAtWithOptions("key", time.Now().Unix()+1, HasNoExpiry)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_PExpire() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PExpire("key", int64(5*1000))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_PExpireWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PExpireWithOptions("key", int64(5*1000), HasNoExpiry)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_PExpireAt() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PExpireAt("key", time.Now().Unix()*1000)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_PExpireAtWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PExpireAtWithOptions("key", time.Now().Unix()*1000, HasNoExpiry)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_ExpireTime() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.ExpireTime("key")
	_, err = client.ExpireAt("key", time.Now().Unix()*1000) // ExpireTime("key") returns proper unix timestamp in seconds
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// -1
}

func ExampleGlideClient_PExpireTime() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PExpireTime("key")
	_, err = client.PExpireAt("key", time.Now().Unix()*1000) // PExpireTime("key") returns proper unix time in milliseconds
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// -1
}

func ExampleGlideClient_TTL() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.TTL("key")
	_, err = client.ExpireAt("key", time.Now().Unix()*1000) // TTL("key") returns proper TTL in seconds
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// -1
}

func ExampleGlideClient_PTTL() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key", "someValue")
	result1, err := client.PTTL("key")
	_, err = client.PExpireAt("key", time.Now().Unix()*100000) // PTTL("key") returns proper TTL in milliseconds
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// -1
}

func ExampleGlideClient_Unlink() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Set("key2", "someValue")
	result2, err := client.Unlink([]string{"key1", "key2", "key3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// OK
	// 2
}

func ExampleGlideClient_Touch() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Set("key2", "someValue")
	result2, err := client.Touch([]string{"key1", "key2", "key3"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// OK
	// 2
}

func ExampleGlideClient_Type() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Type("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// string
}

func ExampleGlideClient_Rename() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Rename("key1", "key2")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// OK
}

func ExampleGlideClient_Renamenx() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Renamenx("key1", "key2")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// true
}

func ExampleGlideClient_Persist() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.ExpireAt("key1", time.Now().Unix()*1000)
	result2, err := client.Persist("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// true
	// true
}

func ExampleGlideClient_Restore() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	dump, err := client.Dump("key1")
	result1, err := client.Del([]string{"key1"})
	result2, err := client.Restore("key1", 0, dump.Value())
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2.Value())

	// Output:
	// OK
	// 1
	// OK
}

func ExampleGlideClient_RestoreWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	dump, err := client.Dump("key1")
	result1, err := client.Del([]string{"key1"})
	result2, err := client.RestoreWithOptions("key1", 0, dump.Value(),
		NewRestoreOptionsBuilder().SetReplace().SetABSTTL().SetEviction(FREQ, 10))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2.Value())

	// Output:
	// OK
	// 1
	// OK
}

func ExampleGlideClient_ObjectEncoding() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.ObjectEncoding("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// {embstr false}
}

func ExampleGlideClient_Dump() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Dump("key1") // Contains serialized value of the data stored at key1
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1.IsNil())

	// Output:
	// OK
	// false
}

func ExampleGlideClient_ObjectFreq() {
	var client *GlideClient = getExampleGlideClient()                                // example helper function
	_, err := client.ConfigSet(map[string]string{"maxmemory-policy": "allkeys-lfu"}) // example configuration
	result, err := client.Set("key1", "someValue")
	_, err = client.Set("key1", "someOtherValue")
	result1, err := client.ObjectFreq("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// {2 false}
}

func ExampleGlideClient_ObjectIdleTime() {
	var client *GlideClient = getExampleGlideClient()                                // example helper function
	_, err := client.ConfigSet(map[string]string{"maxmemory-policy": "allkeys-lru"}) // example configuration
	result, err := client.Set("key1", "someValue")
	result1, err := client.ObjectIdleTime("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// {0 false}
}

func ExampleGlideClient_ObjectRefCount() {
	var client *GlideClient = getExampleGlideClient()                                // example helper function
	_, err := client.ConfigSet(map[string]string{"maxmemory-policy": "allkeys-lru"}) // example configuration
	result, err := client.Set("key1", "someValue")
	result1, err := client.ObjectRefCount("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// {1 false}
}

func ExampleGlideClient_Sort() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("key1", []string{"1", "3", "2", "4"})
	result1, err := client.Sort("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// [{1 false} {2 false} {3 false} {4 false}]
}

func ExampleGlideClient_SortWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	opts := options.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).SetOrderBy(options.ASC)
	client.Set("weight_item1", "3")
	client.Set("weight_item2", "1")
	client.Set("weight_item3", "2")
	result, err := client.LPush("key1", []string{"item1", "item2", "item3"})
	result1, err := client.SortWithOptions("key1", opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// [{item2 false} {item3 false} {item1 false}]
}

func ExampleGlideClient_SortStore() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("key1", []string{"1", "3", "2", "4"})
	result1, err := client.SortStore("key1", "key1_store")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// 4
}

func ExampleGlideClient_SortStoreWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	opts := options.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).SetOrderBy(options.ASC)
	client.Set("weight_item1", "3")
	client.Set("weight_item2", "1")
	client.Set("weight_item3", "2")
	result, err := client.LPush("key1", []string{"item1", "item2", "item3"})
	result1, err := client.SortStoreWithOptions("key1", "key1_store", opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// 3
}

// _, err := client.Del([]string{"key1"})

func ExampleGlideClient_SortReadOnly() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.LPush("key1", []string{"1", "3", "2", "4"})
	result1, err := client.SortReadOnly("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// [{1 false} {2 false} {3 false} {4 false}]
}

func ExampleGlideClient_SortReadOnlyWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	opts := options.NewSortOptions().SetByPattern("weight_*").SetIsAlpha(false).SetOrderBy(options.ASC)
	client.Set("weight_item1", "3")
	client.Set("weight_item2", "1")
	client.Set("weight_item3", "2")
	result, err := client.LPush("key1", []string{"item1", "item2", "item3"})
	result1, err := client.SortReadOnlyWithOptions("key1", opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// [{item2 false} {item3 false} {item1 false}]
}

func ExampleGlideClient_Wait() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Wait(2, 2000)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// OK
	// 0
}

func ExampleGlideClient_Copy() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	result, err := client.Set("key1", "someValue")
	result1, err := client.Copy("key1", "key2")
	result2, err := client.Get("key2")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// true
	// {someValue false}
}

func ExampleGlideClient_CopyWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function
	opts := NewCopyOptionsBuilder().SetDBDestination(2).SetReplace()
	result, err := client.Set("key1", "someValue")
	result1, err := client.CopyWithOptions("key1", "key2", opts)
	result2, err := client.Get("key2")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// OK
	// true
	// {someValue false}
}
