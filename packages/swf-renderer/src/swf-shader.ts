import {
  Matrix,
  Shader,
  Texture,
  UniformGroup,
  compileHighShaderGlProgram,
  localUniformBitGl,
  roundPixelsBitGl,
  textureBitGl,
  type GlProgram,
} from "pixi.js";
import type { SwfBlendMode } from "@seer/swf-bundle";
import { grabModeId } from "./shaders.js";

const swfColorBitGl = {
  name: "swf-color-bit",
  vertex: {
    header: /* glsl */ `
      in vec4 aMulColor;
      in vec4 aAddColor;
      out vec4 vMulColor;
      out vec4 vAddColor;
    `,
    start: /* glsl */ `
      vMulColor = aMulColor;
      vAddColor = aAddColor;
    `,
  },
  fragment: {
    header: /* glsl */ `
      in vec4 vMulColor;
      in vec4 vAddColor;
      uniform vec4 uTint;
    `,
    main: /* glsl */ `
      outColor = outColor * vMulColor * uTint;
      float swfA = outColor.a;
      outColor = outColor + step(0.01, swfA) * vAddColor;
      outColor.rgb *= outColor.a;
    `,
  },
};

const swfGrabBitGl = {
  name: "swf-grab-bit",
  fragment: {
    header: /* glsl */ `
      uniform sampler2D uGrabTexture;
      uniform int uGrabMode;
    `,
    main: /* glsl */ `
      vec4 grab = texture(uGrabTexture, vUV);
      if (uGrabMode == 1) {
        outColor = min(grab, outColor);
        outColor.a = grab.a;
      } else if (uGrabMode == 2) {
        outColor = abs(grab - outColor);
        outColor.a = grab.a;
      } else if (uGrabMode == 3) {
        outColor = vec4(1.0 - grab.rgb, grab.a);
      } else if (uGrabMode == 4) {
        outColor = mix(2.0 * grab * outColor, 1.0 - 2.0 * (1.0 - grab) * (1.0 - outColor), step(0.5, grab));
        outColor.a = grab.a;
      } else if (uGrabMode == 5) {
        outColor = mix(2.0 * grab * outColor, 1.0 - (1.0 - grab) * (1.0 - 2.0 * (outColor - 0.5)), step(0.5, outColor));
        outColor.a = grab.a;
      }
      outColor.rgb *= outColor.a;
    `,
  },
};

const swfMaskBitGl = {
  name: "swf-mask-bit",
  vertex: {
    header: /* glsl */ `
      in vec4 aMulColor;
      out float vMaskAlpha;
    `,
    start: /* glsl */ `
      vMaskAlpha = aMulColor.a;
    `,
  },
  fragment: {
    header: /* glsl */ `
      in float vMaskAlpha;
    `,
    main: /* glsl */ `
      outColor = vec4(1.0, 1.0, 1.0, 1.0);
    `,
  },
};

let glProgramNormal: GlProgram | null = null;
let glProgramGrab: GlProgram | null = null;
let glProgramMask: GlProgram | null = null;

function getGlProgram(grab: boolean, mask = false): GlProgram {
  if (mask) {
    glProgramMask ??= compileHighShaderGlProgram({
      name: "swf-mask-shader",
      bits: [localUniformBitGl, textureBitGl, swfMaskBitGl, roundPixelsBitGl],
    });
    return glProgramMask;
  }
  if (grab) {
    glProgramGrab ??= compileHighShaderGlProgram({
      name: "swf-grab-shader",
      bits: [localUniformBitGl, textureBitGl, swfColorBitGl, swfGrabBitGl, roundPixelsBitGl],
    });
    return glProgramGrab;
  }
  glProgramNormal ??= compileHighShaderGlProgram({
    name: "swf-shader",
    bits: [localUniformBitGl, textureBitGl, swfColorBitGl, roundPixelsBitGl],
  });
  return glProgramNormal;
}

export function createSwfShader(
  texture: Texture,
  grab: boolean,
  tint: [number, number, number, number],
  mask = false,
): Shader {
  const swfUniforms = new UniformGroup({
    uTint: { value: new Float32Array(tint), type: "vec4<f32>" },
    ...(grab ? { uGrabMode: { value: 0, type: "i32" as const } } : {}),
  });

  return new Shader({
    glProgram: getGlProgram(grab, mask),
    resources: {
      localUniforms: new UniformGroup({
        uTransformMatrix: { value: new Matrix(), type: "mat3x3<f32>" },
        uColor: { value: new Float32Array([1, 1, 1, 1]), type: "vec4<f32>" },
        uRound: { value: 0, type: "f32" },
      }),
      swfUniforms,
      textureUniforms: new UniformGroup({
        uTextureMatrix: { value: new Matrix(), type: "mat3x3<f32>" },
      }),
      uTexture: texture.source,
      uSampler: texture.source.style,
      ...(grab
        ? {
            uGrabTexture: Texture.EMPTY.source,
            uGrabSampler: Texture.EMPTY.source.style,
          }
        : {}),
    },
  });
}

export function updateSwfShaderResources(
  shader: Shader,
  texture: Texture,
  tint: [number, number, number, number],
  grab: boolean,
  grabBlend?: SwfBlendMode,
  grabTexture?: Texture,
  mask = false,
): void {
  if (mask) {
    const textureUniforms = shader.resources.textureUniforms as UniformGroup<{
      uTextureMatrix: { value: Matrix; type: "mat3x3<f32>" };
    }>;
    textureUniforms.uniforms.uTextureMatrix.copyFrom(texture.textureMatrix.mapCoord);
    textureUniforms.update();
    shader.resources.uTexture = texture.source;
    shader.resources.uSampler = texture.source.style;
    return;
  }

  const swfUniforms = shader.resources.swfUniforms as UniformGroup<{
    uTint: { value: Float32Array; type: "vec4<f32>" };
    uGrabMode?: { value: number; type: "i32" };
  }>;
  swfUniforms.uniforms.uTint.set(tint);
  swfUniforms.update();

  const textureUniforms = shader.resources.textureUniforms as UniformGroup<{
    uTextureMatrix: { value: Matrix; type: "mat3x3<f32>" };
  }>;
  textureUniforms.uniforms.uTextureMatrix.copyFrom(texture.textureMatrix.mapCoord);
  textureUniforms.update();

  shader.resources.uTexture = texture.source;
  shader.resources.uSampler = texture.source.style;

  if (grab && grabTexture) {
    shader.resources.uGrabTexture = grabTexture.source;
    shader.resources.uGrabSampler = grabTexture.source.style;
    swfUniforms.uniforms.uGrabMode = grabModeId(grabBlend);
    swfUniforms.update();
  }
}
