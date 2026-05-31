import Phaser from 'phaser';

export default class Platform {
    /**
     * @param {number} x - Left coordinate
     * @param {number} y - Top coordinate
     * @param {number} w - Width
     * @param {number} h - Height
     */
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;

        this.tileWidth = 12;
        this.tileHeight = 12;

        this.cols = Math.ceil(w / this.tileWidth);
        this.rows = Math.ceil(h / this.tileHeight);

        // Initialize 2D grid with unpainted color '#222222'
        this.tiles = [];
        for (let col = 0; col < this.cols; col++) {
            this.tiles[col] = [];
            for (let row = 0; row < this.rows; row++) {
                this.tiles[col][row] = '#222222';
            }
        }
        
        // Performance optimization: only redraw when dirty
        this.dirty = true;

        // Moving platform properties
        this.isMoving = false;
        this.startX = x;
        this.startY = y;
        this.moveRangeX = 0;
        this.moveRangeY = 0;
        this.moveSpeed = 0;
        this.timeOffset = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.conveyorForce = 0;
        this.timeAccumulator = 0;
    }

    /**
     * Updates coordinates for moving platforms
     */
    update(dtMs) {
        this.timeAccumulator = (this.timeAccumulator || 0) + (dtMs / 1000);

        if (!this.isMoving) {
            this.deltaX = 0;
            this.deltaY = 0;
            return;
        }

        const prevX = this.x;
        const prevY = this.y;

        const angle = this.timeAccumulator * this.moveSpeed + this.timeOffset;
        if (this.moveRangeX > 0) {
            this.x = this.startX + Math.sin(angle) * this.moveRangeX;
        }
        if (this.moveRangeY > 0) {
            this.y = this.startY + Math.sin(angle) * this.moveRangeY;
        }

        this.deltaX = this.x - prevX;
        this.deltaY = this.y - prevY;
    }

    /**
     * Paint tiles within a circular radius
     */
    stain(impactX, impactY, radius, color) {
        let changed = false;
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                const cellX = this.x + col * this.tileWidth + this.tileWidth / 2;
                const cellY = this.y + row * this.tileHeight + this.tileHeight / 2;
                
                // Fast distance check
                const dx = cellX - impactX;
                const dy = cellY - impactY;
                if (dx * dx + dy * dy <= radius * radius) {
                    if (this.tiles[col][row] !== color) {
                        this.tiles[col][row] = color;
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            this.dirty = true;
        }
    }

    /**
     * Paint a single tile (footsteps)
     */
    stainPoint(px, py, color) {
        const col = Math.floor((px - this.x) / this.tileWidth);
        const row = Math.floor((py - this.y) / this.tileHeight);
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            if (this.tiles[col][row] !== color) {
                this.tiles[col][row] = color;
                this.dirty = true;
            }
        }
    }

    /**
     * Get the tile color at world coordinate px, py
     */
    getTileColorAt(px, py) {
        const col = Math.floor((px - this.x) / this.tileWidth);
        const row = py !== undefined ? Math.floor((py - this.y) / this.tileHeight) : 0;

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            return this.tiles[col][row];
        }
        return '#222222';
    }

    /**
     * Renders the platform tiles using Phaser Graphics
     * @param {Phaser.GameObjects.Graphics} graphics - Phaser graphics context
     */
    render(graphics) {
        // Draw backing structure
        graphics.fillStyle(0x111116, 1.0);
        graphics.fillRect(this.x, this.y, this.width, this.height);

        // Render base tiles
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                const tileColor = this.tiles[col][row];
                const tileX = this.x + col * this.tileWidth;
                const tileY = this.y + row * this.tileHeight;
                const tileW = Math.min(this.tileWidth, this.x + this.width - tileX);
                const tileH = Math.min(this.tileHeight, this.y + this.height - tileY);

                if (tileColor !== '#222222') {
                    const colorHex = Phaser.Display.Color.HexStringToColor(tileColor).color;
                    // Draw outer border glow using strokeRect
                    graphics.lineStyle(1.5, colorHex, 0.45);
                    graphics.strokeRect(tileX, tileY, tileW, tileH);
                    
                    // Fill solid body
                    graphics.fillStyle(colorHex, 1.0);
                    graphics.fillRect(tileX, tileY, tileW, tileH);
                } else {
                    graphics.fillStyle(0x222222, 1.0);
                    graphics.fillRect(tileX, tileY, tileW, tileH);
                }

                // Add grid borders to outline tiles
                graphics.lineStyle(1, 0xffffff, 0.03);
                graphics.strokeRect(tileX, tileY, tileW, tileH);

                // Add a subtle top border glow on the very top row
                if (row === 0) {
                    graphics.fillStyle(0xffffff, 0.08);
                    graphics.fillRect(tileX, tileY, tileW, 2);
                }
            }
        }

        // Conveyor belt drawing (drawn on top of the tiles!)
        if (this.conveyorForce !== 0) {
            let scrollOffset = (this.timeAccumulator * this.conveyorForce * 80) % 24;
            if (scrollOffset < 0) scrollOffset += 24;
            const beltY = this.y;
            const beltH = 6;

            // belt rail base: deep dark neon rail border
            graphics.fillStyle(0x1a1d24, 1.0); 
            graphics.fillRect(this.x, beltY, this.width, beltH);
            graphics.lineStyle(1.5, 0xff6a00, 0.85);
            graphics.strokeRect(this.x, beltY, this.width, beltH);

            // bright orange moving markings
            graphics.fillStyle(0xff6a00, 1.0); 
            for (let bx = -24; bx < this.width + 24; bx += 24) {
                const drawX = this.x + bx + scrollOffset;
                const startX = Math.max(this.x, drawX);
                const endX = Math.min(this.x + this.width, drawX + 12);
                if (endX > startX) {
                    graphics.fillRect(startX, beltY + 1, endX - startX, beltH - 2);
                }
            }

            // End pulleys / wheels with deep dark metallic fill and center dot
            graphics.fillStyle(0x222226, 1.0);
            graphics.lineStyle(1.5, 0x888888, 1.0);
            
            graphics.fillCircle(this.x + 6, this.y + this.height / 2, 5);
            graphics.strokeCircle(this.x + 6, this.y + this.height / 2, 5);
            graphics.fillStyle(0xffaa00, 1.0);
            graphics.fillCircle(this.x + 6, this.y + this.height / 2, 1.5);
            
            graphics.fillStyle(0x222226, 1.0);
            graphics.fillCircle(this.x + this.width - 6, this.y + this.height / 2, 5);
            graphics.strokeCircle(this.x + this.width - 6, this.y + this.height / 2, 5);
            graphics.fillStyle(0xffaa00, 1.0);
            graphics.fillCircle(this.x + this.width - 6, this.y + this.height / 2, 1.5);
        }

        this.dirty = false;
    }
}
