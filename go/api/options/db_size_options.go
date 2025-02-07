package options

import "github.com/valkey-io/valkey-glide/go/api/config"

type DBSizeOptions struct {
	Route config.Route
}

func NewTimeOptionsBuilder() *DBSizeOptions {
	return &DBSizeOptions{}
}

func (dbSizeOptions *DBSizeOptions) SetRoute(route config.Route) *DBSizeOptions {
	dbSizeOptions.Route = route
	return dbSizeOptions
}
