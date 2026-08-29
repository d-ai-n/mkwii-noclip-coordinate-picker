import * as GX from '../gx/gx_enum.js';

export type Vec3 = [number, number, number];
export type Triangle = [Vec3, Vec3, Vec3];

export function parseCollisionOBJ(text: string): Triangle[] {
    const vertices: Vec3[] = [];
    const triangles: Triangle[] = [];
    let currentGroup = '';
    const surfaceGroups = new Set(['road', 'offroad', 'fast', 'halfpipe', 'moving', 'water']);
    for (const line of text.split(/\r?\n/)) {
        const fields = line.trim().split(/\s+/);
        if (fields[0] === 'g') {
            currentGroup = fields[1] ?? '';
        } else if (fields[0] === 'v' && fields.length >= 4) {
            vertices.push([Number(fields[1]), Number(fields[2]), Number(fields[3])]);
        } else if (fields[0] === 'f' && fields.length >= 4 && surfaceGroups.has(currentGroup.split('_')[0])) {
            const indices = fields.slice(1).map(f => Number(f.split('/')[0]) - 1);
            for (let i = 1; i < indices.length - 1; i++)
                triangles.push([vertices[indices[0]], vertices[indices[i]], vertices[indices[i + 1]]]);
        }
    }
    return triangles;
}

// MDL0 has already expanded GX primitives into a triangle-list GPU stream. This cache matches the visible course model, not KCL helpers.
export function makeVisualModelTriangles(shapes: Array<{ loadedVertexLayout: any; loadedVertexData: any }>): Triangle[] {
    const triangles: Triangle[] = [];
    for (const shape of shapes) {
        const layout = shape.loadedVertexLayout, data = shape.loadedVertexData;
        const stride = layout.vertexBufferStrides[0], posOffset = layout.vertexAttributeOffsets[GX.Attr.POS];
        if (stride === undefined || posOffset === undefined || data.vertexBuffers[0] === undefined) continue;
        const view = new DataView(data.vertexBuffers[0]), indices = new Uint16Array(data.indexData);
        const vertex = (i: number): Vec3 => [view.getFloat32(i * stride + posOffset, true), view.getFloat32(i * stride + posOffset + 4, true), view.getFloat32(i * stride + posOffset + 8, true)];
        for (let i = 0; i + 2 < indices.length; i += 3) triangles.push([vertex(indices[i]), vertex(indices[i + 1]), vertex(indices[i + 2])]);
    }
    return triangles;
}

export function raycastTriangles(triangles: readonly Triangle[], origin: Vec3, direction: Vec3): Vec3 | null {
    let nearest: Vec3 | null = null;
    let nearestT = Infinity;
    for (const [a, b, c] of triangles) {
        const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const p: Vec3 = [direction[1] * e2[2] - direction[2] * e2[1], direction[2] * e2[0] - direction[0] * e2[2], direction[0] * e2[1] - direction[1] * e2[0]];
        const determinant = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
        if (Math.abs(determinant) < 1e-8) continue;
        const inv = 1 / determinant;
        const s: Vec3 = [origin[0] - a[0], origin[1] - a[1], origin[2] - a[2]];
        const u = inv * (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]);
        if (u < 0 || u > 1) continue;
        const q: Vec3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
        const v = inv * (direction[0] * q[0] + direction[1] * q[1] + direction[2] * q[2]);
        if (v < 0 || u + v > 1) continue;
        const t = inv * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]);
        if (t > 1e-6 && t < nearestT) {
            nearestT = t;
            nearest = [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
        }
    }
    return nearest;
}

export function raycastCollisionOBJ(text: string, origin: Vec3, direction: Vec3): Vec3 | null {
    return raycastTriangles(parseCollisionOBJ(text), origin, direction);
}
