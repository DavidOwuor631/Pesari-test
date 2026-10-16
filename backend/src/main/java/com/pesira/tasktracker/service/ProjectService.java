package com.pesira.tasktracker.service;

import com.pesira.tasktracker.dto.PageResponse;
import com.pesira.tasktracker.dto.ProjectDto;
import com.pesira.tasktracker.entity.Project;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.exception.ResourceNotFoundException;
import com.pesira.tasktracker.repository.ProjectRepository;
import com.pesira.tasktracker.repository.TaskRepository;
import com.pesira.tasktracker.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository,
                          UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public List<ProjectDto.ProjectResponse> getProjectsForUser(Long userId) {
        return projectRepository.findByUserAccess(userId).stream()
                .map(p -> toResponse(p, userId))
                .toList();
    }

    public List<ProjectDto.ProjectResponse> getProjectsForAdmin(Long userId) {
        return projectRepository.findAllForAdmin().stream()
                .map(p -> toResponse(p, userId))
                .toList();
    }

    public PageResponse<ProjectDto.ProjectResponse> getProjectsPaged(Long userId, String search, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Project> projectPage = projectRepository.findByUserAccessWithSearch(userId, search, pageRequest);

        List<ProjectDto.ProjectResponse> content = projectPage.getContent().stream()
                .map(p -> toResponse(p, userId))
                .toList();

        return new PageResponse<>(content, page, size,
                projectPage.getTotalElements(), projectPage.getTotalPages(),
                projectPage.isLast(), projectPage.isFirst());
    }

    public PageResponse<ProjectDto.ProjectResponse> getProjectsPagedForAdmin(Long userId, String search, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Project> projectPage = projectRepository.findAllForAdminWithSearch(search, pageRequest);

        List<ProjectDto.ProjectResponse> content = projectPage.getContent().stream()
                .map(p -> toResponse(p, userId))
                .toList();

        return new PageResponse<>(content, page, size,
                projectPage.getTotalElements(), projectPage.getTotalPages(),
                projectPage.isLast(), projectPage.isFirst());
    }

    public ProjectDto.ProjectResponse getProjectById(Long id, Long userId) {
        Project project = findProjectOrThrow(id);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (user.getRole() != User.Role.ADMIN) {
            checkAccess(project, userId);
        }
        return toResponse(project, userId);
    }

    @Transactional
    public ProjectDto.ProjectResponse createProject(ProjectDto.CreateRequest request, Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : Project.ProjectStatus.ACTIVE)
                .color(request.getColor() != null ? request.getColor() : "#6366f1")
                .icon(request.getIcon() != null ? request.getIcon() : "📋")
                .owner(owner)
                .approvalStatus(owner.getRole() == User.Role.ADMIN
                        ? Project.ApprovalStatus.APPROVED : Project.ApprovalStatus.PENDING)
                .build();

        Project saved = projectRepository.save(project);
        return toResponse(saved, userId);
    }

    @Transactional
    public ProjectDto.ProjectResponse updateProject(Long id, ProjectDto.UpdateRequest request, Long userId) {
        Project project = findProjectOrThrow(id);
        checkOwnership(project, userId);

        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(request.getStatus());
        if (request.getColor() != null) project.setColor(request.getColor());
        if (request.getIcon() != null) project.setIcon(request.getIcon());

        return toResponse(projectRepository.save(project), userId);
    }

    @Transactional
    public void deleteProject(Long id, Long userId, boolean isAdmin) {
        Project project = findProjectOrThrow(id);
        if (!isAdmin) checkOwnership(project, userId);
        projectRepository.delete(project);
    }

    public List<ProjectDto.ProjectResponse> getPendingProjects() {
        return projectRepository.findByApprovalStatus(Project.ApprovalStatus.PENDING).stream()
                .map(p -> toResponse(p, p.getOwner().getId()))
                .toList();
    }

    @Transactional
    public ProjectDto.ProjectResponse reviewProject(Long id, boolean approved) {
        Project project = findProjectOrThrow(id);
        project.setApprovalStatus(approved ? Project.ApprovalStatus.APPROVED : Project.ApprovalStatus.REJECTED);
        if (approved) {
            project.setStatus(Project.ProjectStatus.ACTIVE);
        }
        return toResponse(projectRepository.save(project), project.getOwner().getId());
    }

    private Project findProjectOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));
    }

    private void checkAccess(Project project, Long userId) {
        boolean isOwner = project.getOwner().getId().equals(userId);
        boolean isMember = project.getMembers().stream()
                .anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isOwner && project.getApprovalStatus() != Project.ApprovalStatus.APPROVED) {
            throw new AccessDeniedException("This project is awaiting administrator approval");
        }
        if (!isOwner && !isMember) {
            throw new AccessDeniedException("You don't have access to this project");
        }
    }

    private void checkOwnership(Project project, Long userId) {
        if (!project.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("Only the project owner can perform this action");
        }
    }

    private ProjectDto.ProjectResponse toResponse(Project project, Long requestingUserId) {
        ProjectDto.ProjectResponse response = new ProjectDto.ProjectResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setStatus(project.getStatus().name());
        response.setApprovalStatus(project.getApprovalStatus().name());
        response.setColor(project.getColor());
        response.setIcon(project.getIcon());
        response.setOwnerId(project.getOwner().getId());
        response.setOwnerName(project.getOwner().getFirstName() + " " + project.getOwner().getLastName());
        response.setTotalTasks(taskRepository.countByProjectId(project.getId()));
        response.setCompletedTasks(taskRepository.countByProjectIdAndStatus(project.getId(), com.pesira.tasktracker.entity.Task.TaskStatus.DONE));
        response.setMemberCount(project.getMembers().size());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());
        return response;
    }
}
