/**
 * Detects if a point (px, py) is inside a rectangle (rx, ry, rw, rh)
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Checks if two line segments (x1, y1)->(x2, y2) and (x3, y3)->(x4, y4) intersect
 */
export function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (det === 0) return false; // Parallel
    const lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
    const gamma = ((y1 - y2) * (x4 - x1) + (x1 - x2) * (y4 - y1)) / det;
    return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

/**
 * Checks if a line segment (x1, y1)->(x2, y2) intersects a rectangle (rx, ry, rw, rh)
 */
export function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // If either start or end point is inside the rectangle, it intersects
    if (pointInRect(x1, y1, rx, ry, rw, rh) || pointInRect(x2, y2, rx, ry, rw, rh)) {
        return true;
    }
    
    // Check intersection with all 4 edges of the rectangle
    if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry)) return true; // Top Edge
    if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh)) return true; // Bottom Edge
    if (lineSegmentsIntersect(x1, y1, x2, y2, rx, ry, rx, ry + rh)) return true; // Left Edge
    if (lineSegmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)) return true; // Right Edge
    
    return false;
}

/**
 * Checks if line of sight is blocked by any platform between (x1, y1) and (x2, y2)
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - Target X
 * @param {number} y2 - Target Y
 * @param {Array} platforms - List of platforms/walls
 * @returns {boolean} True if blocked, false if clear line of sight
 */
export function isLineOfSightBlocked(x1, y1, x2, y2, platforms) {
    for (let p of platforms) {
        // We check if the segment intersects the platform bounds
        if (lineIntersectsRect(x1, y1, x2, y2, p.x, p.y, p.width, p.height)) {
            return true;
        }
    }
    return false;
}
