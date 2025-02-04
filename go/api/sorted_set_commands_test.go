package api

import (
	"encoding/json"
	"fmt"

	"github.com/valkey-io/valkey-glide/go/glide/api/options"
)

func ExampleGlideClient_ZAdd() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 3
}

func ExampleGlideClient_ZAddWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	opts, err := options.NewZAddOptionsBuilder().SetChanged(true)
	result, err := client.ZAddWithOptions(
		"key1",
		map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0},
		opts,
	)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output: 3
}

func ExampleGlideClient_ZAddIncr() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAddIncr("key1", "one", 1.0)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// {1 false}
}

func ExampleGlideClient_ZAddIncrWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	opts, err := options.NewZAddOptionsBuilder().SetChanged(true) // should return an error
	result, err := client.ZAddIncrWithOptions("key1", "one", 1.0, opts)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)

	// Output:
	// Glide example failed with an error:  incr cannot be set when changed is true
	// {0 true}
}

func ExampleGlideClient_ZIncrBy() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZIncrBy("key1", 3.0, "two")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// 5
}

func ExampleGlideClient_ZPopMin() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZPopMin("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[one:1]
}

func ExampleGlideClient_ZPopMinWithCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZPopMinWithCount("key1", 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[one:1 two:2]
}

func ExampleGlideClient_ZPopMax() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZPopMax("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[three:3]
}

func ExampleGlideClient_ZPopMaxWithCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZPopMaxWithCount("key1", 2)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// map[three:3 two:2]
}

func ExampleGlideClient_ZRem() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZRem("key1", []string{"one", "two", "nonMember"})
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// 2
}

func ExampleGlideClient_ZCard() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZCard("key1")
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// 3
}

func ExampleGlideClient_BZPopMin() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	zaddResult1, err := client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 1.5})
	zaddResult2, err := client.ZAdd("key2", map[string]float64{"c": 2.0})
	result1, err := client.BZPopMin([]string{"key1", "key2"}, 0.5)
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(zaddResult1)
	fmt.Println(zaddResult2)
	fmt.Println(result1)

	// Output:
	// 2
	// 1
	// {{key1 a 1} false}
}

func ExampleGlideClient_ZRange() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZRange("key1", options.NewRangeByIndexQuery(0, -1)) // Ascending order

	// Retrieve members within a score range in descending order
	query := options.NewRangeByScoreQuery(
		options.NewScoreBoundary(3, false),
		options.NewInfiniteScoreBoundary(options.NegativeInfinity)).SetReverse()
	result2, err := client.ZRange("key1", query)
	// `result` contains members which have scores within the range of negative infinity to 3, in descending order

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 3
	// [one two three]
	// [two one]
}

func ExampleGlideClient_ZRangeWithScores() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZRangeWithScores("key1", options.NewRangeByIndexQuery(0, -1))

	query := options.NewRangeByScoreQuery(
		options.NewScoreBoundary(3, false),
		options.NewInfiniteScoreBoundary(options.NegativeInfinity)).SetReverse()
	result2, err := client.ZRangeWithScores("key1", query)

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)
	fmt.Println(result2)

	// Output:
	// 3
	// map[one:1 three:3 two:2]
	// map[one:1 two:2]
}

func ExampleGlideClient_ZRank() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	result1, err := client.ZRank("key1", "two")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 3
	// {1 false}
}

func ExampleGlideClient_ZRankWithScore() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0})
	resRank, resScore, err := client.ZRankWithScore("key1", "two")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resRank)
	fmt.Println(resScore)

	// Output:
	// 3
	// {1 false}
	// {2 false}
}

func ExampleGlideClient_ZRevRank() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	result1, err := client.ZRevRank("key1", "two")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// {2 false}
}

func ExampleGlideClient_ZRevRankWithScore() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	resRank, resScore, err := client.ZRevRankWithScore("key1", "two")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resRank)
	fmt.Println(resScore)

	// Output:
	// 4
	// {2 false}
	// {2 false}
}

func ExampleGlideClient_ZScore() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	result1, err := client.ZScore("key1", "three")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// {3 false}
}

func ExampleGlideClient_ZCount() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	zCountRange := options.NewZCountRangeBuilder(
		options.NewInclusiveScoreBoundary(2.0),
		options.NewInfiniteScoreBoundary(options.PositiveInfinity),
	)
	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	result1, err := client.ZCount("key1", zCountRange)

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// 3
}

func ExampleGlideClient_ZScan() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	resCursor, resCol, err := client.ZScan("key1", "0")

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resCursor)
	fmt.Println(resCol)

	// Output:
	// 4
	// 0
	// [one 1 two 2 three 3 four 4]
}

func ExampleGlideClient_ZScanWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0})
	resCursor, resCol, err := client.ZScanWithOptions("key1", "0",
		options.NewZScanOptionsBuilder().SetMatch("*"))

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(resCursor)
	fmt.Println(resCol)

	// Output:
	// 4
	// 0
	// [one 1 two 2 three 3 four 4]
}

func ExampleGlideClient_ZRemRangeByLex() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 2.0, "c": 3.0, "d": 4.0})
	result1, err := client.ZRemRangeByLex(
		"key1",
		*options.NewRangeByLexQuery(options.NewLexBoundary("a", false), options.NewLexBoundary("c", true)),
	)

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// 2
}

func ExampleGlideClient_ZRemRangeByRank() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 2.0, "c": 3.0, "d": 4.0})
	result1, err := client.ZRemRangeByRank("key1", 1, 3)

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// 3
}

func ExampleGlideClient_ZRemRangeByScore() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	result, err := client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 2.0, "c": 3.0, "d": 4.0})
	result1, err := client.ZRemRangeByScore("key1", *options.NewRangeByScoreQuery(
		options.NewInfiniteScoreBoundary(options.NegativeInfinity),
		options.NewInfiniteScoreBoundary(options.PositiveInfinity),
	))

	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	fmt.Println(result)
	fmt.Println(result1)

	// Output:
	// 4
	// 4
}

func ExampleGlideClient_BZMPop() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 2.0, "c": 3.0, "d": 4.0})
	result, err := client.BZMPop([]string{"key1"}, MAX, float64(0.5))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonSummary, _ := json.Marshal(result.Value())
	fmt.Println(string(jsonSummary))
	// Output: {"Key":"key1","MembersAndScores":[{"Member":"d","Score":4}]}
}

func ExampleGlideClient_BZMPopWithOptions() {
	var client *GlideClient = getExampleGlideClient() // example helper function

	client.ZAdd("key1", map[string]float64{"a": 1.0, "b": 2.0, "c": 3.0, "d": 4.0})

	result, err := client.BZMPopWithOptions([]string{"key1"}, MAX, 0.1, options.NewZMPopOptions().SetCount(2))
	if err != nil {
		fmt.Println("Glide example failed with an error: ", err)
	}
	jsonSummary, _ := json.Marshal(result.Value())
	fmt.Println(string(jsonSummary))
	// Output: {"Key":"key1","MembersAndScores":[{"Member":"c","Score":3},{"Member":"d","Score":4}]}
}
