package com.pesira.tasktracker.service;

import com.pesira.tasktracker.dto.PageResponse;
import com.pesira.tasktracker.dto.TaskDto;
import com.pesira.tasktracker.entity.Project;
import com.pesira.tasktracker.entity.Task;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.repository.ProjectRepository;
import com.pesira.tasktracker.repository.TaskRepository;
import com.pesira.tasktracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    private TaskService taskService;
    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, projectRepository, userRepository);
        user = User.builder()
                .id(2L)
                .username("demo_user")
                .firstName("Demo")
                .lastName("User")
                .role(User.Role.USER)
                .build();
        project = Project.builder()
                .id(7L)
                .name("Mobile app version 2")
                .status(Project.ProjectStatus.ACTIVE)
                .approvalStatus(Project.ApprovalStatus.APPROVED)
                .owner(user)
                .build();
    }

    @Test
    void regularUserTaskStartsPending() {
        TaskDto.CreateRequest request = new TaskDto.CreateRequest();
        request.setTitle("User-created task");
        request.setProjectId(7L);
        when(projectRepository.findById(7L)).thenReturn(Optional.of(project));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskDto.TaskResponse response = taskService.createTask(request, 2L);

        assertEquals("PENDING", response.getApprovalStatus());
        assertEquals(7L, response.getProjectId());
    }

    @Test
    void creatorCanViewOwnPendingTask() {
        Task task = Task.builder()
                .id(20L)
                .title("Pending task")
                .status(Task.TaskStatus.IN_PROGRESS)
                .approvalStatus(Task.ApprovalStatus.PENDING)
                .priority(Task.Priority.MEDIUM)
                .project(project)
                .createdBy(user)
                .build();
        when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));

        TaskDto.TaskResponse response = taskService.getTaskById(20L, 2L);

        assertEquals("PENDING", response.getApprovalStatus());
        assertEquals("IN_PROGRESS", response.getStatus());
    }

    @Test
    void adminTaskListingPreservesProjectFilter() {
        User admin = User.builder().id(1L).username("admin").role(User.Role.ADMIN).build();
        TaskDto.TaskSearchParams params = new TaskDto.TaskSearchParams();
        params.setProjectId(7L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(taskRepository.searchAllTasksForAdmin(
                any(), any(), any(), eq(7L), any()))
                .thenReturn(new PageImpl<>(List.of()));

        PageResponse<TaskDto.TaskResponse> response = taskService.getTasks(params, 1L);

        assertEquals(0, response.getTotalElements());
        verify(taskRepository).searchAllTasksForAdmin(
                any(), any(), any(), eq(7L), any());
    }
}
