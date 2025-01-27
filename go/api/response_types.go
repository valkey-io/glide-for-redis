// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

package api

// A value to return alongside with error in case if command failed
var (
    defaultFloatResponse  float64
    defaultBoolResponse   bool
    defaultIntResponse    int64
    defaultStringResponse string
)

type Result[T any] struct {
    val   T
    isNil bool
}

// KeyWithMemberAndScore is used by BZPOPMIN/BZPOPMAX, which return an object consisting of the key of the sorted set that was
// popped, the popped member, and its score.
type KeyWithMemberAndScore struct {
    Key    string
    Member string
    Score  float64
}

// Response type of [XAutoClaim] command.
type XAutoClaimResponse struct {
    NextEntry       string
    ClaimedEntries  map[string][][]string
    DeletedMessages []string
}

// Response type of [XAutoClaimJustId] command.
type XAutoClaimJustIdResponse struct {
    NextEntry       string
    ClaimedEntries  []string
    DeletedMessages []string
}

func (result Result[T]) IsNil() bool {
    return result.isNil
}

func (result Result[T]) Value() T {
    return result.val
}

func CreateStringResult(str string) Result[string] {
    return Result[string]{val: str, isNil: false}
}

func CreateNilStringResult() Result[string] {
    return Result[string]{val: "", isNil: true}
}

func CreateInt64Result(intVal int64) Result[int64] {
    return Result[int64]{val: intVal, isNil: false}
}

func CreateNilInt64Result() Result[int64] {
    return Result[int64]{val: 0, isNil: true}
}

func CreateFloat64Result(floatVal float64) Result[float64] {
    return Result[float64]{val: floatVal, isNil: false}
}

func CreateNilFloat64Result() Result[float64] {
    return Result[float64]{val: 0, isNil: true}
}

func CreateKeyWithMemberAndScoreResult(kmsVal KeyWithMemberAndScore) Result[KeyWithMemberAndScore] {
    return Result[KeyWithMemberAndScore]{val: kmsVal, isNil: false}
}

func CreateNilKeyWithMemberAndScoreResult() Result[KeyWithMemberAndScore] {
    return Result[KeyWithMemberAndScore]{val: KeyWithMemberAndScore{"", "", 0.0}, isNil: true}
}

// Enum to distinguish value types stored in `ClusterValue`
type ValueType int

const (
    SingleValue ValueType = 1
    MultiValue  ValueType = 2
)

// Enum-like structure which stores either a single-node response or multi-node response.
// Multi-node response stored in a map, where keys are hostnames or "<ip>:<port>" strings.
//
// For example:
//
//	// Command failed:
//	value, err := clusterClient.CustomCommand(args)
//	value.IsEmpty(): true
//	err != nil: true
//
//	// Command returns response from multiple nodes:
//	value, _ := clusterClient.info()
//	node, nodeResponse := range value.Value().(map[string]interface{}) {
//	    response := nodeResponse.(string)
//	    // `node` stores cluster node IP/hostname, `response` stores the command output from that node
//	}
//
//	// Command returns a response from single node:
//	value, _ := clusterClient.infoWithRoute(Random{})
//	response := value.Value().(string)
//	// `response` stores the command output from a cluster node
type ClusterValue[T any] struct {
    valueType ValueType
    value     Result[T]
}

func (value ClusterValue[T]) Value() T {
    return value.value.Value()
}

func (value ClusterValue[T]) ValueType() ValueType {
    return value.valueType
}

func (value ClusterValue[T]) IsSingleValue() bool {
    return value.valueType == SingleValue
}

func (value ClusterValue[T]) IsMultiValue() bool {
    return value.valueType == MultiValue
}

func (value ClusterValue[T]) IsEmpty() bool {
    return value.value.IsNil()
}

func CreateClusterValue[T any](data T) ClusterValue[T] {
    switch any(data).(type) {
    case map[string]interface{}:
        return CreateClusterMultiValue(data)
    default:
        return CreateClusterSingleValue(data)
    }
}

func CreateClusterSingleValue[T any](data T) ClusterValue[T] {
    return ClusterValue[T]{
        valueType: SingleValue,
        value:     Result[T]{val: data, isNil: false},
    }
}

func CreateClusterMultiValue[T any](data T) ClusterValue[T] {
    return ClusterValue[T]{
        valueType: MultiValue,
        value:     Result[T]{val: data, isNil: false},
    }
}

func CreateEmptyClusterValue() ClusterValue[interface{}] {
    var empty interface{}
    return ClusterValue[interface{}]{
        value: Result[interface{}]{val: empty, isNil: true},
    }
}

// XPendingSummary represents a summary of pending messages in a stream group.
// It includes the total number of pending messages, the ID of the first and last pending messages,
// and a list of consumer pending messages.
type XPendingSummary struct {
    // NumOfMessages is the total number of pending messages in the stream group.
    NumOfMessages int64

    // StartId is the ID of the first pending message in the stream group.
    StartId Result[string]

    // EndId is the ID of the last pending message in the stream group.
    EndId Result[string]

    // ConsumerMessages is a list of pending messages for each consumer in the stream group.
    ConsumerMessages []ConsumerPendingMessage
}

// ConsumerPendingMessage represents a pending message for a consumer in a Redis stream group.
// It includes the consumer's name and the count of pending messages for that consumer.
type ConsumerPendingMessage struct {
    // ConsumerName is the name of the consumer.
    ConsumerName string

    // MessageCount is the number of pending messages for the consumer.
    MessageCount int64
}

// XPendingDetail represents the details of a pending message in a stream group.
// It includes the message ID, the consumer's name, the idle time, and the delivery count.
type XPendingDetail struct {
    // Id is the ID of the pending message.
    Id string

    // ConsumerName is the name of the consumer who has the pending message.
    ConsumerName string

    // IdleTime is the amount of time (in milliseconds) that the message has been idle.
    IdleTime int64

    // DeliveryCount is the number of times the message has been delivered.
    DeliveryCount int64
}

func CreateNilXPendingSummary() XPendingSummary {
    return XPendingSummary{0, CreateNilStringResult(), CreateNilStringResult(), make([]ConsumerPendingMessage, 0)}
}

type KeyWithArrayOfMembersAndScores struct {
    Key              string
    MembersAndScores []MemberAndScore
}

type MemberAndScore struct {
    Member string
    Score  float64
}

func CreateKeyWithArrayOfMembersAndScoresResult(kmsVals KeyWithArrayOfMembersAndScores) Result[KeyWithArrayOfMembersAndScores] {
    return Result[KeyWithArrayOfMembersAndScores]{val: kmsVals, isNil: false}
}

func CreateNilKeyWithArrayOfMembersAndScoresResult() Result[KeyWithArrayOfMembersAndScores] {
    return Result[KeyWithArrayOfMembersAndScores]{val: KeyWithArrayOfMembersAndScores{"", nil}, isNil: true}
}
