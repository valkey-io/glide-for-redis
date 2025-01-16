// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package options

// This struct represents the optional arguments for the HSCAN command.
type HashScanOptions struct {
	BaseScanOptions
	noValue bool
}

func NewHashScanOptionsBuilder() *HashScanOptions {
	return &HashScanOptions{}
}

/*
If this value is set to true, the HSCAN command will be called with NOVALUES option.
In the NOVALUES option, values are not included in the response.
*/
func (hashScanOptions *HashScanOptions) SetNoValue(noValue bool) *HashScanOptions {
	hashScanOptions.noValue = noValue
	return hashScanOptions
}

func (hashScanOptions *HashScanOptions) SetMatch(match string) *HashScanOptions {
	hashScanOptions.BaseScanOptions.SetMatch(match)
	return hashScanOptions
}

func (hashScanOptions *HashScanOptions) SetCount(count int64) *HashScanOptions {
	hashScanOptions.BaseScanOptions.SetCount(count)
	return hashScanOptions
}

func (options *HashScanOptions) ToArgs() ([]string, error) {
	args := []string{}
	baseArgs, err := options.BaseScanOptions.ToArgs()
	args = append(args, baseArgs...)

	if options.noValue {
		args = append(args, NoValue)
	}
	return args, err
}
