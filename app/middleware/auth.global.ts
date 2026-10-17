export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || import.meta.server) return

  const { initialize, user } = useFirebaseAuth()
  await initialize()
  if (!user.value) return navigateTo('/login')
})
