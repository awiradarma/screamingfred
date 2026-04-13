import * as Phaser from 'phaser';

export default class Barry extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'barry_battery');
        this.setDisplaySize(64, 64);
        this.scene = scene;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setImmovable(true);
        this.body.setAllowGravity(false);

        this.zapTimer = scene.time.addEvent({
            delay: 3000,
            callback: this.zap,
            callbackScope: this,
            loop: true
        });

        this.zapGraphic = scene.add.circle(x, y, 10, 0xccff00, 0.5);
        this.zapGraphic.setVisible(false);
    }

    zap() {
        this.zapGraphic.setVisible(true);
        this.zapGraphic.setRadius(10);
        
        this.scene.tweens.add({
            targets: this.zapGraphic,
            radius: 150,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.zapGraphic.setVisible(false);
                this.zapGraphic.setAlpha(0.5);
            }
        });

        // Check proximity to Fred
        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
        if (distance < 150 && this.scene.player.transformManager.currentState !== 'BANANA') {
             // Handle Fred being zapped (e.g., knockback or damage)
             const angle = Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
             this.scene.player.body.setVelocity(Math.cos(angle) * 500, -300);
        }
    }

    destroy(fromScene) {
        if (this.zapTimer) this.zapTimer.destroy();
        if (this.zapGraphic) this.zapGraphic.destroy();
        super.destroy(fromScene);
    }
}
