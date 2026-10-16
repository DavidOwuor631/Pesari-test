package com.pesira.tasktracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_members")
@Getter
@Setter
@Builder
public class ProjectMember {

    @EmbeddedId
    private ProjectMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("projectId")
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberRole role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    public ProjectMember() {
    }

    public ProjectMember(ProjectMemberId id, Project project, User user, MemberRole role,
                         LocalDateTime joinedAt) {
        this.id = id;
        this.project = project;
        this.user = user;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
        if (role == null) role = MemberRole.MEMBER;
    }

    public enum MemberRole {
        OWNER, ADMIN, MEMBER, VIEWER
    }

    @Embeddable
    @Getter
    @Setter
    @EqualsAndHashCode
    public static class ProjectMemberId implements java.io.Serializable {
        @Column(name = "project_id")
        private Long projectId;
        @Column(name = "user_id")
        private Long userId;

        public ProjectMemberId() {
        }

        public ProjectMemberId(Long projectId, Long userId) {
            this.projectId = projectId;
            this.userId = userId;
        }
    }
}
