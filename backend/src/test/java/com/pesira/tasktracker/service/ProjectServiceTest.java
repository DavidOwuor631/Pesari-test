package com.pesira.tasktracker.service;

import com.pesira.tasktracker.dto.ProjectDto;
import com.pesira.tasktracker.entity.Project;
import com.pesira.tasktracker.entity.User;
import com.pesira.tasktracker.repository.ProjectRepository;
import com.pesira.tasktracker.repository.TaskRepository;
import com.pesira.tasktracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    private ProjectService projectService;
    private User user;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, taskRepository, userRepository);
        user = User.builder()
                .id(2L)
                .username("demo_user")
                .firstName("Demo")
                .lastName("User")
                .role(User.Role.USER)
                .build();
        when(taskRepository.countByProjectId(any())).thenReturn(0L);
        when(taskRepository.countByProjectIdAndStatus(any(), any())).thenReturn(0L);
    }

    @Test
    void regularUserCreatesPendingProject() {
        ProjectDto.CreateRequest request = new ProjectDto.CreateRequest();
        request.setName("New user project");
        request.setDescription("Project submitted for review");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project project = invocation.getArgument(0);
            project.setId(10L);
            return project;
        });

        ProjectDto.ProjectResponse response = projectService.createProject(request, 2L);

        assertEquals("PENDING", response.getApprovalStatus());
        assertEquals("Project submitted for review", response.getDescription());
    }

    @Test
    void approvingProjectMakesItActive() {
        Project project = Project.builder()
                .id(10L)
                .name("Pending project")
                .status(Project.ProjectStatus.PLANNING)
                .approvalStatus(Project.ApprovalStatus.PENDING)
                .owner(user)
                .build();
        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
        when(projectRepository.save(project)).thenReturn(project);

        ProjectDto.ProjectResponse response = projectService.reviewProject(10L, true);

        assertEquals(Project.ApprovalStatus.APPROVED, project.getApprovalStatus());
        assertEquals(Project.ProjectStatus.ACTIVE, project.getStatus());
        assertEquals("APPROVED", response.getApprovalStatus());
        assertEquals("ACTIVE", response.getStatus());
    }
}
