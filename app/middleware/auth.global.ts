export default defineNuxtRouteMiddleware(async (to) => {
  // Let visitors reach sign-in; all other app routes require a resolved Firebase session.
  if (to.path === '/login' || import.meta.server) return

  const { initialize, user } = useFirebaseAuth()
  await initialize()
  if (!user.value) return navigateTo('/login')
})
