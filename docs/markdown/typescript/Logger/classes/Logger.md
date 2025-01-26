[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Logger](../README.md) / Logger

# Class: Logger

## Methods

### init()

> `static` **init**(`level`?, `fileName`?): `void`

Initialize a logger if it wasn't initialized before - this method is meant to be used when there is no intention to replace an existing logger.
The logger will filter all logs with a level lower than the given level,
If given a fileName argument, will write the logs to files postfixed with fileName. If fileName isn't provided, the logs will be written to the console.
To turn off the logger, provide the level "off".

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level`? | [`LevelOptions`](../type-aliases/LevelOptions.md) |
| `fileName`? | `string` |

#### Returns

`void`

***

### log()

> `static` **log**(`logLevel`, `logIdentifier`, `message`): `void`

take the arguments from the user and provide to the core-logger (see ../logger-core)
if the level is higher then the logger level (error is 0, warn 1, etc.) simply return without operation
if a logger instance doesn't exist, create new one with default mode (decided by rust core, normally - level: error, target: console)
logIdentifier arg is a string contain data that suppose to give the log a context and make it easier to find certain type of logs.
when the log is connect to certain task the identifier should be the task id, when the log is not part of specific task the identifier should give a context to the log - for example, "socket connection".
External users shouldn't use this function.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logLevel` | [`LevelOptions`](../type-aliases/LevelOptions.md) |
| `logIdentifier` | `string` |
| `message` | `string` |

#### Returns

`void`

***

### setLoggerConfig()

> `static` **setLoggerConfig**(`level`, `fileName`?): `void`

configure the logger.
the level argument is the level of the logs you want the system to provide (error logs, warn logs, etc.)
the filename argument is optional - if provided the target of the logs will be the file mentioned, else will be the console
To turn off the logger, provide the level "off".

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | [`LevelOptions`](../type-aliases/LevelOptions.md) |
| `fileName`? | `string` |

#### Returns

`void`
