package com.booktrack.config;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig implements DisposableBean {

    private SocketIOServer server;

    @Bean
    public SocketIOServer socketIOServer(
            @Value("${socketio.host:0.0.0.0}") String host,
            @Value("${socketio.port:9000}") int port
    ) {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname(host);
        config.setPort(port);
        server = new SocketIOServer(config);
        server.start();
        return server;
    }

    @Override
    public void destroy() {
        if (server != null) {
            server.stop();
        }
    }
}
