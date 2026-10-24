<script lang="ts" setup>
  // Set browser metadata for the about page.
  useHead({ title: 'About Tidelog', meta: [{ name: 'description', content: 'Learn more about Tidelog, the fishing logbook app for anglers.' }] })

  const creatorPhoto = '/assets/creator_photo.jpg'
</script>

<template>
    <div class="page-wrap">
        <header class="topbar">
            <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>About</strong></div>
            <div class="topbar-right">
                <span class="today-label">{{ new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()) }}</span>
            </div>
        </header>

        <section class="page-heading">
            <div>
                <h1> More About Us</h1>
                <p class="subtitle">The App and the Creator</p>
            </div>
        </section>

        <section class="page-content">
            <div class="content-block">
                <h2>About Tidelog</h2>
                <p>Tidelog is a fishing logbook app designed for anglers to track their fishing trips, catches, and experiences. It provides a user-friendly interface to log details such as location, weather conditions, bait used, and more.</p>
            </div>

            <div class="content-block">
                <h2>About the Creator</h2>
                <img :src="creatorPhoto" alt="Daniel Lee, the creator of Tidelog">
                <p>Hi, I’m Daniel Lee, the creator of Tidelog.</p>
                <p>My dad got me into fishing when I was young. We’d mostly catch sunfish and catfish back then, and these days I spend a lot of my time fishing for bass in southern Ontario. After enough trips, the details started to blur together: where I was, what the conditions were, and what actually worked. I kept meaning to write it all down and never did.</p>
                <p>My background is in geospatial analysis. I studied Geomatics at the University of Waterloo, where I worked a lot with maps and location data. Fishing turned out to be a good fit for that kind of thinking, since where and when you fish, and the conditions you’re dealing with, all make a difference.</p>
                <p>I built Tidelog to solve that problem for myself and to branch out into web development. I used it as a project to learn the Nuxt framework, and building it from scratch taught me a lot along the way.</p>
                <p>Tidelog is essentially a fishing diary. You can log your trips, record your catches, and look back on what’s worked for you over time.</p>
                <p>It’s a mix of two things I enjoy, fishing and technology, and I’m still adding to it. Thanks for checking it out.</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.content-block {
    margin-bottom: 2rem;
    padding: 2rem;
    
    border-bottom: 1px solid #ccc;
    border-radius: 10px;


    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

}

img {
    max-width: 200px;
    border-radius: 5%;
    margin: 1rem;
    margin-left: 4rem;
    float: right;

    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

</style>