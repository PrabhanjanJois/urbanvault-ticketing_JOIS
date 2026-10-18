export const getStatusBadgeConfig = (status, isDark = false) => {
  switch (status) {
    case 'PENDING_TECHNICIAN_ASSIGNMENT':
      return {
        label: 'Pending Manager Approval',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        text: isDark ? '#FBBF24' : '#B45309',
        border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
      }
    case 'PENDING_TECHNICIAN_ASSESSMENT':
      return {
        label: 'Pending Technician Assessment',
        bg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF',
        text: isDark ? '#A5B4FC' : '#3730A3',
        border: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
      }
    case 'PENDING_DEPARTMENT_REVIEW':
      return {
        label: 'Pending Department POC Review',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        text: isDark ? '#FCA5A5' : '#991B1B',
        border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
      }
    case 'RESOLVED':
      return {
        label: 'Resolved',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
        text: isDark ? '#6EE7B7' : '#065F46',
        border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
      }
    case 'CLOSED':
      return {
        label: 'Closed',
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
        text: isDark ? '#94A3B8' : '#475569',
        border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      }
    default:
      return {
        label: status,
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
        text: isDark ? '#94A3B8' : '#475569',
        border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0',
      }
  }
}
