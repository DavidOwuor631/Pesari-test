package com.pesira.tasktracker.dto;

import com.pesira.tasktracker.entity.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

public class ProjectDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Project name is required")
        @Size(max = 100, message = "Name must be under 100 characters")
        private String name;

        private String description;
        private Project.ProjectStatus status;
        private String color;
        private String icon;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 100)
        private String name;
        private String description;
        private Project.ProjectStatus status;
        private String color;
        private String icon;
    }

    @Data
    public static class ProjectResponse {
        private Long id;
        private String name;
        private String description;
        private String status;
        private String approvalStatus;
        private String color;
        private String icon;
        private Long ownerId;
        private String ownerName;
        private long totalTasks;
        private long completedTasks;
        private long memberCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class ProjectSummary {
        private Long id;
        private String name;
        private String color;
        private String icon;
        private String status;
        private long totalTasks;
        private long completedTasks;
    }
}
