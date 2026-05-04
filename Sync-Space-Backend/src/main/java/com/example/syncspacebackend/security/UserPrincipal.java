package com.example.syncspacebackend.security;

import com.example.syncspacebackend.models.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Getter
public class UserPrincipal implements UserDetails {
    private final Long id;
    private final String email;
    private final String password;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getHashedPassword();
    }

    @Override
    public String getUsername() { return email; }

    @Override
    public String getPassword() { return password; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    // Standard boilerplate - set all to true
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}