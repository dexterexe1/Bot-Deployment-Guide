import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest, isApiError } from '@/lib/api'
import type {
  ApplicationForm,
  ApplicationSubmission,
  ApplicationCounts,
  GuildSummary,
  GuildOverview,
  GuildResourceSnapshot,
} from '@/types/application'

// ── Application Forms ────────────────────────────────────

export function useApplicationForms(guildId: string) {
  return useQuery({
    queryKey: ['applicationForms', guildId],
    queryFn: async (): Promise<ApplicationForm[]> => {
      const result = await apiRequest<ApplicationForm[]>(`/applications/forms?guildId=${guildId}`)
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId,
  })
}

export function useApplicationForm(guildId: string, formId: string) {
  return useQuery({
    queryKey: ['applicationForm', guildId, formId],
    queryFn: async (): Promise<ApplicationForm> => {
      const result = await apiRequest<ApplicationForm>(`/applications/forms/${formId}?guildId=${guildId}`)
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId && !!formId,
  })
}

export function useCreateApplicationForm(guildId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<ApplicationForm>) => {
      const result = await apiRequest<ApplicationForm>('/applications/forms', {
        method: 'POST',
        body: JSON.stringify({ guildId, ...data }),
      })
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicationForms', guildId] }),
  })
}

export function useUpdateApplicationForm(guildId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ApplicationForm> & { id: string }) => {
      const result = await apiRequest<ApplicationForm>(`/applications/forms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, guildId }),
      })
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicationForms', guildId] })
    },
  })
}

export function useDeleteApplicationForm(guildId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formId: string) => {
      const result = await apiRequest(`/applications/forms/${formId}?guildId=${guildId}`, {
        method: 'DELETE',
      })
      if (isApiError(result)) throw new Error(result.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicationForms', guildId] }),
  })
}

export function useDeployApplicationForm(guildId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formId: string) => {
      const result = await apiRequest<ApplicationForm>(`/applications/forms/${formId}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ guildId }),
      })
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicationForms', guildId] }),
  })
}

// ── Application Submissions ──────────────────────────────

export function useApplicationSubmissions(guildId: string, formId: string) {
  return useQuery({
    queryKey: ['applicationSubmissions', guildId, formId],
    queryFn: async (): Promise<ApplicationSubmission[]> => {
      const result = await apiRequest<ApplicationSubmission[]>(
        `/applications/submissions?guildId=${guildId}&formId=${formId}`,
      )
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId && !!formId,
  })
}

export function useApplicationSubmissionDetail(guildId: string, submissionId: string) {
  return useQuery({
    queryKey: ['applicationSubmission', guildId, submissionId],
    queryFn: async (): Promise<ApplicationSubmission> => {
      const result = await apiRequest<ApplicationSubmission>(
        `/applications/submissions/${submissionId}?guildId=${guildId}`,
      )
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId && !!submissionId,
  })
}

export function useUpdateSubmissionStatus(guildId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const result = await apiRequest<ApplicationSubmission>(`/applications/submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ guildId, formId, status }),
      })
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicationSubmissions', guildId, formId] })
      qc.invalidateQueries({ queryKey: ['applicationForms', guildId] })
    },
  })
}

// ── Application Counts ───────────────────────────────────

export function useApplicationCounts(guildId: string, formId: string) {
  return useQuery({
    queryKey: ['applicationCounts', guildId, formId],
    queryFn: async (): Promise<ApplicationCounts> => {
      const result = await apiRequest<ApplicationCounts>(
        `/applications/forms/${formId}/counts?guildId=${guildId}`,
      )
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId && !!formId,
  })
}

// ── Guilds ───────────────────────────────────────────────

export function useManageableGuilds() {
  return useQuery({
    queryKey: ['manageableGuilds'],
    queryFn: async (): Promise<GuildSummary[]> => {
      const result = await apiRequest<{ guilds: GuildSummary[] }>('/guilds')
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data.guilds
    },
  })
}

export function useGuildOverview(guildId: string) {
  return useQuery({
    queryKey: ['guildOverview', guildId],
    queryFn: async (): Promise<GuildOverview> => {
      const result = await apiRequest<GuildOverview>(`/guilds/${guildId}/overview`)
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId,
  })
}

export function useGuildResources(guildId: string) {
  return useQuery({
    queryKey: ['guildResources', guildId],
    queryFn: async (): Promise<GuildResourceSnapshot> => {
      const result = await apiRequest<GuildResourceSnapshot>(`/guilds/${guildId}/resources`)
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!guildId,
  })
}

// ── Session ──────────────────────────────────────────────

export function useSessionUser() {
  return useQuery({
    queryKey: ['sessionUser'],
    queryFn: async () => {
      const result = await apiRequest<{ user: { discordUserId: string; username: string; globalName?: string | null; avatar?: string | null } }>('/auth/me')
      if (isApiError(result)) throw new Error(result.error.message)
      return result.data.user
    },
    retry: false,
  })
}
