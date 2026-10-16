package com.pesira.tasktracker.repository;

import com.pesira.tasktracker.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    Page<Task> findByProjectId(Long projectId, Pageable pageable);

    @Query("""
        SELECT t FROM Task t
        WHERE t.project.approvalStatus = 'APPROVED'
        AND (t.approvalStatus = 'APPROVED' OR t.createdBy.id = :userId)
        AND t.project.id = :projectId
        AND (t.project.owner.id = :userId OR EXISTS (
            SELECT 1 FROM ProjectMember pm
            WHERE pm.project.id = t.project.id AND pm.user.id = :userId
        ))
        AND (:search IS NULL OR :search = ''
             OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:status IS NULL OR CAST(t.status AS string) = :status)
        AND (:priority IS NULL OR CAST(t.priority AS string) = :priority)
    """)
    Page<Task> searchTasks(
        @Param("projectId") Long projectId,
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("status") String status,
        @Param("priority") String priority,
        Pageable pageable
    );

    @Query("""
        SELECT t FROM Task t
        WHERE t.project.approvalStatus = 'APPROVED'
        AND (t.approvalStatus = 'APPROVED' OR t.createdBy.id = :userId)
        AND (t.project.owner.id = :userId OR EXISTS (
            SELECT 1 FROM ProjectMember pm
            WHERE pm.project.id = t.project.id AND pm.user.id = :userId
        ))
        AND (:search IS NULL OR :search = ''
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:status IS NULL OR CAST(t.status AS string) = :status)
        AND (:priority IS NULL OR CAST(t.priority AS string) = :priority)
        AND (:projectId IS NULL OR t.project.id = :projectId)
    """)
    Page<Task> searchAllTasks(
        @Param("userId") Long userId,
        @Param("search") String search,
        @Param("status") String status,
        @Param("priority") String priority,
        @Param("projectId") Long projectId,
        Pageable pageable
    );

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, Task.TaskStatus status);

    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId")
    List<Task> findByAssigneeId(@Param("userId") Long userId);

    List<Task> findByApprovalStatus(Task.ApprovalStatus status);

    @Query("""
        SELECT t FROM Task t
        WHERE (:search IS NULL OR :search = ''
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:status IS NULL OR CAST(t.status AS string) = :status)
        AND (:priority IS NULL OR CAST(t.priority AS string) = :priority)
        AND (:projectId IS NULL OR t.project.id = :projectId)
        ORDER BY t.updatedAt DESC
    """)
    Page<Task> searchAllTasksForAdmin(
        @Param("search") String search,
        @Param("status") String status,
        @Param("priority") String priority,
        @Param("projectId") Long projectId,
        Pageable pageable
    );
}
