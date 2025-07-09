FROM quay.io/keycloak/keycloak:latest

COPY ./realm-import.json /opt/keycloak/data/import/cad-realm.json
COPY ./demo-event/target/cad-registration-event-listener.jar /opt/keycloak/providers/cad-registration-event-listener.jar

EXPOSE 8080

CMD ["start", "--db", "postgres", "--import-realm"]