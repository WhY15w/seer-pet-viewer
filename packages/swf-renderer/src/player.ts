import {

  Application,

  Container,

  Geometry,

  Mesh,

  RenderTexture,

  Shader,

  Texture,

} from "pixi.js";

import type { SwfClipData, SwfFrame, SwfSequence } from "@seer/swf-bundle";

import {

  materialToPixiBlend,

  needsGrabPass,

  needsStencilTest,

  isMaskClearer,

  isMaskWriter,

} from "./blend.js";

import { createSwfShader, updateSwfShaderResources } from "./swf-shader.js";



export interface SwfPlayerOptions {

  backgroundColor?: number;

  tint?: [number, number, number, number];

}



export class SwfPlayer {

  private app!: Application;

  private root = new Container();

  private stage = new Container();

  private texture!: Texture;

  private clip: SwfClipData | null = null;

  private sequence: SwfSequence | null = null;

  private frameIndex = 0;

  private playing = false;

  private loop = true;

  private speed = 1;

  private accumulator = 0;

  private tint: [number, number, number, number] = [1, 1, 1, 1];

  private grabTexture: RenderTexture | null = null;

  private meshes: Mesh<Geometry, Shader>[] = [];

  private shaders: { normal: Shader | null; grab: Shader | null } = {

    normal: null,

    grab: null,

  };

  private bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private fitScale = 1;
  private userZoom = 1;
  private onFrameChange?: (frame: number, total: number) => void;

  private stencilRef = 0;



  async mount(

    parent: HTMLElement,

    clip: SwfClipData,

    options: SwfPlayerOptions = {},

  ): Promise<void> {

    this.clip = clip;

    this.tint = options.tint ?? [1, 1, 1, 1];

    this.texture = Texture.from(clip.atlas);

    this.texture.source.scaleMode = "nearest";

    this.texture.source.alphaMode = "no-premultiply-alpha";



    this.app = new Application();

    await this.app.init({

      resizeTo: parent,

      background: options.backgroundColor ?? 0x1a1a2e,

      antialias: false,

      resolution: window.devicePixelRatio || 1,

      autoDensity: true,

      preference: "webgl",

    });

    parent.appendChild(this.app.canvas);



    this.root.addChild(this.stage);

    this.app.stage.addChild(this.root);



    this.shaders.normal = createSwfShader(this.texture, false, this.tint);
    this.shaders.grab = createSwfShader(this.texture, true, this.tint);



    this.setSequence(clip.sequences[0]?.name ?? "standby");
    requestAnimationFrame(() => this.fitToView());

    this.app.renderer.on("resize", () => this.fitToView());



    this.app.ticker.add((ticker) => {

      if (!this.playing || !this.sequence) return;

      this.accumulator += (ticker.deltaMS / 1000) * this.speed;

      const frameDuration = 1 / (this.clip?.frameRate ?? 24);

      while (this.accumulator >= frameDuration) {

        this.accumulator -= frameDuration;

        this.advanceFrame();

      }

    });

  }



  destroy(): void {

    this.shaders.normal?.destroy();

    this.shaders.grab?.destroy();

    this.shaders = { normal: null, grab: null };

    this.app?.destroy(true, { children: true });

    this.clip?.atlas.close();

  }



  setOnFrameChange(cb: (frame: number, total: number) => void): void {

    this.onFrameChange = cb;

  }

  setBackgroundColor(color: number): void {
    if (!this.app?.renderer) return;
    this.app.renderer.background.color = color;
  }



  setSequence(name: string): void {

    if (!this.clip) return;

    const seq = this.clip.sequences.find((s) => s.name === name);

    if (!seq) return;

    this.sequence = seq;

    this.frameIndex = 0;

    this.accumulator = 0;

    this.renderCurrentFrame();

    this.fitToView();

  }



  play(): void {

    this.playing = true;

  }



  pause(): void {

    this.playing = false;

  }



  setLoop(loop: boolean): void {

    this.loop = loop;

  }



  setSpeed(speed: number): void {

    this.speed = speed;

  }



  gotoFrame(frame: number): void {

    if (!this.sequence) return;

    this.frameIndex = Math.max(

      0,

      Math.min(frame, this.sequence.frames.length - 1),

    );

    this.renderCurrentFrame();

  }



  getFrameIndex(): number {

    return this.frameIndex;

  }



  getFrameCount(): number {

    return this.sequence?.frames.length ?? 0;

  }



  getCanvas(): HTMLCanvasElement {

    return this.app.canvas as HTMLCanvasElement;

  }



  fitToView(): void {
    if (!this.app) return;
    this.userZoom = 1;
    const pad = 40;
    const bw = this.bounds.maxX - this.bounds.minX || 1;
    const bh = this.bounds.maxY - this.bounds.minY || 1;
    const sx = (this.app.screen.width - pad * 2) / bw;
    const sy = (this.app.screen.height - pad * 2) / bh;
    this.fitScale = Math.min(sx, sy);
    this.applyTransform(true);
  }

  private applyTransform(resetPosition = false): void {
    if (!this.app) return;
    const scale = this.fitScale * this.userZoom;
    this.root.scale.set(scale, -scale);
    if (!resetPosition) return;
    const cx = (this.bounds.minX + this.bounds.maxX) / 2;
    const cy = (this.bounds.minY + this.bounds.maxY) / 2;
    this.root.position.set(
      this.app.screen.width / 2 - cx * scale,
      this.app.screen.height / 2 + cy * scale,
    );
  }

  setZoom(zoom: number): void {
    this.userZoom = Math.max(0.1, Math.min(zoom, 16));
    this.applyTransform(false);
  }

  getZoom(): number {
    return this.userZoom;
  }



  enablePan(): void {

    const canvas = this.getCanvas();

    let dragging = false;

    let lastX = 0;

    let lastY = 0;

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {

      dragging = true;

      lastX = e.clientX;

      lastY = e.clientY;

    });

    canvas.addEventListener("pointerup", () => {

      dragging = false;

    });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {

      if (!dragging) return;

      this.root.x += e.clientX - lastX;

      this.root.y += e.clientY - lastY;

      lastX = e.clientX;

      lastY = e.clientY;

    });

    canvas.addEventListener(

      "wheel",

      (e: WheelEvent) => {

        e.preventDefault();

        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.userZoom * factor);

      },

      { passive: false },

    );

  }



  private advanceFrame(): void {

    if (!this.sequence) return;

    const total = this.sequence.frames.length;

    let next = this.frameIndex + 1;

    if (next >= total) {

      if (!this.loop) {

        this.playing = false;

        return;

      }

      next = 0;

    }

    this.frameIndex = next;

    this.renderCurrentFrame();

  }



  private renderCurrentFrame(): void {

    if (!this.sequence) return;

    const frame = this.sequence.frames[this.frameIndex];

    if (!frame) return;

    this.updateBounds(frame);

    this.clearMeshes();

    this.renderFrame(frame);
    this.onFrameChange?.(this.frameIndex, this.sequence.frames.length);
    this.app?.render();

  }



  private updateBounds(frame: SwfFrame): void {

    const pos = frame.mesh.positions;

    if (pos.length < 2) return;

    let minX = pos[0]!;

    let maxX = pos[0]!;

    let minY = pos[1]!;

    let maxY = pos[1]!;

    for (let i = 0; i < pos.length; i += 2) {

      minX = Math.min(minX, pos[i]!);

      maxX = Math.max(maxX, pos[i]!);

      minY = Math.min(minY, pos[i + 1]!);

      maxY = Math.max(maxY, pos[i + 1]!);

    }

    this.bounds = { minX, minY, maxX, maxY };

  }



  private clearMeshes(): void {

    for (const mesh of this.meshes) mesh.destroy();

    this.meshes = [];

    this.stage.removeChildren();

    this.stencilRef = 0;

  }



  private renderFrame(frame: SwfFrame): void {

    for (const subMesh of frame.mesh.subMeshes) {

      const material = subMesh.material;



      if (isMaskWriter(material)) {

        this.stencilRef = material.stencilId || this.stencilRef + 1;

      }



      const start = subMesh.startVertex;

      const vertCount = (subMesh.indexCount / 6) * 4;

      const positions: number[] = [];

      const uvs: number[] = [];

      const mulColors: number[] = [];

      const addColors: number[] = [];



      for (let i = 0; i < vertCount; i++) {

        const vi = start + i;

        positions.push(

          frame.mesh.positions[vi * 2]!,

          frame.mesh.positions[vi * 2 + 1]!,

        );

        uvs.push(frame.mesh.uvs[vi * 2]!, frame.mesh.uvs[vi * 2 + 1]!);

        mulColors.push(

          frame.mesh.mulColors[vi * 4]!,

          frame.mesh.mulColors[vi * 4 + 1]!,

          frame.mesh.mulColors[vi * 4 + 2]!,

          frame.mesh.mulColors[vi * 4 + 3]!,

        );

        addColors.push(

          frame.mesh.addColors[vi * 4]!,

          frame.mesh.addColors[vi * 4 + 1]!,

          frame.mesh.addColors[vi * 4 + 2]!,

          frame.mesh.addColors[vi * 4 + 3]!,

        );

      }



      const indices: number[] = [];

      for (let i = 0; i < subMesh.indexCount; i++) {

        indices.push(frame.mesh.indices[subMesh.indexStart + i]! - start);

      }



      const grab = needsGrabPass(material);

      if (grab) this.snapshotGrab();



      const geometry = new Geometry({

        attributes: {

          aPosition: { buffer: new Float32Array(positions), size: 2 },

          aUV: { buffer: new Float32Array(uvs), size: 2 },

          aMulColor: { buffer: new Float32Array(mulColors), size: 4 },

          aAddColor: { buffer: new Float32Array(addColors), size: 4 },

        },

        indexBuffer: new Uint16Array(indices),

      });



      const shaderKey = grab ? "grab" : "normal";

      const shader = this.shaders[shaderKey]!;

      updateSwfShaderResources(
        shader,
        this.texture,
        this.tint,
        grab,
        material.grabBlend,
        grab ? this.ensureGrabTexture() : undefined,
      );



      const mesh = new Mesh({

        geometry,

        shader,

        texture: this.texture,

      }) as Mesh<Geometry, Shader>;

      mesh.blendMode = materialToPixiBlend(material).blendMode as never;



      if (needsStencilTest(material)) {

        mesh.alpha = 1;

        (mesh as unknown as { stencilRef: number }).stencilRef =

          material.stencilId || this.stencilRef;

      }



      if (isMaskClearer(material)) {

        this.stencilRef = Math.max(0, this.stencilRef - 1);

      }



      this.stage.addChild(mesh);

      this.meshes.push(mesh);

    }

  }



  private ensureGrabTexture(): RenderTexture {

    if (!this.grabTexture) {

      this.grabTexture = RenderTexture.create({

        width: Math.max(1, this.app.screen.width),

        height: Math.max(1, this.app.screen.height),

      });

    }

    return this.grabTexture;

  }



  private snapshotGrab(): void {

    const rt = this.ensureGrabTexture();

    this.app.renderer.render({

      container: this.app.stage,

      target: rt,

      clear: true,

    });

  }

}


