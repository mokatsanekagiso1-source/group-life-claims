package dev.grouplife.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the first admin in a fresh environment, so nobody has to insert users by hand. */
@Component
@Order(0)
class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String adminPassword;

    AdminBootstrap(AppUserRepository users, PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin-password:}") String adminPassword) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminPassword.isBlank() || users.existsByRole(Role.ADMIN)) {
            return;
        }
        users.save(new AppUser("admin", passwordEncoder.encode(adminPassword), Role.ADMIN, null));
        log.info("Created bootstrap admin user 'admin'");
    }
}
