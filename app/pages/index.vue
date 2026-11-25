<script setup lang="ts">
import GameCanvas from '~/components/GameCanvas.vue';

</script>

<template>
    <main class="page">
        <h1>Idle RPG Playground</h1>
        <GameCanvas />
    </main>
</template>

<style scoped>
.page {
  padding: 24px;
  background: #111827;
  min-height: 100vh;
  color: white;
}
</style>