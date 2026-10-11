import { expect, test } from "bun:test";
import { Group, Sprite, SpriteMaterial, Texture } from "three";
import { animateAvatar, prepareAvatarForScene } from "./avatar-motion";

function pixelAvatar(): { readonly group: Group; readonly texture: Texture } {
  const texture = new Texture();
  texture.repeat.set(0.25, 0.25);
  const sprite = new Sprite(new SpriteMaterial({ map: texture }));
  sprite.userData.kind = "pixel-person";
  const group = new Group();
  group.add(sprite);
  return { group, texture };
}

test("pixel animation selects a camera-relative directional row", () => {
  // Given
  const { group, texture } = pixelAvatar();

  // When
  animateAvatar(group, {
    cameraAngle: 0,
    heading: Math.PI / 2,
    movedDistance: 0.2,
    traveledDistance: 0.2,
    reducedMotion: false,
  });

  // Then
  expect(texture.offset.y).toBe(0.25);
  expect(texture.offset.x).toBeGreaterThan(0);
});

test("reduced motion uses a still middle frame while moving", () => {
  // Given
  const { group, texture } = pixelAvatar();

  // When
  animateAvatar(group, {
    cameraAngle: 0,
    heading: 0,
    movedDistance: 0.2,
    traveledDistance: 0.2,
    reducedMotion: true,
  });

  // Then
  expect(texture.offset.x).toBe(0.5);
  expect(texture.offset.y).toBe(0.75);
});

test("blocked movement returns the character to its idle frame", () => {
  // Given
  const { group, texture } = pixelAvatar();

  // When
  animateAvatar(group, {
    cameraAngle: 0,
    heading: 0,
    movedDistance: 0,
    traveledDistance: 2,
    reducedMotion: false,
  });

  // Then
  expect(texture.offset.x).toBe(0);
});

test("prepared pixel sprites render above faded occluders", () => {
  // Given
  const { group } = pixelAvatar();
  const sprite = group.children[0];
  if (!(sprite instanceof Sprite)) throw new TypeError("pixel avatar sprite is missing");

  // When
  prepareAvatarForScene(group);

  // Then
  expect(sprite?.renderOrder).toBe(3);
  expect(sprite?.material.depthTest).toBe(false);
  expect(sprite?.material.depthWrite).toBe(false);
});
