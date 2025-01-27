package api

import (
	"fmt"
)

// getExampleGlideClient returns a GlideClient instance for testing purposes.
// This function is used in the examples of the GlideClient methods.
func getExampleGlideClient() *GlideClient {

	config := NewGlideClientConfiguration().
		WithAddress(new(NodeAddress)) // use default address

	client, err := NewGlideClient(config)
	if err != nil {
		fmt.Println("error connecting to database: ", err)
	}

	return client.(*GlideClient)
}
