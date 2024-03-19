FROM envoyproxy/envoy:v1.29.2
COPY ./envoy.yaml /etc/envoy.yaml
COPY ./wasm/cloud-active-defense.wasm /var/local/lib/wasm/cloud-active-defense.wasm
USER envoy
CMD ["/usr/local/bin/envoy", "-c", "/etc/envoy.yaml", "--service-cluster", "proxy"]

