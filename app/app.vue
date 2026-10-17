<script setup lang="ts">
const route = useRoute()

const navigation = [
  { label: 'Overview', to: '/', icon: '◫' },
  { label: 'My diary', to: '/logs', icon: '▤' },
  { label: 'Fishing spots', to: '/maps', icon: '⌖' }
]
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <NuxtLink to="/" class="brand" aria-label="Tidelog home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8.3C9.5 6.9 6.7 6.5 4 7.3v11c2.8-.8 5.5-.4 8 1.1V8.3Z" fill="#f3f6ef" stroke="currentColor" stroke-linejoin="round" stroke-width="1.2" />
            <path d="M12 8.3c2.5-1.4 5.2-1.8 8-1v11c-2.7-.8-5.4-.4-8 1.1V8.3Z" fill="#e5ede3" stroke="currentColor" stroke-linejoin="round" stroke-width="1.2" />
            <path d="M6.5 10.2c1.5-.2 2.8 0 4 .6M6.5 12.5c1.4-.1 2.8.2 4 .8m7-3.7c-1.4-.1-2.8.1-4 .7m4 1.6c-1.4 0-2.8.3-4 1" stroke="#9db49f" stroke-linecap="round" stroke-width=".8" />
            <!-- Draw the rod over the journal so the two parts remain distinct at icon size. -->
            <path d="m4.8 19.3 12-13.5c.5-.6 1.4-.7 1.9-.2.4.4.5 1 .2 1.5l-.4.7" stroke="#193b2e" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            <path d="M19 7.7c-.1 3-.6 5.4-1.8 7.4" stroke="#efc477" stroke-linecap="round" stroke-width="1.4" />
            <path d="M17.2 15c-.8.7-.7 1.9.1 2.1.6.1 1-.3.7-.8" stroke="#efc477" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
          </svg>
        </span>
        <span class="brand-name">tidelog<span class="brand-period">.</span></span>
      </NuxtLink>

      <div class="sidebar-caption">YOUR SPACE</div>
      <nav class="main-nav" aria-label="Main navigation">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'nav-link-active': route.path === item.to }"
        >
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="season-card">
          <div class="season-icon">✳</div>
          <p class="season-title">A little reminder</p>
          <p class="season-copy">The best stories start before the first bite.</p>
        </div>
        <div class="profile">
          <div class="avatar">A</div>
          <div class="profile-text"><strong>Daniel Lee</strong><span>Weekend angler</span></div>
          <span class="profile-menu">···</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  font-family: 'DM Sans', sans-serif;
  color: #1d2925;
  background: #f7f8f5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --ink: #1d2925;
  --muted: #82908a;
  --green: #316b53;
  --green-dark: #244e3d;
  --mint: #eaf2ec;
  --line: #e9ece7;
  --paper: #fff;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: #f7f8f5; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
a { color: inherit; text-decoration: none; }

.app-shell { min-height: 100vh; }
.sidebar {
  background: #fff;
  border-right: 1px solid #eef0ec;
  bottom: 0;
  display: flex;
  flex-direction: column;
  left: 0;
  padding: 30px 20px 18px;
  position: fixed;
  top: 0;
  width: 248px;
  z-index: 5;
}
.brand { align-items: center; display: flex; gap: 9px; margin: 2px 0 53px 9px; }
.brand-mark { align-items: center; background: #2f684f; border-radius: 11px; color: white; display: flex; height: 37px; justify-content: center; width: 37px; }
.brand-mark svg { height: 23px; width: 23px; }
.brand-name { font: 800 22px/1 Manrope,sans-serif; letter-spacing: -1.1px; }
.brand-period { color: #82aa80; }
.sidebar-caption { color: #a0aaa4; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; margin: 0 0 14px 12px; }
.main-nav { display: grid; gap: 5px; }
.nav-link { align-items: center; border-radius: 9px; color: #727f78; display: flex; font-size: 13px; font-weight: 600; gap: 13px; padding: 12px 13px; transition: background .18s,color .18s; }
.nav-link:hover { background: #f5f7f3; color: var(--ink); }
.nav-link-active, .nav-link-active:hover { background: #edf4ee; color: #2f684f; }
.nav-icon { font-size: 18px; font-weight: 400; line-height: 1; text-align: center; width: 19px; }
.sidebar-bottom { margin-top: auto; }
.season-card { background: #f5f7f2; border: 1px solid #eff1eb; border-radius: 12px; margin: 0 0 19px; padding: 15px 14px 14px; }
.season-icon { align-items: center; background: #e4eee4; border-radius: 7px; color: #54795d; display: flex; font-size: 17px; height: 29px; justify-content: center; width: 29px; }
.season-title { font-size: 12px; font-weight: 700; margin: 12px 0 4px; }
.season-copy { color: #82908a; font-size: 11px; line-height: 1.55; margin: 0; }
.profile { align-items: center; border-top: 1px solid #eef0ec; display: flex; gap: 10px; padding: 16px 3px 0; }
.avatar { align-items: center; background: #e8d3bd; border-radius: 50%; color: #69523f; display: flex; font-size: 13px; font-weight: 700; height: 34px; justify-content: center; width: 34px; }
.profile-text { display: grid; gap: 3px; }
.profile-text strong { font-size: 11px; }
.profile-text span { color: #8b9690; font-size: 10px; }
.profile-menu { color: #818e87; font-size: 19px; margin-left: auto; }
.main-content { margin-left: 248px; min-height: 100vh; padding: 0 54px 56px; }

.page-wrap { margin: 0 auto; max-width: 1110px; }
.topbar { align-items: center; border-bottom: 1px solid var(--line); display: flex; height: 72px; justify-content: space-between; margin-bottom: 36px; }
.breadcrumb { color: #94a099; font-size: 12px; }
.breadcrumb strong { color: #44534b; font-weight: 600; }
.topbar-right { align-items: center; display: flex; gap: 18px; }
.today-label { color: #7f8b84; font-size: 11px; }
.icon-button { align-items: center; background: white; border: 1px solid #e8ece7; border-radius: 9px; color: #64726a; display: flex; height: 35px; justify-content: center; position: relative; width: 35px; }
.icon-button .notification-dot { background: #d68d6f; border: 2px solid white; border-radius: 50%; height: 8px; position: absolute; right: 7px; top: 6px; width: 8px; }
.page-heading { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 24px; }
.eyebrow { color: #71917d; font-size: 10px; font-weight: 700; letter-spacing: 1.25px; margin: 0 0 9px; text-transform: uppercase; }
h1,h2,h3,p { margin-top: 0; }
.page-heading h1 { font: 700 29px/1.2 Manrope,sans-serif; letter-spacing: -1px; margin: 0; }
.page-heading .subtitle { color: #88938d; font-size: 13px; margin: 8px 0 0; }
.primary-button { align-items: center; background: var(--green); border: 0; border-radius: 8px; color: #fff; display: inline-flex; font-size: 12px; font-weight: 600; gap: 8px; justify-content: center; padding: 11px 15px; transition: background .18s,transform .18s; }
.primary-button:hover { background: var(--green-dark); transform: translateY(-1px); }
.primary-button .plus { font-size: 17px; font-weight: 400; line-height: 10px; }
.secondary-button { align-items: center; background: white; border: 1px solid #e4e9e3; border-radius: 8px; color: #536158; display: inline-flex; font-size: 11px; font-weight: 600; gap: 7px; justify-content: center; padding: 9px 12px; }
.secondary-button:hover { border-color: #a6b9a8; }
.section-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 14px; }
.section-heading h2 { font: 700 15px Manrope,sans-serif; letter-spacing: -.25px; margin: 0; }
.section-heading a,.text-button { background: none; border: 0; color: #63836d; font-size: 11px; font-weight: 600; padding: 4px 0; }
.section-heading a:hover,.text-button:hover { color: var(--green-dark); }
.panel { background: white; border: 1px solid #ecefea; border-radius: 12px; }

.stats-grid { display: grid; gap: 13px; grid-template-columns: repeat(4,minmax(0,1fr)); margin-bottom: 27px; }
.stat-card { background: #fff; border: 1px solid #ecefea; border-radius: 11px; min-height: 109px; padding: 16px 17px; }
.stat-top { align-items: center; color: #7f8c85; display: flex; font-size: 10px; justify-content: space-between; }
.stat-icon { align-items: center; background: #eef4ed; border-radius: 7px; color: #5d8063; display: flex; font-size: 14px; height: 27px; justify-content: center; width: 27px; }
.stat-value { align-items: baseline; display: flex; gap: 7px; margin-top: 10px; }
.stat-value strong { font: 700 22px Manrope,sans-serif; letter-spacing: -.8px; }
.stat-value span { color: #92a097; font-size: 10px; }
.dashboard-grid { display: grid; gap: 22px; grid-template-columns: minmax(0,1.55fr) minmax(275px,.95fr); }
.trip-list { display: grid; }
.trip-row { align-items: center; border-bottom: 1px solid #f0f2ee; display: flex; gap: 14px; padding: 14px 0; }
.trip-row:first-child { padding-top: 3px; }
.trip-row:last-child { border-bottom: 0; padding-bottom: 3px; }
.trip-date-box { align-items: center; background: #f4f6f2; border-radius: 8px; color: #77847c; display: flex; flex-direction: column; flex: 0 0 46px; height: 48px; justify-content: center; }
.trip-date-box strong { color: #47554d; font: 700 16px Manrope,sans-serif; line-height: 1.1; }
.trip-date-box span { font-size: 8px; letter-spacing: .6px; margin-top: 3px; text-transform: uppercase; }
.trip-row-main { min-width: 0; }
.trip-row-main h3 { font-size: 12px; font-weight: 700; margin: 0 0 5px; }
.trip-row-main p { color: #8a9690; font-size: 10px; margin: 0; }
.catch-count { background: #f0f5ef; border-radius: 20px; color: #53765d; font-size: 10px; font-weight: 600; margin-left: auto; padding: 6px 9px; white-space: nowrap; }
.empty-state { align-items: center; color: #89958e; display: flex; flex-direction: column; font-size: 12px; gap: 8px; padding: 32px 0; text-align: center; }
.empty-state span { font-size: 23px; }
.spot-list { display: grid; gap: 10px; }
.spot-card { align-items: center; background: #fff; border: 1px solid #ecefea; border-radius: 10px; display: flex; gap: 11px; padding: 12px; }
.spot-thumb { align-items: center; background: #e9f1eb; border-radius: 8px; color: #4f7960; display: flex; flex: 0 0 40px; font-size: 18px; height: 40px; justify-content: center; }
.spot-card h3 { font-size: 11px; font-weight: 700; margin: 0 0 4px; }
.spot-card p { color: #8a9690; font-size: 9px; margin: 0; }
.spot-arrow { color: #a0aaa4; font-size: 18px; margin-left: auto; }
.dashboard-map-link { align-items: center; background: #eaf1eb; border-radius: 9px; color: #587661; display: flex; font-size: 10px; font-weight: 600; justify-content: center; margin-top: 10px; padding: 10px; }
.dashboard-map-link:hover { background: #e1ebe2; }

.toolbar-row { align-items: center; display: flex; gap: 10px; margin: 0 0 16px; }
.search-box { align-items: center; background: white; border: 1px solid #e7ebe6; border-radius: 8px; color: #89958e; display: flex; flex: 1; gap: 8px; max-width: 340px; padding: 0 11px; }
.search-box input { background: transparent; border: 0; color: var(--ink); font-size: 11px; height: 36px; outline: 0; width: 100%; }
.search-box input::placeholder { color: #a2aca6; }
.filter-select { background: white; border: 1px solid #e7ebe6; border-radius: 8px; color: #75827a; font-size: 11px; padding: 10px; }
.diary-list { display: grid; gap: 11px; }
.diary-entry { padding: 17px 19px; }
.entry-header { align-items: flex-start; display: flex; justify-content: space-between; }
.entry-heading { align-items: center; display: flex; gap: 12px; }
.entry-heading .trip-date-box { flex-basis: 45px; }
.entry-heading h2 { font: 700 13px Manrope,sans-serif; margin: 0 0 5px; }
.entry-heading p { color: #89958e; font-size: 10px; margin: 0; }
.entry-catches { border-top: 1px solid #f0f2ee; display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; padding-top: 12px; }
.catch-chip { background: #f5f7f4; border-radius: 5px; color: #6f7e74; font-size: 9px; padding: 5px 8px; }
.entry-notes { color: #718078; font-size: 11px; line-height: 1.6; margin: 12px 0 0; }
.entry-weather { color: #96a19b; font-size: 10px; }
.empty-panel { padding: 45px 20px; }

.map-layout { display: grid; gap: 17px; grid-template-columns: minmax(0,1.7fr) minmax(260px,.8fr); }
.map-panel { background: #e5eee9; border: 1px solid #dfe8e1; border-radius: 12px; min-height: 490px; overflow: hidden; position: relative; }
.map-panel iframe { border: 0; display: block; height: 490px; width: 100%; }
.map-attribution { background: rgba(255,255,255,.88); border-radius: 4px; bottom: 10px; color: #62736a; font-size: 9px; padding: 5px 7px; position: absolute; right: 9px; }
.map-attribution a { color: #4d7460; }
.map-side { align-self: start; display: grid; gap: 12px; }
.spot-summary { padding: 17px; }
.spot-summary-head { align-items: flex-start; display: flex; justify-content: space-between; }
.spot-summary h2 { font: 700 14px Manrope,sans-serif; margin: 0 0 5px; }
.spot-summary .spot-kind { color: #8b9790; font-size: 10px; margin: 0; }
.favorite-heart { align-items: center; background: #f3f6f2; border-radius: 7px; color: #6b8c72; display: flex; font-size: 16px; height: 31px; justify-content: center; width: 31px; }
.coordinate-row { border-top: 1px solid #eff1ed; color: #76837b; display: flex; font-size: 10px; justify-content: space-between; margin-top: 14px; padding-top: 12px; }
.spot-notes { color: #85928a; font-size: 10px; line-height: 1.55; margin: 12px 0 0; }
.spot-browser { padding: 15px; }
.spot-browser .section-heading { margin-bottom: 10px; }
.spot-browser .section-heading h2 { font-size: 12px; }
.spot-select { background: transparent; border: 0; border-radius: 8px; color: #5e6c63; display: flex; font-size: 10px; gap: 9px; padding: 9px 7px; text-align: left; width: 100%; }
.spot-select:hover,.spot-select-active { background: #f0f5ef; }
.spot-pin { align-items: center; background: #e4eee5; border-radius: 6px; color: #54795d; display: flex; flex: 0 0 28px; font-size: 12px; height: 28px; justify-content: center; }
.spot-select-copy { display: grid; gap: 3px; min-width: 0; }
.spot-select-copy strong { color: #425148; font-size: 10px; }
.spot-select-copy span { color: #8d9992; font-size: 9px; }
.map-hint { background: #f3f6f1; border-radius: 8px; color: #76857b; font-size: 10px; line-height: 1.55; padding: 11px; }

.modal-backdrop { align-items: center; background: rgba(21,33,27,.42); display: flex; inset: 0; justify-content: center; padding: 18px; position: fixed; z-index: 20; }
.modal { background: #fff; border-radius: 14px; box-shadow: 0 20px 65px rgba(20,40,27,.2); max-height: calc(100vh - 36px); max-width: 500px; overflow: auto; padding: 25px; width: 100%; }
.modal-header { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 20px; }
.modal-header h2 { font: 700 20px Manrope,sans-serif; letter-spacing: -.5px; margin: 0 0 5px; }
.modal-header p { color: #89958e; font-size: 11px; margin: 0; }
.modal-close { background: #f3f5f2; border: 0; border-radius: 7px; color: #78857d; font-size: 18px; height: 30px; width: 30px; }
.form-grid { display: grid; gap: 13px; grid-template-columns: 1fr 1fr; }
.form-field { display: grid; gap: 6px; }
.form-field-full { grid-column: 1/-1; }
.form-field label { color: #58675e; font-size: 10px; font-weight: 600; }
.form-field input,.form-field select,.form-field textarea { background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #34433a; font-size: 11px; outline: 0; padding: 10px; width: 100%; }
.form-field input:focus,.form-field select:focus,.form-field textarea:focus { border-color: #87a88c; box-shadow: 0 0 0 3px #eaf2eb; }
.form-field textarea { min-height: 78px; resize: vertical; }
.form-actions { display: flex; gap: 9px; justify-content: flex-end; margin-top: 19px; }
.cancel-button { background: white; border: 1px solid #e3e8e2; border-radius: 8px; color: #65736a; font-size: 11px; padding: 10px 14px; }
.toast { animation: toast-in .2s ease-out; background: #244e3d; border-radius: 9px; bottom: 22px; box-shadow: 0 8px 22px #19382733; color: #fff; font-size: 12px; padding: 12px 16px; position: fixed; right: 22px; z-index: 30; }
@keyframes toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1050px) {
  .sidebar { width: 218px; }
  .main-content { margin-left: 218px; padding-left: 32px; padding-right: 32px; }
  .stats-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .dashboard-grid { grid-template-columns: minmax(0,1.2fr) minmax(250px,.8fr); }
}
@media (max-width: 760px) {
  .sidebar { bottom: auto; height: 62px; padding: 0 16px; right: 0; top: 0; width: 100%; flex-direction: row; align-items: center; border-bottom: 1px solid #eef0ec; border-right: 0; }
  .brand { margin: 0 auto 0 0; }
  .brand-mark { border-radius: 8px; height: 32px; width: 32px; }
  .brand-name { font-size: 19px; }
  .sidebar-caption,.sidebar-bottom { display: none; }
  .main-nav { display: flex; gap: 4px; }
  .nav-link { font-size: 0; gap: 0; height: 36px; justify-content: center; padding: 6px; width: 38px; }
  .nav-icon { font-size: 17px; }
  .main-content { margin-left: 0; padding: 62px 19px 35px; }
  .topbar { height: 58px; margin-bottom: 27px; }
  .today-label { display: none; }
  .dashboard-grid,.map-layout { grid-template-columns: 1fr; }
  .map-panel,.map-panel iframe { min-height: 370px; height: 370px; }
  .map-side { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 500px) {
  .main-content { padding-left: 15px; padding-right: 15px; }
  .page-heading { align-items: flex-start; gap: 12px; }
  .page-heading h1 { font-size: 24px; }
  .page-heading .subtitle { font-size: 11px; line-height: 1.45; }
  .page-heading > .primary-button { font-size: 0; padding: 11px; }
  .page-heading > .primary-button .plus { font-size: 19px; }
  .stats-grid { gap: 8px; }
  .stat-card { min-height: 97px; padding: 12px; }
  .stat-value strong { font-size: 20px; }
  .dashboard-grid { gap: 25px; }
  .map-side { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .form-field-full { grid-column: auto; }
}
</style>
