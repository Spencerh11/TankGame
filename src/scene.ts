import Phaser from 'phaser';

type Projectile = Phaser.Types.Physics.Arcade.ImageWithDynamicBody & {
  bounceCount?: number;
};

export class TankScene extends Phaser.Scene {
  private tankBase!: Phaser.GameObjects.Rectangle;
  private turret!: Phaser.GameObjects.Rectangle;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'R', Phaser.Input.Keyboard.Key>;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private hpText!: Phaser.GameObjects.Text;
  private legendText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private hp = 3;
  private isDead = false;
  private readonly arenaPadding = 24;

  constructor() {
    super('tank-scene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0f13');
    this.createProjectileTexture();

    this.walls = this.physics.add.staticGroup();
    this.createArenaWalls(width, height);

    this.tankBase = this.add.rectangle(width / 2, height / 2, 36, 36, 0x38c172);
    this.physics.add.existing(this.tankBase);

    const body = this.tankBase.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setDrag(1200, 1200);
    body.setMaxVelocity(240, 240);

    this.turret = this.add.rectangle(this.tankBase.x, this.tankBase.y, 40, 12, 0x91e7a8);
    this.turret.setOrigin(0.2, 0.5);

    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys('W,A,S,D,R') as Record<
      'W' | 'A' | 'S' | 'D' | 'R',
      Phaser.Input.Keyboard.Key
    >;

    this.projectiles = this.physics.add.group({
      allowGravity: false,
    });

    this.physics.add.collider(this.tankBase, this.walls);
    this.physics.add.collider(
      this.projectiles,
      this.walls,
      this.handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.projectiles,
      this.tankBase,
      this.handleProjectileHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.fireProjectile();
      }
    });

    this.hpText = this.add.text(this.arenaPadding, this.arenaPadding, '', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '18px',
      color: '#e5f2ff',
    });

    this.legendText = this.add.text(this.arenaPadding, height - this.arenaPadding, '', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '14px',
      color: '#8fb3c9',
    });
    this.legendText.setOrigin(0, 1);

    this.gameOverText = this.add.text(width / 2, height / 2, '', {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: '48px',
      color: '#ff6b6b',
    });
    this.gameOverText.setOrigin(0.5);

    this.updateHud();
  }

  update(time: number): void {
    if (this.isDead) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
        this.scene.restart();
      }
      return;
    }

    const body = this.tankBase.body as Phaser.Physics.Arcade.Body;
    const moveInput = new Phaser.Math.Vector2(
      (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0),
      (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0),
    );

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize();
      body.setVelocity(moveInput.x * 200, moveInput.y * 200);
    } else {
      body.setVelocity(0, 0);
    }

    this.turret.setPosition(this.tankBase.x, this.tankBase.y);
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.tankBase.x, this.tankBase.y, pointer.worldX, pointer.worldY);
    this.turret.rotation = angle;

    this.projectiles.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const projectile = child as Projectile;
      if (!projectile.active) {
        return;
      }
      const lifespan = projectile.getData('lifespan') as number | undefined;
      if (lifespan && time >= lifespan) {
        projectile.destroy();
      }
    });
  }

  private createArenaWalls(width: number, height: number): void {
    const thickness = 18;
    const padding = this.arenaPadding;

    const top = this.add.rectangle(width / 2, padding, width - padding * 2, thickness, 0x1f2933);
    const bottom = this.add.rectangle(width / 2, height - padding, width - padding * 2, thickness, 0x1f2933);
    const left = this.add.rectangle(padding, height / 2, thickness, height - padding * 2, 0x1f2933);
    const right = this.add.rectangle(width - padding, height / 2, thickness, height - padding * 2, 0x1f2933);

    this.addInteriorWall(width * 0.3, height * 0.4, 120, 20);
    this.addInteriorWall(width * 0.7, height * 0.35, 20, 120);
    this.addInteriorWall(width * 0.55, height * 0.7, 160, 20);

    this.walls.add(top);
    this.walls.add(bottom);
    this.walls.add(left);
    this.walls.add(right);

    this.walls.getChildren().forEach((wall: Phaser.GameObjects.GameObject) => {
      const rect = wall as Phaser.GameObjects.Rectangle;
      this.physics.add.existing(rect, true);
    });
  }

  private addInteriorWall(x: number, y: number, width: number, height: number): void {
    const wall = this.add.rectangle(x, y, width, height, 0x243341);
    this.walls.add(wall);
  }

  private createProjectileTexture(): void {
    if (this.textures.exists('projectile')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd166, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('projectile', 12, 12);
    graphics.destroy();
  }

  private fireProjectile(): void {
    if (this.isDead) {
      return;
    }

    const startX = this.tankBase.x + Math.cos(this.turret.rotation) * 30;
    const startY = this.tankBase.y + Math.sin(this.turret.rotation) * 30;

    const projectile = this.projectiles.get(startX, startY, 'projectile') as Projectile | null;
    if (!projectile) {
      return;
    }

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.setCircle(6);
    projectile.setCollideWorldBounds(false);
    projectile.setBounce(1, 1);
    projectile.setData('bounceCount', 0);
    projectile.setData('armed', false);
    projectile.setData('lifespan', this.time.now + 4000);

    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.reset(startX, startY);

    const speed = 420;
    body.setVelocity(Math.cos(this.turret.rotation) * speed, Math.sin(this.turret.rotation) * speed);

    this.time.delayedCall(150, () => {
      if (projectile.active) {
        projectile.setData('armed', true);
      }
    });
  }

  private handleProjectileWallCollision(projectileObject: Phaser.GameObjects.GameObject): void {
    const projectile = projectileObject as Projectile;
    const current = (projectile.getData('bounceCount') as number | undefined) ?? 0;
    const next = current + 1;
    projectile.setData('bounceCount', next);

    if (next >= 6) {
      projectile.destroy();
    }
  }

  private handleProjectileHit(
    projectileObject: Phaser.GameObjects.GameObject,
    target: Phaser.GameObjects.GameObject,
  ): void {
    if (this.isDead) {
      return;
    }

    const projectile = projectileObject as Projectile;
    if (!projectile.getData('armed')) {
      return;
    }

    if (target !== this.tankBase) {
      return;
    }

    projectile.destroy();
    this.hp = Math.max(0, this.hp - 1);
    this.updateHud();

    if (this.hp <= 0) {
      this.handleGameOver();
    }
  }

  private updateHud(): void {
    this.hpText.setText(`HP: ${this.hp} / 3`);
    this.legendText.setText('WASD: Move    Mouse: Aim    Left Click: Shoot    R: Restart');
  }

  private handleGameOver(): void {
    this.isDead = true;
    this.gameOverText.setText('You Died\nPress R');
    const body = this.tankBase.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }
}
