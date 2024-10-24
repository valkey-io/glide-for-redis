# Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0
"""
module for `vector search` commands.
"""

from typing import List, Mapping, Optional, Union, cast

from glide.async_commands.server_modules.ft_options.ft_constants import (
    CommandNames,
    FtCreateKeywords,
)
from glide.async_commands.server_modules.ft_options.ft_create_options import (
    Field,
    FtCreateOptions,
)
from glide.async_commands.server_modules.ft_options.ft_search_options import (
    FtSeachOptions,
)
from glide.constants import TOK, FtInfoResponse, TEncodable
from glide.glide_client import TGlideClient


async def create(
    client: TGlideClient,
    indexName: TEncodable,
    schema: List[Field],
    options: Optional[FtCreateOptions] = None,
) -> TOK:
    """
    Creates an index and initiates a backfill of that index.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name for the index to be created
        schema (List[Field]): The fields of the index schema, specifying the fields and their types.
        options (Optional[FtCreateOptions]): Optional arguments for the FT.CREATE command. See `FtCreateOptions`.

    Returns:
        TOK: A simple "OK" response.

    Examples:
        >>> from glide import ft
        >>> schema: List[Field] = []
        >>> field: TextField = TextField("title")
        >>> schema.append(field)
        >>> prefixes: List[str] = []
        >>> prefixes.append("blog:post:")
        >>> index = "idx"
        >>> result = await ft.create(glide_client, index, schema, FtCreateOptions(DataType.HASH, prefixes))
            'OK'  # Indicates successful creation of index named 'idx'
    """
    args: List[TEncodable] = [CommandNames.FT_CREATE, indexName]
    if options:
        args.extend(options.toArgs())
    if schema:
        args.append(FtCreateKeywords.SCHEMA)
        for field in schema:
            args.extend(field.toArgs())
    return cast(TOK, await client.custom_command(args))


async def dropindex(client: TGlideClient, indexName: TEncodable) -> TOK:
    """
    Drops an index. The index definition and associated content are deleted. Keys are unaffected.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name for the index to be dropped.

    Returns:
        TOK: A simple "OK" response.

    Examples:
        For the following example to work, an index named 'idx' must be already created. If not created, you will get an error.
        >>> from glide import ft
        >>> indexName = "idx"
        >>> result = await ft.dropindex(glide_client, indexName)
            'OK'  # Indicates successful deletion/dropping of index named 'idx'
    """
    args: List[TEncodable] = [CommandNames.FT_DROPINDEX, indexName]
    return cast(TOK, await client.custom_command(args))


async def search(
    client: TGlideClient,
    indexName: TEncodable,
    query: TEncodable,
    options: Optional[FtSeachOptions],
) -> List[Union[int, Mapping[TEncodable, Mapping[TEncodable, TEncodable]]]]:
    """
    Uses the provided query expression to locate keys within an index. Once located, the count and/or the content of indexed fields within those keys can be returned.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name to search into.
        query (TEncodable): The text query to search.
        options (Optional[FtSeachOptions]): The search options. See `FtSearchOptions`.

    Returns:
        List[Union[int, Mapping[TEncodable, Mapping[TEncodable, TEncodable]]]]: A two element array, where first element is count of documents in result set, and the second element, which has the format Mapping[TEncodable, Mapping[TEncodable, TEncodable]] is a mapping between document names and map of their attributes.
        If count(option in `FtSearchOptions`) is set to true or limit(option in `FtSearchOptions`) is set to FtSearchLimit(0, 0), the command returns array with only one element - the count of the documents.

    Examples:
        For the following example to work the following must already exist:
        - An index named "idx", with fields having identifiers as "a" and "b" and prefix as "{json:}"
        - A key named {json:}1 with value {"a":1, "b":2}

        >>> from glide import ft
        >>> result = await ft.search(glide_client, "idx", "*", options=FtSeachOptions(return_fields=[ReturnField(field_identifier="first"), ReturnField(field_identifier="second")]))
        [1, { b'json:1': { b'first': b'42', b'second': b'33' } }] # The first element, 1 is the number of keys returned in the search result. The second element is a map of data queried per key.
    """
    args: List[TEncodable] = [CommandNames.FT_SEARCH, indexName, query]
    if options:
        args.extend(options.toArgs())
    return cast(
        List[Union[int, Mapping[TEncodable, Mapping[TEncodable, TEncodable]]]],
        await client.custom_command(args),
    )


async def aliasadd(
    client: TGlideClient, alias: TEncodable, indexName: TEncodable
) -> TOK:
    """
    Adds an alias for an index. The new alias name can be used anywhere that an index name is required.

    Args:
        client (TGlideClient): The client to execute the command.
        alias (TEncodable): The alias to be added to an index.
        indexName (TEncodable): The index name for which the alias has to be added.

    Returns:
        TOK: A simple "OK" response.

    Examples:
        >>> from glide import ft
        >>> result = await ft.aliasadd(glide_client, "myalias", "myindex")
            'OK'  # Indicates the successful addition of the alias named "myalias" for the index.
    """
    args: List[TEncodable] = [CommandNames.FT_ALIASADD, alias, indexName]
    return cast(TOK, await client.custom_command(args))


async def aliasdel(client: TGlideClient, alias: TEncodable) -> TOK:
    """
    Deletes an existing alias for an index.

    Args:
        client (TGlideClient): The client to execute the command.
        alias (TEncodable): The existing alias to be deleted for an index.

    Returns:
        TOK: A simple "OK" response.

    Examples:
        >>> from glide import ft
        >>> result = await ft.aliasdel(glide_client, "myalias")
            'OK'  # Indicates the successful deletion of the alias named "myalias"
    """
    args: List[TEncodable] = [CommandNames.FT_ALIASDEL, alias]
    return cast(TOK, await client.custom_command(args))


async def aliasupdate(
    client: TGlideClient, alias: TEncodable, indexName: TEncodable
) -> TOK:
    """
    Updates an existing alias to point to a different physical index. This command only affects future references to the alias.

    Args:
        client (TGlideClient): The client to execute the command.
        alias (TEncodable): The alias name. This alias will now be pointed to a different index.
        indexName (TEncodable): The index name for which an existing alias has to updated.

    Returns:
        TOK: A simple "OK" response.

    Examples:
        >>> from glide import ft
        >>> result = await ft.aliasupdate(glide_client, "myalias", "myindex")
            'OK'  # Indicates the successful update of the alias to point to the index named "myindex"
    """
    args: List[TEncodable] = [CommandNames.FT_ALIASUPDATE, alias, indexName]
    return cast(TOK, await client.custom_command(args))


async def info(client: TGlideClient, indexName: TEncodable) -> FtInfoResponse:
    """
    Returns information about a given index.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name for which the information has to be returned.

    Returns:
        FtInfoResponse: Nested maps with info about the index. See example for more details. See `FtInfoResponse`.

    Examples:
        An index with name 'myIndex', 1 text field and 1 vector field is already created for gettting the output of this example.
        >>> from glide import ft
        >>> result = await ft.info(glide_client, "myIndex")
            [
                b'index_name',
                b'myIndex',
                b'creation_timestamp', 1729531116945240,
                b'key_type', b'JSON',
                b'key_prefixes', [b'key-prefix'],
                b'fields', [
                    [
                        b'identifier', b'$.vec',
                        b'field_name', b'VEC',
                        b'type', b'VECTOR',
                        b'option', b'',
                        b'vector_params', [
                            b'algorithm', b'HNSW', b'data_type', b'FLOAT32', b'dimension', 2, b'distance_metric', b'L2', b'initial_capacity', 1000, b'current_capacity', 1000, b'maximum_edges', 16, b'ef_construction', 200, b'ef_runtime', 10, b'epsilon', b'0.01'
                        ]
                    ],
                    [
                        b'identifier', b'$.text-field',
                        b'field_name', b'text-field',
                        b'type', b'TEXT',
                        b'option', b''
                    ]
                ],
                b'space_usage', 653351,
                b'fulltext_space_usage', 0,
                b'vector_space_usage', 653351,
                b'num_docs', 0,
                b'num_indexed_vectors', 0,
                b'current_lag', 0,
                b'index_status', b'AVAILABLE',
                b'index_degradation_percentage', 0
            ]
    """
    args: List[TEncodable] = [CommandNames.FT_INFO, indexName]
    return cast(FtInfoResponse, await client.custom_command(args))


async def explain(
    client: TGlideClient, indexName: TEncodable, query: TEncodable
) -> TEncodable:
    """
    Parse a query and return information about how that query was parsed.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name for which the query is written.
        query (TEncodable): The search query, same as the query passed as an argument to FT.SEARCH.

    Returns:
        TEncodable: A string containing the parsed results representing the execution plan.

    Examples:
        >>> from glide import ft
        >>> result = await ft.explain(glide_client, indexName="myIndex", query="@price:[0 10]")
            b'Field {\n  price\n  0\n  10\n}\n' # Parsed results.
    """
    args: List[TEncodable] = [CommandNames.FT_EXPLAIN, indexName, query]
    return cast(TEncodable, await client.custom_command(args))


async def explaincli(
    client: TGlideClient, indexName: TEncodable, query: TEncodable
) -> List[TEncodable]:
    """
    Same as the FT.EXPLAIN command except that the results are displayed in a different format. More useful with cli.

    Args:
        client (TGlideClient): The client to execute the command.
        indexName (TEncodable): The index name for which the query is written.
        query (TEncodable): The search query, same as the query passed as an argument to FT.SEARCH.

    Returns:
        List[TEncodable]: An array containing the execution plan.

    Examples:
        >>> from glide import ft
        >>> result = await ft.explaincli(glide_client, indexName="myIndex", query="@price:[0 10]")
            [b'Field {', b'  price', b'  0', b'  10', b'}', b''] # Parsed results.
    """
    args: List[TEncodable] = [CommandNames.FT_EXPLAINCLI, indexName, query]
    return cast(List[TEncodable], await client.custom_command(args))
