package com.pesira.tasktracker.controller;

import com.pesira.tasktracker.dto.PageResponse;
import com.pesira.tasktracker.dto.ProjectDto;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectDto.ProjectResponse>> getMyProjects(
            @AuthenticationPrincipal User currentUser) {
        List<ProjectDto.ProjectResponse> projects = currentUser.getRole() == User.Role.ADMIN
                ? projectService.getProjectsForAdmin(currentUser.getId())
                : projectService.getProjectsForUser(currentUser.getId());
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ProjectDto.ProjectResponse>> getProjectsPaged(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<ProjectDto.ProjectResponse> projects = currentUser.getRole() == User.Role.ADMIN
                ? projectService.getProjectsPagedForAdmin(currentUser.getId(), search, page, size)
                : projectService.getProjectsPaged(currentUser.getId(), search, page, size);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDto.ProjectResponse> getProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(projectService.getProjectById(id, currentUser.getId()));
    }

    @PostMapping
    public ResponseEntity<ProjectDto.ProjectResponse> createProject(
            @Valid @RequestBody ProjectDto.CreateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(request, currentUser.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDto.ProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectDto.UpdateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(projectService.updateProject(id, request, currentUser.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        boolean isAdmin = currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        projectService.deleteProject(id, currentUser.getId(), isAdmin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProjectDto.ProjectResponse>> pendingProjects() {
        return ResponseEntity.ok(projectService.getPendingProjects());
    }

    @PatchMapping("/admin/{id}/approval")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectDto.ProjectResponse> reviewProject(
            @PathVariable Long id, @RequestParam boolean approved) {
        return ResponseEntity.ok(projectService.reviewProject(id, approved));
    }
}
