FROM envoyproxy/envoy:v1.29.2
COPY ./envoy.yaml /etc/envoy.yaml
COPY ./wasm/cloud-active-defense.wasm /var/local/lib/wasm/cloud-active-defense.wasm
ADD https://raw.githubusercontent.com/SAP/cloud-active-defense/main/LICENSE /
LABEL org.opencontainers.image.licenses="APACHE-2.0"
LABEL org.opencontainers.image.auhors="cedric.hebert@sap.com"
LABEL org.opencontainers.image.source="https://github.com/SAP/cloud-active-defense/tree/main/proxy"
USER envoy
CMD ["/usr/local/bin/envoy", "-c", "/etc/envoy.yaml", "--service-cluster", "proxy"]

