import * as T from 'three';
/** Lift dark ink without altering alpha or the shape of an official part. */
export function partSpriteMaterial(map: T.Texture, color: string | number) {
  const ink = new T.Color(color).lerp(new T.Color('#f1ffe0'), 0.65);
  const material = new T.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.partInk = { value: ink };
    shader.fragmentShader =
      'uniform vec3 partInk;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
   float luminance=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
   float darkInk=1.0-smoothstep(0.03,0.3,luminance);
   diffuseColor.rgb=mix(diffuseColor.rgb,partInk*(0.72+0.28*luminance),darkInk*0.92);`,
      );
  };
  material.customProgramCacheKey = () => 'readable-part-v1';
  return material;
}
