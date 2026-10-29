export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { initialize, user } = useFirebaseAuth()
  await initialize()

  if (to.path === '/landing') {
    if (user.value) return navigateTo('/')
    return
  }

  if (to.path === '/login') {
    if (user.value) return navigateTo('/')
    return
  }

  if (!user.value) return navigateTo('/landing')
})
