// Provides the current user's display name; takes no input and returns a reactive name with a safe fallback.
export function useUserProfile() {
  // Derive the display name from the shared Firebase session for every component.
  const { user } = useFirebaseAuth()
  const name = computed(() => user.value?.displayName?.trim() || user.value?.email?.split('@')[0] || 'Angler')

  return { name }
}
