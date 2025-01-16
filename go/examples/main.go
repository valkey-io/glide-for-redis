// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package main

import (
	"fmt"
	"log"

	"github.com/valkey-io/valkey-glide/go/glide/api"
)

// TODO: Update the file based on the template used in other clients.
func main() {
	host := "localhost"
	port := 6379

	config := api.NewGlideClientConfiguration().
		WithAddress(&api.NodeAddress{Host: host, Port: port})

	client, err := api.NewGlideClient(config)
	if err != nil {
		log.Fatal("error connecting to database: ", err)
	}

	res, err := client.CustomCommand([]string{"PING"})
	if err != nil {
		log.Fatal("Glide example failed with an error: ", err)
	}
	fmt.Println("PING:", res)

	result1, err := client.Set("apples", "oran\x00ges")
	if err != nil {
		log.Fatal("Glide example failed with an error: ", err)
	}
	fmt.Println("SET(apples, oranges):", result1)

	result, err := client.Get("invalidKey")
	if err != nil {
		log.Fatal("Glide example failed with an error: ", err)
	}
	fmt.Println("GET(invalidKey):", result.Value())

	result, err = client.Get("apples")
	if err != nil {
		log.Fatal("Glide example failed with an error: ", err)
	}
	fmt.Println("GET(apples):", result.Value())

	result, err = client.Get("app\x00les")
	if err != nil {
		log.Fatal("Glide example failed with an error: ", err)
	}
	fmt.Println("GET(app\x00les):", result.Value())

	client.Close()
}
