<script lang="ts" setup>
import type Phaser from 'phaser';


const gameContainer = ref<HTMLDivElement | null>(null);

let game: Phaser.Game | null = null;

onMounted(async () => {
    const [{default: Phaser}, { MainScene}] = await Promise.all([
        import('phaser'),
        import('../../game/scenes/MainScene')
    ])
    if(!gameContainer.value) return;

    game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameContainer.value,
        width: 960,
        height: 600,
        backgroundColor: '#18251e',
        scene: [MainScene],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        }
    })
})

onBeforeUnmount(() => {
    game?.destroy(true)
    game = null
})
</script>
<template>
    <div ref="gameContainer" class="game-container"></div>
</template>
<style scoped>
.game-container {
    width: 100%;
    height: 600px;
    overflow: hidden;
}
</style>