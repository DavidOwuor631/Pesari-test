package com.pesira.tasktracker.repository;

import com.pesira.tasktracker.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    // Find all projects where user is owner OR member
    @Query("""
        SELECT DISTINCT p FROM Project p
        LEFT JOIN p.members m
        WHERE (p.approvalStatus = 'APPROVED' OR p.owner.id = :userId)
          AND (p.owner.id = :userId OR m.user.id = :userId)
        ORDER BY p.updatedAt DESC
    """)
    List<Project> findByUserAccess(@Param("userId") Long userId);

    @Query("""
        SELECT DISTINCT p FROM Project p
        LEFT JOIN p.members m
        WHERE (p.approvalStatus = 'APPROVED' OR p.owner.id = :userId)
          AND (p.owner.id = :userId OR m.user.id = :userId)
        AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<Project> findByUserAccessWithSearch(
        @Param("userId") Long userId,
        @Param("search") String search,
        Pageable pageable
    );

    List<Project> findByOwnerId(Long ownerId);

    long countByOwnerId(Long ownerId);

    List<Project> findByApprovalStatus(Project.ApprovalStatus status);

    @Query("""
        SELECT p FROM Project p
        ORDER BY p.updatedAt DESC
    """)
    List<Project> findAllForAdmin();

    @Query("""
        SELECT p FROM Project p
        WHERE (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
    """)
    Page<Project> findAllForAdminWithSearch(
        @Param("search") String search,
        Pageable pageable
    );
}
