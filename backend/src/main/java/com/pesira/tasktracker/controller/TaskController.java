package com.pesira.tasktracker.controller;

import com.pesira.tasktracker.dto.PageResponse;
import com.pesira.tasktracker.dto.TaskDto;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<TaskDto.TaskResponse>> getTasks(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        TaskDto.TaskSearchParams params = new TaskDto.TaskSearchParams();
        params.setSearch(search);
        params.setStatus(status);
        params.setPriority(priority);
        params.setProjectId(projectId);
        params.setPage(page);
        params.setSize(size);
        params.setSortBy(sortBy);
        params.setSortDir(sortDir);

        return ResponseEntity.ok(taskService.getTasks(params, currentUser.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDto.TaskResponse> getTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.getTaskById(id, currentUser.getId()));
    }

    @PostMapping
    public ResponseEntity<TaskDto.TaskResponse> createTask(
            @Valid @RequestBody TaskDto.CreateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(request, currentUser.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDto.TaskResponse> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskDto.UpdateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.updateTask(id, request, currentUser.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        taskService.deleteTask(id, currentUser.getId());
        return ResponseEntity.noContent().build();
    }

    // --- Export Endpoints ---

    @GetMapping("/export/json")
    public ResponseEntity<List<TaskDto.TaskResponse>> exportJson(
            @RequestParam Long projectId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(taskService.exportTasksAsJson(projectId, currentUser.getId()));
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv(
            @RequestParam Long projectId,
            @AuthenticationPrincipal User currentUser) throws Exception {
        String csv = taskService.exportTasksAsCsv(projectId, currentUser.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping("/export/all/json")
    public ResponseEntity<List<TaskDto.TaskResponse>> exportAllJson(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.exportAllAsJson(search, status, priority, currentUser.getId()));
    }

    @GetMapping("/export/all/csv")
    public ResponseEntity<String> exportAllCsv(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @AuthenticationPrincipal User currentUser) throws Exception {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(taskService.exportAllAsCsv(search, status, priority, currentUser.getId()));
    }

    @GetMapping("/admin/pending")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TaskDto.TaskResponse>> pendingTasks() {
        return ResponseEntity.ok(taskService.getPendingTasks());
    }

    @PatchMapping("/admin/{id}/approval")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TaskDto.TaskResponse> reviewTask(
            @PathVariable Long id, @RequestParam boolean approved) {
        return ResponseEntity.ok(taskService.reviewTask(id, approved));
    }
}
