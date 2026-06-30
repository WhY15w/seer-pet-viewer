import {
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  Skeleton,
  SkeletonBinary,
  TextureAtlas,
  Vector2,
} from "@esotericsoftware/spine-core";
import {
  GLTexture,
  ManagedWebGLRenderingContext,
  ResizeMode,
  SceneRenderer,
  Vector3,
} from "@esotericsoftware/spine-webgl";
import type { SpineClipData } from "@seer/spine-bundle";
import { SPINE_PREVIEW_FPS } from "@seer/spine-bundle";

export interface SpinePlayerOptions {
  backgroundColor?: number;
}

function hexToGlColor(hex: number): [number, number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return [r, g, b, 1];
}

export class SpinePlayer {
  private canvas!: HTMLCanvasElement;
  private context!: ManagedWebGLRenderingContext;
  private renderer!: SceneRenderer;
  private skeleton!: Skeleton;
  private state!: AnimationState;
  private clip: SpineClipData | null = null;
  private glTextures: GLTexture[] = [];
  private atlas: TextureAtlas | null = null;

  private playing = false;
  private loop = true;
  private frameIndex = 0;
  private frameCount = 0;
  private backgroundColor = 0x1a1a2e;

  private rafId = 0;
  private lastTime = 0;
  private onFrameChange?: (frame: number, total: number) => void;

  private fitZoom = 1;
  private userZoom = 1;
  private cameraX = 0;
  private cameraY = 0;
  private boundsOffset = new Vector2();
  private boundsSize = new Vector2();
  private resizeObserver: ResizeObserver | null = null;
  private readonly screenScratch = new Vector3();
  private readonly screenScratch2 = new Vector3();

  async mount(
    parent: HTMLElement,
    clip: SpineClipData,
    options: SpinePlayerOptions = {},
  ): Promise<void> {
    this.clip = clip;
    this.backgroundColor = options.backgroundColor ?? 0x1a1a2e;

    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.touchAction = "none";
    parent.replaceChildren(this.canvas);

    this.context = new ManagedWebGLRenderingContext(this.canvas, {
      alpha: true,
      premultipliedAlpha: true,
    });
    this.renderer = new SceneRenderer(this.canvas, this.context);
    this.renderer.skeletonRenderer.premultipliedAlpha = true;

    this.atlas = new TextureAtlas(clip.atlasText);
    for (const page of this.atlas.pages) {
      const bitmap = clip.textures.get(page.name);
      if (!bitmap) {
        throw new Error(`缺少纹理页: ${page.name}`);
      }
      page.width = bitmap.width;
      page.height = bitmap.height;
      const glTex = new GLTexture(this.context, bitmap);
      glTex.setFilters(page.minFilter, page.magFilter);
      page.setTexture(glTex);
      this.glTextures.push(glTex);
    }

    const attachmentLoader = new AtlasAttachmentLoader(this.atlas);
    const binary = new SkeletonBinary(attachmentLoader);
    binary.scale = clip.scale;
    const skeletonData = binary.readSkeletonData(clip.skeletonBytes);
    this.skeleton = new Skeleton(skeletonData);
    this.skeleton.setToSetupPose();

    const stateData = new AnimationStateData(skeletonData);
    stateData.defaultMix = clip.defaultMix;
    this.state = new AnimationState(stateData);

    const defaultAnim =
      clip.animations.find((a) => a === "await" || a === "standby") ??
      clip.animations[0] ??
      skeletonData.animations[0]?.name;
    if (defaultAnim) {
      this.setSequence(defaultAnim);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
    this.fitToView();
    this.lastTime = performance.now();
    this.tick();
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.state?.clearTracks();
    this.renderer?.dispose();
    for (const tex of this.glTextures) tex.dispose();
    this.glTextures = [];
    this.atlas?.dispose();
    this.atlas = null;
    this.canvas?.remove();
    this.clip = null;
  }

  setOnFrameChange(cb: (frame: number, total: number) => void): void {
    this.onFrameChange = cb;
  }

  setBackgroundColor(color: number): void {
    this.backgroundColor = color;
  }

  setSequence(name: string): void {
    if (!this.clip) return;
    const anim =
      this.skeleton.data.findAnimation(name) ??
      this.skeleton.data.animations.find((a) => a.name === name);
    if (!anim) return;

    this.state.setAnimation(0, anim.name, this.loop);
    this.frameCount = Math.max(
      1,
      Math.ceil(anim.duration * SPINE_PREVIEW_FPS),
    );
    this.frameIndex = 0;
    this.applyPose(0);
    this.updateBounds();
    this.fitToView();
    this.emitFrame();
  }

  play(): void {
    this.playing = true;
    this.lastTime = performance.now();
  }

  pause(): void {
    this.playing = false;
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
    const entry = this.state.getCurrent(0);
    if (entry) entry.loop = loop;
  }

  setSpeed(speed: number): void {
    this.state.timeScale = speed;
  }

  gotoFrame(frame: number): void {
    if (!this.frameCount) return;
    this.frameIndex = Math.max(0, Math.min(frame, this.frameCount - 1));
    this.applyPose(this.frameIndex / SPINE_PREVIEW_FPS);
    this.emitFrame();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  fitToView(): void {
    this.userZoom = 1;
    this.updateCamera(true);
  }

  enablePan(): void {
    const canvas = this.getCanvas();
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dragCameraX = 0;
    let dragCameraY = 0;

    const endDrag = () => {
      dragging = false;
    };

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      dragCameraX = this.cameraX;
      dragCameraY = this.cameraY;
    });
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("lostpointercapture", endDrag);
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (!dragging) return;
      const delta = this.screenDeltaToWorld(
        e.clientX - startX,
        e.clientY - startY,
      );
      this.cameraX = dragCameraX - delta.x;
      this.cameraY = dragCameraY - delta.y;
      this.updateCamera(false);
    });
    canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        // zoom 越大视野越大；滚轮向上应放大（减小 zoom）
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        this.userZoom = Math.max(0.1, Math.min(this.userZoom * factor, 16));
        this.updateCamera(false);
      },
      { passive: false },
    );
  }

  private screenDeltaToWorld(dx: number, dy: number): { x: number; y: number } {
    const { camera } = this.renderer;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w <= 0 || h <= 0) return { x: 0, y: 0 };

    camera.update();
    const origin = this.screenScratch.set(0, 0, 0);
    const offset = this.screenScratch2.set(dx, dy, 0);
    camera.screenToWorld(origin, w, h);
    camera.screenToWorld(offset, w, h);
    return { x: offset.x - origin.x, y: offset.y - origin.y };
  }

  private applyPose(time: number): void {
    const entry = this.state.getCurrent(0);
    if (!entry) return;
    entry.trackTime = time;
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform();
  }

  private updateBounds(): void {
    this.skeleton.getBounds(this.boundsOffset, this.boundsSize);
  }

  private updateCamera(resetPosition: boolean): void {
    if (!this.renderer) return;
    const { camera } = this.renderer;
    const pad = 40;
    const bw = this.boundsSize.x || 1;
    const bh = this.boundsSize.y || 1;
    const availW = Math.max(1, camera.viewportWidth - pad * 2);
    const availH = Math.max(1, camera.viewportHeight - pad * 2);
    this.fitZoom = Math.max(bw / availW, bh / availH) * 1.05;
    camera.zoom = this.fitZoom * this.userZoom;

    const cx = this.boundsOffset.x + bw / 2;
    const cy = this.boundsOffset.y + bh / 2;
    if (resetPosition) {
      this.cameraX = cx;
      this.cameraY = cy;
    }
    camera.position.x = this.cameraX;
    camera.position.y = this.cameraY;
    camera.update();
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(parent.clientWidth * dpr));
    const h = Math.max(1, Math.floor(parent.clientHeight * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    this.renderer.resize(ResizeMode.Expand);
    this.updateCamera(false);
  }

  private emitFrame(): void {
    this.onFrameChange?.(this.frameIndex, this.frameCount);
  }

  private tick = (): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.playing) {
      this.state.update(delta);
      this.state.apply(this.skeleton);
      this.skeleton.updateWorldTransform();

      const entry = this.state.getCurrent(0);
      if (entry) {
        const nextFrame = Math.floor(entry.trackTime * SPINE_PREVIEW_FPS);
        if (nextFrame !== this.frameIndex) {
          this.frameIndex = Math.min(nextFrame, this.frameCount - 1);
          this.emitFrame();
        }
        if (!this.loop && entry.isComplete()) {
          this.playing = false;
        }
      }
    }

    this.render();
  };

  private render(): void {
    this.renderer.resize(ResizeMode.Expand);
    this.updateCamera(false);

    const gl = this.context.gl;
    const [r, g, b, a] = hexToGlColor(this.backgroundColor);
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.renderer.begin();
    this.renderer.drawSkeleton(this.skeleton, true);
    this.renderer.end();
  }
}
