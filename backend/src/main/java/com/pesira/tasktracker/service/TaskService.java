package com.pesira.tasktracker.service;

import com.opencsv.CSVWriter;
import com.pesira.tasktracker.dto.PageResponse;
import com.pesira.tasktracker.dto.TaskDto;
import com.pesira.tasktracker.entity.Task;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.entity.Project;
import com.pesira.tasktracker.exception.ResourceNotFoundException;
import com.pesira.tasktracker.repository.ProjectRepository;
import com.pesira.tasktracker.repository.TaskRepository;
import com.pesira.tasktracker.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, ProjectRepository projectRepository,
                       UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public PageResponse<TaskDto.TaskResponse> getTasks(TaskDto.TaskSearchParams params, Long userId) {
        String sortBy = switch (params.getSortBy()) {
            case "title", "status", "priority", "dueDate", "createdAt", "updatedAt" -> params.getSortBy();
            default -> "createdAt";
        };
        int page = Math.max(params.getPage(), 0);
        int size = Math.min(Math.max(params.getSize(), 1), 100);
        Sort sort = params.getSortDir().equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        PageRequest pageRequest = PageRequest.of(page, size, sort);

        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Page<Task> taskPage;
        if (currentUser.getRole() == User.Role.ADMIN) {
            taskPage = taskRepository.searchAllTasksForAdmin(
                    params.getSearch(), params.getStatus(), params.getPriority(),
                    params.getProjectId(), pageRequest);
        } else if (params.getProjectId() != null) {
            taskPage = taskRepository.searchTasks(
                    params.getProjectId(), userId, params.getSearch(),
                    params.getStatus(), params.getPriority(), pageRequest
            );
        } else {
            taskPage = taskRepository.searchAllTasks(
                    userId, params.getSearch(), params.getStatus(),
                    params.getPriority(), null, pageRequest
            );
        }

        List<TaskDto.TaskResponse> content = taskPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return new PageResponse<>(content, page, size,
                taskPage.getTotalElements(), taskPage.getTotalPages(), taskPage.isLast(), taskPage.isFirst());
    }

    public TaskDto.TaskResponse getTaskById(Long id, Long userId) {
        Task task = findTaskOrThrow(id);
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (currentUser.getRole() != User.Role.ADMIN) {
            checkProjectAccess(task, userId);
        }
        return toResponse(task);
    }

    @Transactional
    public TaskDto.TaskResponse createTask(TaskDto.CreateRequest request, Long createdById) {
        var project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));
        checkProjectAccess(project, createdById);
        var createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("User", createdById));

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("User (assignee)", request.getAssigneeId()));
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : Task.TaskStatus.TODO)
                .priority(request.getPriority() != null ? request.getPriority() : Task.Priority.MEDIUM)
                .dueDate(request.getDueDate())
                .project(project)
                .assignee(assignee)
                .createdBy(createdBy)
                .approvalStatus(createdBy.getRole() == User.Role.ADMIN
                        ? Task.ApprovalStatus.APPROVED : Task.ApprovalStatus.PENDING)
                .tags(request.getTags())
                .build();

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.TaskResponse updateTask(Long id, TaskDto.UpdateRequest request, Long userId) {
        Task task = findTaskOrThrow(id);
        checkProjectAccess(task, userId);

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getStatus() != null) task.setStatus(request.getStatus());
        if (request.getPriority() != null) task.setPriority(request.getPriority());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getTags() != null) task.setTags(request.getTags());

        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("User (assignee)", request.getAssigneeId()));
            task.setAssignee(assignee);
        }

        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long id, Long userId) {
        Task task = findTaskOrThrow(id);
        checkProjectAccess(task, userId);
        taskRepository.delete(task);
    }

    public List<TaskDto.TaskResponse> getPendingTasks() {
        return taskRepository.findByApprovalStatus(Task.ApprovalStatus.PENDING).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TaskDto.TaskResponse reviewTask(Long id, boolean approved) {
        Task task = findTaskOrThrow(id);
        task.setApprovalStatus(approved ? Task.ApprovalStatus.APPROVED : Task.ApprovalStatus.REJECTED);
        return toResponse(taskRepository.save(task));
    }

    // --- Export Methods ---

    public List<TaskDto.TaskResponse> exportTasksAsJson(Long projectId, Long userId) {
        checkProjectAccess(projectId, userId);
        return taskRepository.findByProjectId(projectId).stream()
                .map(this::toResponse)
                .toList();
    }

    public String exportTasksAsCsv(Long projectId, Long userId) throws Exception {
        checkProjectAccess(projectId, userId);
        List<Task> tasks = taskRepository.findByProjectId(projectId);
        StringWriter sw = new StringWriter();

        try (CSVWriter writer = new CSVWriter(sw)) {
            // Header
            writer.writeNext(new String[]{"ID", "Title", "Status", "Priority", "Due Date",
                    "Assignee", "Project", "Tags", "Created At"});

            // Data rows
            for (Task task : tasks) {
                writer.writeNext(new String[]{
                        String.valueOf(task.getId()),
                        task.getTitle(),
                        task.getStatus().name(),
                        task.getPriority().name(),
                        task.getDueDate() != null ? task.getDueDate().toString() : "",
                        task.getAssignee() != null ? task.getAssignee().getUsername() : "",
                        task.getProject().getName(),
                        task.getTags() != null ? task.getTags() : "",
                        task.getCreatedAt().toString()
                });
            }
        }
        return sw.toString();
    }

    public List<TaskDto.TaskResponse> exportAllAsJson(
            String search, String status, String priority, Long userId) {
        return findAccessibleTasks(search, status, priority, userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public String exportAllAsCsv(
            String search, String status, String priority, Long userId) throws Exception {
        StringWriter sw = new StringWriter();
        try (CSVWriter writer = new CSVWriter(sw)) {
            writer.writeNext(new String[]{"ID", "Title", "Status", "Priority", "Due Date",
                    "Assignee", "Project", "Tags", "Created At"});
            for (Task task : findAccessibleTasks(search, status, priority, userId)) {
                writer.writeNext(new String[]{
                        String.valueOf(task.getId()),
                        task.getTitle(),
                        task.getStatus().name(),
                        task.getPriority().name(),
                        task.getDueDate() != null ? task.getDueDate().toString() : "",
                        task.getAssignee() != null ? task.getAssignee().getUsername() : "",
                        task.getProject().getName(),
                        task.getTags() != null ? task.getTags() : "",
                        task.getCreatedAt().toString()
                });
            }
        }
        return sw.toString();
    }

    private List<Task> findAccessibleTasks(
            String search, String status, String priority, Long userId) {
        return taskRepository.searchAllTasks(
                userId, search, status, priority, null, Pageable.unpaged()).getContent();
    }

    private Task findTaskOrThrow(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }

    private void checkProjectAccess(Task task, Long userId) {
        boolean isCreator = task.getCreatedBy() != null
                && task.getCreatedBy().getId().equals(userId);
        if (task.getApprovalStatus() != Task.ApprovalStatus.APPROVED && !isCreator) {
            throw new AccessDeniedException("This task is awaiting administrator approval");
        }
        checkProjectAccess(task.getProject(), userId);
    }

    private void checkProjectAccess(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        checkProjectAccess(project, userId);
    }

    private void checkProjectAccess(Project project, Long userId) {
        if (project.getApprovalStatus() != Project.ApprovalStatus.APPROVED) {
            throw new AccessDeniedException("This project is awaiting administrator approval");
        }
        boolean owner = project.getOwner().getId().equals(userId);
        boolean member = project.getMembers().stream()
                .anyMatch(projectMember -> projectMember.getUser().getId().equals(userId));
        if (!owner && !member) {
            throw new AccessDeniedException("You don't have access to this project");
        }
    }

    private TaskDto.TaskResponse toResponse(Task task) {
        TaskDto.TaskResponse response = new TaskDto.TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setStatus(task.getStatus().name());
        response.setApprovalStatus(task.getApprovalStatus().name());
        response.setPriority(task.getPriority().name());
        response.setDueDate(task.getDueDate());
        response.setProjectId(task.getProject().getId());
        response.setProjectName(task.getProject().getName());
        response.setProjectColor(task.getProject().getColor());
        response.setTags(task.getTags());
        response.setCreatedAt(task.getCreatedAt());
        response.setUpdatedAt(task.getUpdatedAt());

        if (task.getAssignee() != null) {
            response.setAssigneeId(task.getAssignee().getId());
            response.setAssigneeName(task.getAssignee().getFirstName() + " " + task.getAssignee().getLastName());
            response.setAssigneeAvatar(task.getAssignee().getAvatarUrl());
        }

        if (task.getCreatedBy() != null) {
            response.setCreatedById(task.getCreatedBy().getId());
            response.setCreatedByName(task.getCreatedBy().getFirstName() + " " + task.getCreatedBy().getLastName());
        }

        return response;
    }
}
