package com.pesira.tasktracker.controller;

import com.pesira.tasktracker.dto.AuthDto;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.repository.UserRepository;
import com.pesira.tasktracker.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    public UserController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthDto.UserResponse> createUser(
            @Valid @RequestBody AuthDto.AdminCreateUserRequest request) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(authService.createUserByAdmin(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuthDto.UserResponse>> getAllUsers() {
        List<AuthDto.UserResponse> users = userRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthDto.UserResponse> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthDto.UserResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody AuthDto.RoleUpdateRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal User currentUser) {
        if (currentUser.getId().equals(id)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot change your own role");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new com.pesira.tasktracker.exception.ResourceNotFoundException("User", id));
        user.setRole(request.getRole());
        return ResponseEntity.ok(toResponse(userRepository.save(user)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal User currentUser) {
        if (currentUser.getId().equals(id)) {
            throw new org.springframework.security.access.AccessDeniedException("You cannot delete your own account");
        }
        if (!userRepository.existsById(id)) {
            throw new com.pesira.tasktracker.exception.ResourceNotFoundException("User", id);
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private AuthDto.UserResponse toResponse(User user) {
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
