import * as Phaser from 'phaser';

export default class Snake extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'shoelace_snake');
        this.setDisplaySize(64, 32);
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCollideWorldBounds(true);
        this.body.setGravityY(500);

        this.speed = 100;
        this.direction = 1; // 1 for right, -1 for left
        this.isChasing = false;
    }

    update() {
        if (!this.body) return;

        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);

        if (distanceToPlayer < 300) {
            this.isChasing = true;
            this.direction = this.scene.player.x > this.x ? 1 : -1;
            this.body.setVelocityX(this.speed * 2 * this.direction);
        } else {
            this.isChasing = false;
            this.body.setVelocityX(this.speed * this.direction);

            // Simple boundary patrol (if not chasing)
            if (this.body.blocked.left || this.body.blocked.right) {
                this.direction *= -1;
            }
        }

        this.setFlipX(this.direction === 1);
    }
}
