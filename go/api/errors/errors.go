// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package errors

// #cgo LDFLAGS: -lglide_rs
// #cgo !windows LDFLAGS: -lm
// #cgo darwin LDFLAGS: -framework Security
// #cgo linux,amd64 LDFLAGS: -L${SRCDIR}/../rustbin/x86_64-unknown-linux-gnu
// #cgo linux,arm64 LDFLAGS: -L${SRCDIR}/../rustbin/aarch64-unknown-linux-gnu
// #cgo darwin,arm64 LDFLAGS: -L${SRCDIR}/../rustbin/aarch64-apple-darwin
// #cgo LDFLAGS: -L../target/release
// #include "../../lib.h"
import "C"

// ConnectionError is a client error that occurs when there is an error while connecting or when a connection
// disconnects.
type ConnectionError struct {
	Msg string
}

func (e *ConnectionError) Error() string { return e.Msg }

// RequestError is a client error that occurs when an error is reported during a request.
type RequestError struct {
	Msg string
}

func (e *RequestError) Error() string { return e.Msg }

// ExecAbortError is a client error that occurs when a transaction is aborted.
type ExecAbortError struct {
	msg string
}

func (e *ExecAbortError) Error() string { return e.msg }

// TimeoutError is a client error that occurs when a request times out.
type TimeoutError struct {
	msg string
}

func (e *TimeoutError) Error() string { return e.msg }

// DisconnectError is a client error that indicates a connection problem between Glide and server.
type DisconnectError struct {
	msg string
}

func (e *DisconnectError) Error() string { return e.msg }

// ClosingError is a client error that indicates that the client has closed and is no longer usable.
type ClosingError struct {
	Msg string
}

func (e *ClosingError) Error() string { return e.Msg }

func GoError(cErrorType uint32, errorMessage string) error {
	switch cErrorType {
	case C.ExecAbort:
		return &ExecAbortError{errorMessage}
	case C.Timeout:
		return &TimeoutError{errorMessage}
	case C.Disconnect:
		return &DisconnectError{errorMessage}
	default:
		return &RequestError{errorMessage}
	}
}
