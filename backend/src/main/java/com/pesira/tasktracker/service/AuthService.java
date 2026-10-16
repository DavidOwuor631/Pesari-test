package com.pesira.tasktracker.service;

import com.pesira.tasktracker.dto.AuthDto;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.exception.ResourceNotFoundException;
import com.pesira.tasktracker.repository.UserRepository;
import com.pesira.tasktracker.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + request.getUsername());
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(User.Role.USER)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();

        User saved = userRepository.save(user);
        String token = jwtTokenProvider.generateToken(saved);

        return new AuthDto.AuthResponse(
                token, saved.getId(), saved.getUsername(), saved.getEmail(),
                saved.getFirstName(), saved.getLastName(), saved.getRole().name()
        );
    }

    @Transactional
    public AuthDto.UserResponse createUserByAdmin(AuthDto.AdminCreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() == null ? User.Role.USER : request.getRole())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();
        return toUserResponse(userRepository.save(user));
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", null));

        String token = jwtTokenProvider.generateToken(user);

        return new AuthDto.AuthResponse(
                token, user.getId(), user.getUsername(), user.getEmail(),
                user.getFirstName(), user.getLastName(), user.getRole().name()
        );
    }

    public AuthDto.UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return toUserResponse(user);
    }

    private AuthDto.UserResponse toUserResponse(User user) {
        AuthDto.UserResponse response = new AuthDto.UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setRole(user.getRole().name());
        response.setAvatarUrl(user.getAvatarUrl());
        return response;
    }
}
