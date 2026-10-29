<script setup lang="ts">
useHead({
  title: 'Tidelog · Your fishing journal',
  meta: [{ name: 'description', content: 'Keep a thoughtful record of your fishing trips, catches, conditions, and favorite spots with Tidelog.' }]
})
</script>

<template>
  <main class="landing-page">
    <header class="landing-header">
      <NuxtLink to="/landing" class="landing-brand" aria-label="Tidelog home">
        <img :src="asset('/assets/tide-log-icon.png')" alt="">
        <span>tidelog<span class="brand-period">.</span></span>
      </NuxtLink>
      <nav aria-label="Account">
        <NuxtLink class="landing-signin" to="/login">Sign in</NuxtLink>
        <NuxtLink class="landing-header-cta" to="/login?mode=create">Create account</NuxtLink>
      </nav>
    </header>

    <section class="landing-hero">
      <p class="landing-eyebrow"><span aria-hidden="true">✳</span> YOUR DAYS ON THE WATER, REMEMBERED</p>
      <h1>Make every fishing trip <span>count.</span></h1>
      <p class="landing-intro">Keep track of where you went, what you caught, and what worked—so the little details don't get away.</p>
      <div class="landing-actions">
        <NuxtLink class="landing-primary" to="/login?mode=create">Start your fishing journal <span aria-hidden="true">→</span></NuxtLink>
        <NuxtLink class="landing-secondary" to="/login">I already have an account</NuxtLink>
      </div>
      <div class="landing-preview" aria-label="What you can record with Tidelog">
        <div class="preview-topline">
          <div class="preview-brand"><span class="preview-mark">⌁</span><strong>Trip log</strong></div>
          <span class="preview-date">A day on the water</span>
        </div>
        <div class="preview-location"><span aria-hidden="true">⌖</span><div><strong>Your favorite spot</strong><small>Location · Conditions · Date</small></div></div>
        <div class="preview-stats">
          <div><span class="preview-stat-icon">♧</span><strong>Your catches</strong><small>Species and fish details</small></div>
          <div><span class="preview-stat-icon">🎣</span><strong>Your setup</strong><small>Lures, rods, and reels</small></div>
          <div><span class="preview-stat-icon">☼</span><strong>Conditions</strong><small>Weather and water notes</small></div>
        </div>
        <p class="preview-note">The more you log, the more you'll remember what made the day.</p>
      </div>
    </section>

    <section class="landing-features" aria-label="Tidelog features">
      <article>
        <span class="feature-icon" aria-hidden="true">▤</span>
        <h2>Keep the details</h2>
        <p>Record catches, conditions, gear, and notes while the day is still fresh.</p>
      </article>
      <article>
        <span class="feature-icon" aria-hidden="true">⌖</span>
        <h2>Remember your spots</h2>
        <p>Save favorite fishing locations and connect them to your trip history.</p>
      </article>
      <article>
        <span class="feature-icon" aria-hidden="true">↗</span>
        <h2>Learn from every trip</h2>
        <p>Look back on what worked and build a fishing journal that's yours.</p>
      </article>
    </section>

    <footer class="landing-footer">
      <span>Made for the days you want to remember.</span>
      <span>Tidelog fishing journal</span>
    </footer>
  </main>
</template>

<style scoped>
.landing-page { background: #f7f8f5; color: #1d2925; min-height: 100vh; padding: 0 clamp(20px, 6vw, 88px); }
.landing-header { align-items: center; display: flex; height: 82px; justify-content: space-between; margin: 0 auto; max-width: 1180px; }
.landing-brand { align-items: center; color: #1d2925; display: flex; font: 800 24px/1 Manrope, sans-serif; gap: 10px; letter-spacing: -1px; }
.landing-brand img { border-radius: 10px; height: 38px; object-fit: cover; width: 38px; }
.brand-period { color: #82aa80; }
.landing-header nav { align-items: center; display: flex; gap: 22px; }
.landing-signin { color: #536158; font-size: 14px; font-weight: 600; }
.landing-header-cta { background: white; border: 1px solid #dfe6de; border-radius: 8px; color: #315f48; font-size: 14px; font-weight: 700; padding: 10px 15px; }
.landing-hero { margin: 0 auto; max-width: 850px; padding: clamp(52px, 8vh, 86px) 0 42px; text-align: center; }
.landing-eyebrow { align-items: center; color: #66836d; display: flex; font-size: 12px; font-weight: 700; gap: 8px; justify-content: center; letter-spacing: 1.25px; margin: 0 0 19px; }
.landing-eyebrow span { color: #83a780; font-size: 17px; }
.landing-hero h1 { font: 700 clamp(38px, 6vw, 64px)/1.08 Manrope, sans-serif; letter-spacing: -2.7px; margin: 0 auto; max-width: 780px; }
.landing-hero h1 span { color: #598263; }
.landing-intro { color: #738078; font-size: 17px; line-height: 1.65; margin: 19px auto 0; max-width: 620px; }
.landing-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 14px 22px; justify-content: center; margin-top: 27px; }
.landing-primary { align-items: center; background: #316b53; border-radius: 9px; box-shadow: 0 5px 14px #316b5324; color: white; display: inline-flex; font-size: 15px; font-weight: 700; gap: 16px; padding: 14px 19px; }
.landing-primary:hover { background: #244e3d; }
.landing-primary span { font-size: 19px; font-weight: 400; }
.landing-secondary { color: #536158; font-size: 14px; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
.landing-preview { background: white; border: 1px solid #e4e9e3; border-radius: 15px; box-shadow: 0 20px 55px #263e2b12; margin: 56px auto 0; max-width: 730px; padding: 23px; text-align: left; }
.preview-topline { align-items: center; border-bottom: 1px solid #edf0eb; display: flex; justify-content: space-between; padding-bottom: 16px; }
.preview-brand { align-items: center; color: #34483c; display: flex; font-size: 15px; gap: 9px; }
.preview-mark { align-items: center; background: #edf4ee; border-radius: 7px; color: #598263; display: flex; font-size: 19px; height: 31px; justify-content: center; width: 31px; }
.preview-date { color: #98a39c; font-size: 12px; }
.preview-location { align-items: center; background: #f8faf7; border-radius: 9px; color: #598263; display: flex; gap: 12px; margin-top: 17px; padding: 13px; }
.preview-location > span { align-items: center; background: #eaf2ec; border-radius: 7px; display: flex; font-size: 18px; height: 36px; justify-content: center; width: 36px; }
.preview-location div,.preview-stats div { display: grid; gap: 4px; }
.preview-location strong,.preview-stats strong { color: #435248; font-size: 13px; }
.preview-location small,.preview-stats small { color: #8a9690; font-size: 12px; }
.preview-stats { display: grid; gap: 11px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 12px; }
.preview-stats > div { background: #fff; border: 1px solid #edf0eb; border-radius: 9px; min-height: 86px; padding: 12px; }
.preview-stat-icon { color: #64836c; font-size: 17px; line-height: 1; }
.preview-note { color: #8a9690; font-size: 12px; margin: 15px 0 0; text-align: center; }
.landing-features { border-top: 1px solid #e6ebe4; display: grid; gap: 24px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 auto; max-width: 980px; padding: 34px 0 42px; }
.landing-features article { padding: 0 8px; }
.feature-icon { align-items: center; background: #eaf2ec; border-radius: 8px; color: #54795d; display: flex; font-size: 18px; height: 36px; justify-content: center; width: 36px; }
.landing-features h2 { color: #34483c; font: 700 15px Manrope, sans-serif; margin: 13px 0 6px; }
.landing-features p { color: #7d8981; font-size: 13px; line-height: 1.6; margin: 0; }
.landing-footer { align-items: center; border-top: 1px solid #e6ebe4; color: #89958e; display: flex; font-size: 12px; justify-content: space-between; margin: 0 auto; max-width: 1180px; padding: 19px 0 25px; }
.landing-footer a { color: #54795d; font-weight: 600; }
@media (max-width: 600px) {
  .landing-page { padding: 0 19px; }
  .landing-header { height: 70px; }
  .landing-brand { font-size: 21px; }
  .landing-brand img { height: 33px; width: 33px; }
  .landing-header nav { gap: 13px; }
  .landing-header-cta { font-size: 12px; padding: 9px 10px; }
  .landing-hero { padding-top: 56px; }
  .landing-eyebrow { font-size: 10px; letter-spacing: .9px; }
  .landing-hero h1 { letter-spacing: -1.7px; }
  .landing-intro { font-size: 15px; }
  .landing-actions { flex-direction: column; gap: 15px; }
  .landing-preview { margin-top: 37px; padding: 15px; }
  .preview-stats { grid-template-columns: 1fr; }
  .preview-stats > div { min-height: 0; }
  .landing-features { gap: 20px; grid-template-columns: 1fr; padding: 27px 0; }
  .landing-features article { display: grid; gap: 0 12px; grid-template-columns: 36px 1fr; }
  .landing-features .feature-icon { grid-row: span 2; }
  .landing-features h2 { margin: 0 0 4px; }
  .landing-footer { align-items: flex-start; flex-direction: column; gap: 10px; }
}
</style>