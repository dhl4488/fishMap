export function useUserProfile() {
  const { user } = useFirebaseAuth()
  const name = computed(() => user.value?.displayName?.trim() || user.value?.email?.split('@')[0] || 'Angler')

  return { name }
}
