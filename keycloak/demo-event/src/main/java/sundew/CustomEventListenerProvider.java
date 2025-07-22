package sundew;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.GroupModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.RealmProvider;
import org.keycloak.models.UserModel;

public class CustomEventListenerProvider implements EventListenerProvider {

    private final KeycloakSession session;
    private final RealmProvider model;

    public CustomEventListenerProvider(KeycloakSession session) {
        this.session = session;
        this.model = session.realms();
    }

    @Override
    public void onEvent(Event event) {
        if (EventType.REGISTER.equals(event.getType())) {
            try {
            	String controlpanelApiUrl = System.getenv("CONTROLPANEL_API_URL");
                String keycloakApiKey = System.getenv("KEYCLOAK_API_KEY");
	        	RealmModel realm = this.model.getRealm(event.getRealmId());
	            UserModel newRegisteredUser = this.session.users().getUserById(realm, event.getUserId());
                
	            GroupModel group = realm.createGroup(newRegisteredUser.getEmail());
                newRegisteredUser.joinGroup(group);
                
                String customerPayload = "{\"name\":\"" + group.getName() + "\"}";
                HttpClient client = HttpClient.newHttpClient();
	            HttpRequest request = HttpRequest.newBuilder()
	            .uri(new URI(controlpanelApiUrl + "/customer"))
	            .header("content-Type", "application/json")
                .header("Authorization", keycloakApiKey)
	            .method("POST", HttpRequest.BodyPublishers.ofString(customerPayload))
	            .build();
	            
	            client.send(request, HttpResponse.BodyHandlers.ofString());
                
            } catch(Exception e) {
            	System.err.println(e);
            }
        }

    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean b) {

    }

    @Override
    public void close() {

    }
}
