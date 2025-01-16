/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.models.configuration;

/** Represents the communication protocol with the server. */
public enum ProtocolVersion {
    /** Use RESP3 to communicate with the server nodes. */
    RESP3,
    /** Use RESP2 to communicate with the server nodes. */
    RESP2
}
