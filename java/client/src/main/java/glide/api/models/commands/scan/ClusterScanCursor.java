/** Copyright Valkey GLIDE Project Contributors - SPDX Identifier: Apache-2.0 */
package glide.api.models.commands.scan;

public interface ClusterScanCursor extends AutoCloseable {
    String getCursor();

    boolean isFinished();

    static ClusterScanCursor initialCursor() {
        return new InitialCursor();
    }

    final class InitialCursor implements ClusterScanCursor {

        private InitialCursor() {}

        @Override
        public String getCursor() {
            return null;
        }

        @Override
        public boolean isFinished() {
            throw new IllegalStateException(
                    "This operation is only valid on cursor returned by the client.");
        }

        @Override
        public void close() throws Exception {}
    }
}
