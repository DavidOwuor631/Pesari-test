package com.pesira.tasktracker.dto;

import com.pesira.tasktracker.entity.Task;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Task title is required")
        @Size(max = 200, message = "Title must be under 200 characters")
        private String title;

        private String description;

        @NotNull(message = "Project ID is required")
        private Long projectId;

        private Task.TaskStatus status;
        private Task.Priority priority;
        private LocalDate dueDate;
        private Long assigneeId;
        private String tags;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 200)
        private String title;
        private String description;
        private Task.TaskStatus status;
        private Task.Priority priority;
        private LocalDate dueDate;
        private Long assigneeId;
        private String tags;
    }

    @Data
    public static class TaskResponse {
        private Long id;
        private String title;
        private String description;
        private String status;
        private String approvalStatus;
        private String priority;
        private LocalDate dueDate;
        private Long projectId;
        private String projectName;
        private String projectColor;
        private Long assigneeId;
        private String assigneeName;
        private String assigneeAvatar;
        private Long createdById;
        private String createdByName;
        private String tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class TaskSearchParams {
        private String search;
        private String status;
        private String priority;
        private Long projectId;
        private int page = 0;
        private int size = 10;
        private String sortBy = "createdAt";
        private String sortDir = "desc";
    }
}
