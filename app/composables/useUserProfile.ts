export function useUserProfile() {
  // Derive the display name from the shared Firebase session for every component.
  const { user } = useFirebaseAuth()
  const name = computed(() => user.value?.displayName?.trim() || user.value?.email?.split('@')[0] || 'Angler')

  return { name }
}
