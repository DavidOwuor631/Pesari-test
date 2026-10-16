package com.pesira.tasktracker.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        private String firstName;
        private String lastName;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class AuthResponse {
        private String token;
        private String type = "Bearer";
        private Long id;
        private String username;
        private String email;
        private String firstName;
        private String lastName;
        private String role;

        public AuthResponse(String token, Long id, String username, String email,
                            String firstName, String lastName, String role) {
            this.token = token;
            this.id = id;
            this.username = username;
            this.email = email;
            this.firstName = firstName;
            this.lastName = lastName;
            this.role = role;
        }
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String username;
        private String email;
        private String firstName;
        private String lastName;
        private String role;
        private String avatarUrl;
    }

    @Data
    public static class RoleUpdateRequest {
        @jakarta.validation.constraints.NotNull(message = "Role is required")
        private com.pesira.tasktracker.entity.User.Role role;
    }

    @Data
    public static class AdminCreateUserRequest {
        @NotBlank @Size(min = 3, max = 50)
        private String username;
        @NotBlank @Email
        private String email;
        @NotBlank @Size(min = 8)
        private String password;
        private String firstName;
        private String lastName;
        private com.pesira.tasktracker.entity.User.Role role = com.pesira.tasktracker.entity.User.Role.USER;
    }
}
