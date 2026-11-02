package dev.grouplife.common;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /** Injected wherever "now" or "today" matters, so tests can pin time. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
