import {
  Types,
  addComponent,
  defineComponent,
  defineQuery,
  enterQuery,
} from "bitecs";
import {
  App,
  AvatarPOVNode,
  EntityID,
  Held,
  HubsWorld,
  PermissionE,
  SoundDefT,
  SoundEffectsSystem,
  SystemOrderE,
  SystemsE,
  anyEntityWith,
  createNetworkedEntity,
  registerAddon,
} from "hubs";
import { Vector3 } from "three";
import URL_QUACK from "../assets/quack.mp3";
import URL_SPECIAL_QUACK from "../assets/specialquack.mp3";
import { DuckPrefab } from "./duck-prefab";

// @ts-ignore
import PolyuworldEmscriptenAddonTemplate from "./cpp/cmake-build/emscripten/polyuworld-emscripten-addon-template.js";

debugger;

let module: any;

const Quack = defineComponent({
  quacks: Types.f32,
});

type QuackParams = {
  quacks?: number;
};

const DEFAULTS: Required<QuackParams> = {
  quacks: 1,
};

const duckInflator = (
  world: HubsWorld,
  eid: number,
  params?: QuackParams
): EntityID => {
  params = Object.assign({}, params, DEFAULTS);
  addComponent(world, Quack, eid);
  Quack.quacks[eid] = params.quacks!;
  return eid;
};

function playSound() {
  const rand = Math.random();
  if (rand < 0.01) {
    APP.scene?.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(
      sounds.get(URL_SPECIAL_QUACK)
    );
  } else {
    APP.scene?.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(
      sounds.get(URL_QUACK)
    );
  }
}

function callCXX() {
  console.log(module.Factorial_10);
}

const heldQuackQuery = defineQuery([Quack, Held]);
const heldQuackEnterQuery = enterQuery(heldQuackQuery);
const quackSystem = (app: App): void => {
  heldQuackEnterQuery(app.world).forEach(() => {
    playSound();
    callCXX();
  });
};

function duckChatCommand(app: App) {
  const avatarEid = anyEntityWith(app.world, AvatarPOVNode)!;
  const avatarPov = app.world.eid2obj.get(avatarEid)!;
  const eid = createNetworkedEntity(APP.world, "duck", {});
  const obj = app.world.eid2obj.get(eid)!;
  obj.position.copy(avatarPov.localToWorld(new Vector3(0, 0, -1.5)));
  obj.lookAt(avatarPov.getWorldPosition(new Vector3()));
  playSound();
  callCXX();
}

function onReady(app: App) {
  [URL_QUACK, URL_SPECIAL_QUACK].forEach((url) => {
    const sfxSystem = app.getSystem(
      SystemsE.SoundEffectsSystem
    ) as SoundEffectsSystem;
    sfxSystem.registerSound(url).then((sound: SoundDefT) => {
      sounds.set(sound.url, sound.id);
    });
  });

  PolyuworldEmscriptenAddonTemplate({
    locateFile: function(path: string) {
      debugger;
      return `https://assets.polyu.world/hubs/assets/wasm/${path}`;
    }
  })
  .then((instance: any) => {
    module = instance;
  });
}

let sounds = new Map<string, number>();

registerAddon("polyuworld-emscripten-addon-template", {
  name: "polyuworld emscripten addon template",
  description: `Enabling C++ programming with this add-on`,
  onReady: onReady,
  system: { system: quackSystem, order: SystemOrderE.PostPhysics },
  inflator: { jsx: { id: "quack", inflator: duckInflator } },
  prefab: {
    id: "duck",
    config: {
      permission: PermissionE.SPAWN_AND_MOVE_MEDIA,
      template: DuckPrefab,
    },
  },
  chatCommand: { id: "duck", command: duckChatCommand },
});
