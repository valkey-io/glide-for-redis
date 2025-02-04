// Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0

mod utilities;

#[cfg(test)]
mod cluster_client_tests {
    use std::collections::HashMap;

    use super::*;
    use cluster::{setup_cluster_with_replicas, LONG_CLUSTER_TEST_TIMEOUT};
    use glide_core::client::Client;
    use glide_core::connection_request::{
        self, OpenTelemetryConfig, PubSubChannelsOrPatterns, PubSubSubscriptions, ReadFrom,
    };
    use redis::cluster_routing::{
        MultipleNodeRoutingInfo, Route, RoutingInfo, SingleNodeRoutingInfo, SlotAddr,
    };
    use redis::InfoDict;
    use rstest::rstest;
    use utilities::cluster::{setup_test_basics_internal, SHORT_CLUSTER_TEST_TIMEOUT};
    use utilities::*;
    use versions::Versioning;

    fn count_primary_or_replica(value: &str) -> (u16, u16) {
        if value.contains("role:master") {
            (1, 0)
        } else if value.contains("role:slave") {
            (0, 1)
        } else {
            (0, 0)
        }
    }

    fn count_primaries_and_replicas(info_replication: HashMap<String, String>) -> (u16, u16) {
        info_replication
            .into_iter()
            .fold((0, 0), |acc, (_, value)| {
                let count = count_primary_or_replica(&value);
                (acc.0 + count.0, acc.1 + count.1)
            })
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_no_provided_route() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics.client.send_command(&cmd, None).await.unwrap();
            let info = redis::from_owned_redis_value::<HashMap<String, String>>(info).unwrap();
            let (primaries, replicas) = count_primaries_and_replicas(info);
            assert_eq!(primaries, 3);
            assert_eq!(replicas, 0);
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_to_all_primaries() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::MultiNode((
                        MultipleNodeRoutingInfo::AllMasters,
                        None,
                    ))),
                )
                .await
                .unwrap();
            let info = redis::from_owned_redis_value::<HashMap<String, String>>(info).unwrap();
            let (primaries, replicas) = count_primaries_and_replicas(info);
            assert_eq!(primaries, 3);
            assert_eq!(replicas, 0);
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_to_all_nodes() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::MultiNode((
                        MultipleNodeRoutingInfo::AllNodes,
                        None,
                    ))),
                )
                .await
                .unwrap();
            let info = redis::from_owned_redis_value::<HashMap<String, String>>(info).unwrap();
            let (primaries, replicas) = count_primaries_and_replicas(info);
            assert_eq!(primaries, 3);
            assert_eq!(replicas, 3);
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_by_slot_to_primary() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::SingleNode(
                        SingleNodeRoutingInfo::SpecificNode(Route::new(0, SlotAddr::Master)),
                    )),
                )
                .await
                .unwrap();
            let info = redis::from_owned_redis_value::<String>(info).unwrap();
            let (primaries, replicas) = count_primary_or_replica(&info);
            assert_eq!(primaries, 1);
            assert_eq!(replicas, 0);
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_by_slot_to_replica_if_read_from_replica_configuration_allows() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                read_from: Some(ReadFrom::PreferReplica),
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::SingleNode(
                        SingleNodeRoutingInfo::SpecificNode(Route::new(
                            0,
                            SlotAddr::ReplicaOptional,
                        )),
                    )),
                )
                .await
                .unwrap();
            let info = redis::from_owned_redis_value::<String>(info).unwrap();
            let (primaries, replicas) = count_primary_or_replica(&info);
            assert_eq!(primaries, 0);
            assert_eq!(replicas, 1);
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_send_routing_by_slot_to_replica_override_read_from_replica_configuration() {
        block_on_all(async {
            let mut test_basics = setup_test_basics_internal(TestConfiguration {
                cluster_mode: ClusterMode::Enabled,
                shared_server: true,
                read_from: Some(ReadFrom::Primary),
                ..Default::default()
            })
            .await;

            let mut cmd = redis::cmd("INFO");
            cmd.arg("REPLICATION");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::SingleNode(
                        SingleNodeRoutingInfo::SpecificNode(Route::new(
                            0,
                            SlotAddr::ReplicaRequired,
                        )),
                    )),
                )
                .await
                .unwrap();
            let info = redis::from_owned_redis_value::<String>(info).unwrap();
            let (primaries, replicas) = count_primary_or_replica(&info);
            assert_eq!(primaries, 0);
            assert_eq!(replicas, 1);
        });
    }

    #[rstest]
    #[timeout(LONG_CLUSTER_TEST_TIMEOUT)]
    fn test_fail_creation_with_unsupported_sharded_pubsub() {
        block_on_all(async {
            let mut test_basics = setup_cluster_with_replicas(
                TestConfiguration {
                    cluster_mode: ClusterMode::Enabled,
                    shared_server: false,
                    ..Default::default()
                },
                0,
                3,
            )
            .await;

            // get engine version
            let cmd = redis::cmd("INFO");
            let info = test_basics
                .client
                .send_command(
                    &cmd,
                    Some(RoutingInfo::SingleNode(SingleNodeRoutingInfo::Random)),
                )
                .await
                .unwrap();

            let info_dict: InfoDict = redis::from_owned_redis_value(info).unwrap();
            match info_dict.get::<String>("redis_version") {
                Some(version) => match (Versioning::new(version), Versioning::new("7.0")) {
                    (Some(server_ver), Some(min_ver)) => {
                        if server_ver < min_ver {
                            // try to create client with initial nodes lacking the target sharded subscription node
                            let cluster = test_basics.cluster.unwrap();
                            let mut addresses = cluster.get_server_addresses();
                            addresses.truncate(1);

                            let mut connection_request =
                                connection_request::ConnectionRequest::new();
                            connection_request.addresses =
                                addresses.iter().map(get_address_info).collect();

                            connection_request.cluster_mode_enabled = true;
                            // Assumes the current implementation of the test cluster, where slots are distributed across nodes
                            // in a monotonically increasing order.
                            let mut last_slot_channel = PubSubChannelsOrPatterns::new();
                            last_slot_channel
                                .channels_or_patterns
                                .push("last-slot-channel-{16383}".as_bytes().into());

                            let mut subs = PubSubSubscriptions::new();
                            // First try to create a client with the Exact subscription
                            subs.channels_or_patterns_by_type
                                .insert(0, last_slot_channel.clone());
                            connection_request.pubsub_subscriptions =
                                protobuf::MessageField::from_option(Some(subs.clone()));

                            let _client = Client::new(connection_request.clone().into(), None)
                                .await
                                .unwrap();

                            // Now try to create a client with a Sharded subscription which should fail
                            subs.channels_or_patterns_by_type
                                .insert(2, last_slot_channel);
                            connection_request.pubsub_subscriptions =
                                protobuf::MessageField::from_option(Some(subs));

                            let client = Client::new(connection_request.into(), None).await;
                            assert!(client.is_err());
                        }
                    }
                    _ => {
                        panic!("Failed to parse engine version");
                    }
                },
                _ => {
                    panic!("Could not determine engine version from INFO result");
                }
            }
        });
    }

    #[rstest]
    #[timeout(SHORT_CLUSTER_TEST_TIMEOUT)]
    fn test_async_open_telemetry_config() {
        block_on_all(async {
            let test_basics = setup_cluster_with_replicas(
                TestConfiguration {
                    cluster_mode: ClusterMode::Enabled,
                    shared_server: false,
                    ..Default::default()
                },
                0,
                3,
            )
            .await;

            let cluster = test_basics.cluster.unwrap();
            let mut addresses = cluster.get_server_addresses();
            addresses.truncate(1);

            let mut connection_request = connection_request::ConnectionRequest::new();
            connection_request.addresses = addresses.iter().map(get_address_info).collect();

            let mut op = OpenTelemetryConfig::new();
            op.collector_end_point = "http://valid-url.com".into();
            op.span_flush_interval = Some(300);

            connection_request.opentelemetry_config = protobuf::MessageField::from_option(Some(op));

            let result = std::panic::catch_unwind(|| {
                tokio::task::block_in_place(|| {
                    futures::executor::block_on(async {
                        let _client = Client::new(connection_request.clone().into(), None)
                            .await
                            .unwrap();
                    });
                });
            });
            assert!(result.is_err(), "Expected a panic but no panic occurred");
        });
    }
}
