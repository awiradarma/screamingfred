import * as Phaser from 'phaser';
import Fred from '../entities/Fred';
import { useStore } from '../../store/useStore';
import { loadDraft } from '../../db/indexedStorage';
import Barry from '../entities/enemies/Barry';
import Snake from '../entities/enemies/Snake';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.placedTiles = [];
    }

    preload() {
        // Automatically fetch AI generated image assets from public Vite directory
        this.load.image('fred', '/assets/fred.png');
        this.load.image('fred_banana', '/assets/banana.png'); 
        this.load.image('brick_platform', '/assets/brick.png'); 
        this.load.image('glaring_eye', '/assets/eye.png');
        this.load.image('barry_battery', '/assets/battery.png');
        this.load.image('shoelace_snake', '/assets/snake.png');
    }

    create() {
        // A mathematically perfect terrain block acting as the absolute bottom of the grid
        const ground = this.add.rectangle(416, 608, 832, 64, 0x333333);
        this.physics.add.existing(ground, true); 

        this.sonicRings = this.physics.add.group({ allowGravity: false });
        this.enemies = this.physics.add.group();
        
        // Spawn exactly inside the mathematical center of the closest grid space (96 = 64 * 1.5)
        this.player = new Fred(this, 96, 288);
        this.physics.add.collider(this.player, ground);
        
        // --- NEW EDITOR LOGIC (SCALED UP TO 64 FOR HI-RES) ---
        this.gridGraphic = this.add.grid(416, 320, 832, 640, 64, 64, null, 0, 0xffffff, 0.1);
        this.gridGraphic.setDepth(100);
        this.gridGraphic.setVisible(false);

        // Global colliders
        this.physics.add.collider(this.enemies, ground);
        this.physics.add.collider(this.player, this.enemies, (player) => {
            if (player.transformManager.currentState === 'BANANA') {
                return; // Invulnerable in banana state
            }
        });

        this.physics.add.overlap(this.sonicRings, this.enemies, (ring, enemy) => {
            if(enemy && enemy.body && !enemy._recentlyHit) {
                enemy._recentlyHit = true;
                this.time.delayedCall(500, () => { enemy._recentlyHit = false; });
                const angle = Phaser.Math.Angle.Between(ring.x, ring.y, enemy.x, enemy.y);
                enemy.body.setVelocity(Math.cos(angle) * 400, -250); 
            }
        });

        window.addEventListener('test-run-level', () => {
             this.player.setPosition(96, 288);
             this.player.body.setVelocity(0,0);
        });

        loadDraft().then(draft => {
            if (draft && draft.mapData && draft.mapData.grid) {
                Object.keys(draft.mapData.grid).forEach(coord => {
                    const [x, y] = coord.split(',').map(Number);
                    this.placeTile(draft.mapData.grid[coord], x, y, false); 
                });
            }
        });

        useStore.subscribe((state) => {
            this.gridGraphic.setVisible(state.editorMode);
        });

        this.input.on('pointerdown', (pointer) => {
            const state = useStore.getState();
            if (!state.editorMode || !state.selectedEntityTool) return;
            
            const snapX = Math.floor(pointer.worldX / 64) * 64 + 32;
            const snapY = Math.floor(pointer.worldY / 64) * 64 + 32;
            
            if (state.selectedEntityTool === 'eraser') {
                this.eraseTile(snapX, snapY);
            } else {
                this.placeTile(state.selectedEntityTool, snapX, snapY, true);
            }
        });
    }

    placeTile(toolId, x, y, shouldSave = true) {
        this.eraseTile(x, y, false);

        let color = 0x888888;
        let isEnemy = false;
        let EnemyClass = null;

        if (toolId.includes('brick')) color = 0xaa4444;
        if (toolId.includes('pancake')) color = 0xd2b48c;
        if (toolId.includes('electric')) color = 0xccff00;
        if (toolId.includes('text')) color = 0xffffff;
        
        if (toolId.includes('eye')) {
            color = 0xff0000; 
            isEnemy = true;
        } else if (toolId === 'barry_battery') {
            EnemyClass = Barry;
            isEnemy = true;
        } else if (toolId === 'waffle_bridge') {
            EnemyClass = Snake;
            isEnemy = true;
        }

        let tile;
        if (EnemyClass) {
            tile = new EnemyClass(this, x, y);
            this.enemies.add(tile);
        } else if (toolId === 'brick_platform' || toolId === 'glaring_eye') {
            tile = this.add.sprite(x, y, toolId).setDisplaySize(64, 64);
            if(toolId === 'glaring_eye') isEnemy = true;
        } else {
            tile = this.add.rectangle(x, y, 64, 64, color);
        }
        
        tile.setDepth(50);
        
        if (isEnemy && !EnemyClass) {
            this.physics.add.existing(tile);
            tile.body.setBounce(0.4);
            tile.body.setCollideWorldBounds(true);
            tile.body.setDragX(100);
            this.enemies.add(tile);
        } else if (!EnemyClass) {
            this.physics.add.existing(tile, true);
            this.physics.add.collider(this.player, tile);
            this.physics.add.collider(this.enemies, tile);
        }
        
        this.placedTiles.push(tile);
        
        if (shouldSave) {
            const state = useStore.getState();
            const activeDraft = JSON.parse(JSON.stringify(state.activeDraftMap || { levelHeader: {}, mapData: { grid: {} }}));
            
            if(!activeDraft.mapData) activeDraft.mapData = { grid: {} };
            if(!activeDraft.mapData.grid) activeDraft.mapData.grid = {};
            
            const coordKey = `${x},${y}`;
            activeDraft.mapData.grid[coordKey] = toolId;
            
            state.setDraftMap(activeDraft);
            import('../../db/indexedStorage').then(({ saveDraft }) => {
                saveDraft(activeDraft);
            });
        }
    }

    eraseTile(x, y, shouldSave = true) {
        for (let i = this.placedTiles.length - 1; i >= 0; i--) {
            const tile = this.placedTiles[i];
            if (tile.x === x && tile.y === y) {
                tile.destroy(); 
                this.placedTiles.splice(i, 1);
            }
        }
        
        if (shouldSave) {
            const state = useStore.getState();
            const activeDraft = JSON.parse(JSON.stringify(state.activeDraftMap || { levelHeader: {}, mapData: { grid: {} }}));
            const coordKey = `${x},${y}`;
            
            if(activeDraft.mapData && activeDraft.mapData.grid && activeDraft.mapData.grid[coordKey]) {
                delete activeDraft.mapData.grid[coordKey];
                state.setDraftMap(activeDraft);
                import('../../db/indexedStorage').then(({ saveDraft }) => {
                    saveDraft(activeDraft);
                });
            }
        }
    }

    update() {
        if (this.player) this.player.update();
    }
}
