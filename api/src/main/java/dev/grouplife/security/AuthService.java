package dev.grouplife.security;

import dev.grouplife.security.AuthDtos.LoginRequest;
import dev.grouplife.security.AuthDtos.LoginResponse;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;
    private final Clock clock;

    public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
            JwtProperties properties, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        AppUser user = users.findByUsername(request.username())
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));

        Instant now = clock.instant();
        Instant expiresAt = now.plus(properties.ttl());
        var claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getUsername())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim(CurrentUser.ROLE_CLAIM, user.getRole().name());
        if (user.getMemberId() != null) {
            claims.claim(CurrentUser.MEMBER_ID_CLAIM, user.getMemberId().toString());
        }
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();

        return new LoginResponse(token, expiresAt, user.getUsername(), user.getRole(), user.getMemberId());
    }
}
