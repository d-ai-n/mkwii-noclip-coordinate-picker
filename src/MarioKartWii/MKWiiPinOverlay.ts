import { mat4, vec4 } from 'gl-matrix';
import { Camera } from '../Camera.js';
import { SceneContext } from '../SceneBase.js';
import { parseCollisionOBJ, raycastTriangles, Triangle, Vec3 } from './mkwii_pin_core.js';

const SCALE = 10; // renderer uses 0.1 × native MKWii coordinates; KCL OBJ is native.
type Pin = { id: number; world: Vec3; marker: HTMLDivElement };

export class MKWiiPinOverlay {
    private triangles: Triangle[] = [];
    private pins: Pin[] = [];
    private selectedId: number | null = null;
    private nextId = 1;
    private panel = document.createElement('div');
    private coords = document.createElement('pre');
    private selector = document.createElement('select');
    private coordInputs = ['x', 'y', 'z'].map(() => document.createElement('input'));
    private canvas = this.context.inputManager.toplevel as HTMLCanvasElement;

    constructor(private context: SceneContext, private courseId: string, private visualTriangles: Triangle[]) {
        this.panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:10000;background:#101820ed;color:#e9f6ff;border:1px solid #6993a6;padding:9px;font:12px ui-monospace,monospace;max-width:370px;max-height:calc(100vh - 24px);overflow:hidden;display:flex;flex-direction:column';
        this.panel.innerHTML = '<b>Shortcut pins</b><br>Shift + left-click: KCL surface pin<br>';
        this.selector.onchange = () => { this.selectedId = Number(this.selector.value) || null; this.show(); };
        this.panel.append('Selected: ', this.selector, document.createElement('br'));
        for (const [label, input] of [['X', this.coordInputs[0]], ['Y', this.coordInputs[1]], ['Z', this.coordInputs[2]]] as const) {
            input.type = 'number'; input.step = 'any'; input.style.width = '86px'; this.panel.append(`${label}: `, input, ' ');
        }
        const apply = document.createElement('button'); apply.textContent = 'Apply XYZ'; apply.onclick = () => this.applyCoordinates(); this.panel.appendChild(apply);
        this.panel.appendChild(document.createElement('br'));
        const actions: Array<[string, () => void]> = [['Download JSON', () => this.download()], ['Delete selected', () => this.deleteSelected()], ['Clear all', () => this.clear()]];
        for (const [label, action] of actions) {
            const button = document.createElement('button'); button.textContent = label; button.style.marginRight = '5px'; button.onclick = action; this.panel.appendChild(button);
        }
        this.coords.style.cssText = 'max-height:260px;overflow:auto;margin:8px 0 0;white-space:pre-wrap;flex:1';
        this.panel.appendChild(this.coords); document.body.appendChild(this.panel);
        this.canvas.addEventListener('mousedown', this.onMouseDown, { capture: true });
        fetch(`/collision/data/${courseId}.obj`).then(r => { if (!r.ok) throw new Error(`collision OBJ HTTP ${r.status}`); return r.text(); }).then(t => { this.triangles = parseCollisionOBJ(t); this.show(); }).catch(e => { this.coords.textContent = `collision load failed: ${e.message}`; });
    }

    private onMouseDown = (event: MouseEvent) => {
        if (!event.shiftKey || event.button !== 0 || this.triangles.length === 0) return;
        event.preventDefault(); event.stopImmediatePropagation();
        const world = this.pickWorld(event.clientX, event.clientY);
        if (world === null) return;
        const id = this.nextId++;
        const marker = document.createElement('div'); marker.textContent = String(id);
        marker.style.cssText = 'position:fixed;z-index:10001;pointer-events:none;width:24px;height:24px;box-sizing:border-box;border:3px solid white;border-radius:50%;background:#f01832;color:white;text-align:center;line-height:18px;font:bold 12px system-ui;box-shadow:0 0 0 2px #7a0010,0 1px 8px #000';
        document.body.appendChild(marker);
        this.pins.push({ id, world, marker }); this.selectedId = id;
        // Never retain the mouse-down pixel as pin state: every visual position derives from canonical world XYZ.
        this.positionMarker(this.pins[this.pins.length - 1], this.context.viewerInput.camera); this.show();
    };

    private pickWorld(clientX: number, clientY: number): Vec3 | null {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1, y = 1 - ((clientY - rect.top) / rect.height) * 2;
        const inverse = mat4.invert(mat4.create(), this.context.viewerInput.camera.clipFromWorldMatrix); if (inverse === null) return null;
        // Noclip's reversed-depth projection converts its near plane to clip Z=-1 and far to +1.
        // Using them the other way around sends the pick ray exactly behind the camera.
        const near = vec4.transformMat4(vec4.create(), vec4.fromValues(x, y, -1, 1), inverse), far = vec4.transformMat4(vec4.create(), vec4.fromValues(x, y, 1, 1), inverse);
        for (const p of [near, far]) { p[0] /= p[3]; p[1] /= p[3]; p[2] /= p[3]; }
        const origin: Vec3 = [near[0] * SCALE, near[1] * SCALE, near[2] * SCALE], direction: Vec3 = [far[0] * SCALE - near[0] * SCALE, far[1] * SCALE - near[1] * SCALE, far[2] * SCALE - near[2] * SCALE];
        // Prefer the same course_model triangles noclip rendered; filtered KCL remains a ground-only fallback.
        return raycastTriangles(this.visualTriangles, origin, direction) ?? raycastTriangles(this.triangles, origin, direction);
    }

    private positionMarker(pin: Pin, camera: Camera): void {
        const p = vec4.transformMat4(vec4.create(), vec4.fromValues(pin.world[0] / SCALE, pin.world[1] / SCALE, pin.world[2] / SCALE, 1), camera.clipFromWorldMatrix);
        if (p[3] <= 1e-8) { pin.marker.style.display = 'none'; return; }
        const ndcX = p[0] / p[3], ndcY = p[1] / p[3], ndcZ = p[2] / p[3];
        const visible = Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 && ndcZ >= 0 && ndcZ <= 1;
        pin.marker.style.display = visible ? 'block' : 'none';
        if (!visible) return;
        const rect = this.canvas.getBoundingClientRect();
        pin.marker.style.left = `${rect.left + (ndcX * .5 + .5) * rect.width - 12}px`;
        pin.marker.style.top = `${rect.top + (-ndcY * .5 + .5) * rect.height - 12}px`;
        pin.marker.style.background = pin.id === this.selectedId ? '#ff1230' : '#ae0020';
    }

    public update(camera: Camera): void { this.pins.forEach(pin => this.positionMarker(pin, camera)); }
    private applyCoordinates(): void {
        const pin = this.pins.find(p => p.id === this.selectedId); if (pin === undefined) return;
        const values = this.coordInputs.map(input => Number(input.value)); if (values.some(v => !Number.isFinite(v))) return;
        pin.world = [values[0], values[1], values[2]];
        this.positionMarker(pin, this.context.viewerInput.camera); this.show();
    }
    private deleteSelected(): void { const i = this.pins.findIndex(p => p.id === this.selectedId); if (i < 0) return; this.pins[i].marker.remove(); this.pins.splice(i, 1); this.selectedId = this.pins.at(-1)?.id ?? null; this.show(); }
    private clear(): void { this.pins.forEach(p => p.marker.remove()); this.pins = []; this.selectedId = null; this.show(); }
    private show(): void {
        this.selector.replaceChildren(); for (const pin of this.pins) { const option = document.createElement('option'); option.value = String(pin.id); option.textContent = `Pin ${pin.id}`; option.selected = pin.id === this.selectedId; this.selector.appendChild(option); }
        const selected = this.pins.find(p => p.id === this.selectedId);
        if (selected !== undefined) selected.world.forEach((v, i) => this.coordInputs[i].value = String(v));
        this.coords.textContent = this.pins.length ? JSON.stringify({ course_id: this.courseId, selected_pin_id: this.selectedId, selected_xyz: selected && { x: Math.round(selected.world[0]), y: Math.round(selected.world[1]), z: Math.round(selected.world[2]) }, pins: this.pins.map(p => ({ id: p.id, x: Math.round(p.world[0]), y: Math.round(p.world[1]), z: Math.round(p.world[2]) })) }, null, 2) : (this.triangles.length ? 'No pins yet.' : 'collision mesh loading…');
    }
    private download(): void { const blob = new Blob([this.coords.textContent || ''], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${this.courseId}-pins.json`; link.click(); URL.revokeObjectURL(link.href); }
    public destroy(): void { this.canvas.removeEventListener('mousedown', this.onMouseDown, { capture: true }); this.panel.remove(); this.pins.forEach(p => p.marker.remove()); }
}
