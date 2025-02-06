package options

import (
	"github.com/valkey-io/valkey-glide/go/glide/utils"
)

// Subcommands for bitfield operations.
type BitFieldSubCommands interface {
	ToArgs() ([]string, error)
}

// Subcommands for bitfieldReadOnly.
type BitFieldROCommands interface {
	dummy()
	ToArgs() ([]string, error)
}

type EncType string

const (
	SignedInt   EncType = "i"
	UnsignedInt EncType = "u"
)

type OverflowType string

const (
	WRAP OverflowType = "WRAP"
	SAT  OverflowType = "SAT"
	FAIL OverflowType = "FAIL"
)

// BitFieldGet represents a GET operation to get the value in the binary
// representation of the string stored in key based on EncType and Offset.
type BitFieldGet struct {
	EncType EncType
	Bits    int64
	Offset  int64
	UseHash bool
}

// NewBitFieldGet creates a new BitField GET command
func NewBitFieldGet(encType EncType, bits int64, offset int64) *BitFieldGet {
	return &BitFieldGet{
		EncType: encType,
		Bits:    bits,
		Offset:  offset,
	}
}

// ToArgs converts the GET command to arguments
func (cmd *BitFieldGet) ToArgs() ([]string, error) {
	args := []string{"GET"}
	args = append(args, string(cmd.EncType)+utils.IntToString(cmd.Bits))
	if cmd.UseHash {
		args = append(args, "#"+utils.IntToString(cmd.Offset))
	} else {
		args = append(args, utils.IntToString(cmd.Offset))
	}
	return args, nil
}

func (cmd *BitFieldGet) dummy() {}

// BitFieldSet represents a SET operation to set the bits in the binary
// representation of the string stored in key based on EncType and Offset.
type BitFieldSet struct {
	EncType EncType
	Bits    int64
	Offset  int64
	Value   int64
	UseHash bool
}

// NewBitFieldSet creates a new BitField SET command
func NewBitFieldSet(encType EncType, bits int64, offset int64, value int64) *BitFieldSet {
	return &BitFieldSet{
		EncType: encType,
		Bits:    bits,
		Offset:  offset,
		Value:   value,
	}
}

// ToArgs converts the SET command to arguments
func (cmd *BitFieldSet) ToArgs() ([]string, error) {
	args := []string{"SET"}
	args = append(args, string(cmd.EncType)+utils.IntToString(cmd.Bits))
	if cmd.UseHash {
		args = append(args, "#"+utils.IntToString(cmd.Offset))
	} else {
		args = append(args, utils.IntToString(cmd.Offset))
	}
	args = append(args, utils.IntToString(cmd.Value))
	return args, nil
}

// BitFieldIncrBy represents a INCRBY subcommand for increasing or decreasing the bits in the binary
// representation of the string stored in key based on EncType and Offset.
type BitFieldIncrBy struct {
	EncType   EncType
	Bits      int64
	Offset    int64
	Increment int64
	UseHash   bool
}

// NewBitFieldIncrBy creates a new BitField INCRBY command
func NewBitFieldIncrBy(encType EncType, bits int64, offset int64, increment int64) *BitFieldIncrBy {
	return &BitFieldIncrBy{
		EncType:   encType,
		Bits:      bits,
		Offset:    offset,
		Increment: increment,
	}
}

// ToArgs converts the INCRBY command to arguments
func (cmd *BitFieldIncrBy) ToArgs() ([]string, error) {
	args := []string{"INCRBY"}
	args = append(args, string(cmd.EncType)+utils.IntToString(cmd.Bits))
	if cmd.UseHash {
		args = append(args, "#"+utils.IntToString(cmd.Offset))
	} else {
		args = append(args, utils.IntToString(cmd.Offset))
	}
	args = append(args, utils.IntToString(cmd.Increment))
	return args, nil
}

// BitFieldOverflow represents a OVERFLOW subcommand that determines the result of the SET
// or INCRBY commands when an under or overflow occurs.
type BitFieldOverflow struct {
	Overflow OverflowType
}

// NewBitFieldOverflow creates a new BitField OVERFLOW command
func NewBitFieldOverflow(overflow OverflowType) *BitFieldOverflow {
	return &BitFieldOverflow{
		Overflow: overflow,
	}
}

// ToArgs converts the OVERFLOW command to arguments
func (cmd *BitFieldOverflow) ToArgs() ([]string, error) {
	return []string{"OVERFLOW", string(cmd.Overflow)}, nil
}
