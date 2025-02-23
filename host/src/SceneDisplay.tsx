import { useEffect, useRef, CanvasHTMLAttributes, useCallback } from "react";
import {
    Color4,
    Color3,
    AnimationGroup,
    AbstractMesh,
    DirectionalLight,
    FreeCamera,
    Vector3,
    HemisphericLight,
    Mesh,
    Scene,
    SceneOptions,
    Engine,
    EngineOptions,
    LoadAssetContainerAsync,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { GamePhase } from "./types";

export default function SceneDisplay({
    className,
    phase,
}: {
    className: string;
    phase: GamePhase;
}) {
    const onSceneReady = useCallback(async (scene: Scene) => {
        registerBuiltInLoaders();

        // gotta be right handed for glb importing
        scene.useRightHandedSystem = true;
        scene.clearColor = Color4.FromColor3(Color3.White());
        scene.ambientColor = Color3.Red();

        camera = new FreeCamera("camera", Vector3.Zero(), scene);

        const hemi_light = new HemisphericLight(
            "hemi light",
            SUN_DIR.negate(),
            scene
        );
        hemi_light.intensity = 1.2;
        const hemi_light_opposite = new HemisphericLight(
            "hemi light opposite",
            SUN_DIR,
            scene
        );
        hemi_light_opposite.intensity = 0.4;
        const dir_light = new DirectionalLight(
            "directional light",
            SUN_DIR,
            scene
        );
        dir_light.intensity = 0.5;

        {
            // loading environment
            const container = await LoadAssetContainerAsync(
                "/models/environment.glb",
                scene
            );
            container.addAllToScene();
        }

        {
            // loading judge model
            const container = await LoadAssetContainerAsync(
                "/models/judge.glb",
                scene
            );
            judge = container.meshes[0] as Mesh;
            judge.position = new Vector3(0, 4, -17);
            judge.scalingDeterminant = 1.35;

            // animations
            judge_idle_anim = container.animationGroups[0];
            judge_idle_anim.loopAnimation = true;
            judge_idle_anim.play();
            judge_talking_anim = container.animationGroups[1];
            judge_talking_anim.loopAnimation = true;

            container.addAllToScene();
        }

        {
            // loading person model
            const container = await LoadAssetContainerAsync(
                "/models/person.glb",
                scene
            );

            const person = new Mesh("person", scene);
            container.meshes.map((m: AbstractMesh) => {
                person.addChild(m);
            });
            const SCALE = 0.16;
            person.scaling = new Vector3(SCALE, SCALE, SCALE);

            player_d = person.clone("Defendant");
            player_d.rotate(Vector3.Up(), 2.7);
            player_d.position = PLAYER_D_POS;

            player_p = person.clone("Prosecutor");
            player_p.rotate(Vector3.Up(), -2.7);
            player_p.position = PLAYER_P_POS;
        }

        camera_positions.push({
            pos: new Vector3(0, 10, 2),
            look_at: new Vector3(0, 5, -14),
        });
        // judge talking
        camera_positions.push({
            pos: new Vector3(0, 6, 2),
            look_at: new Vector3(0, 8, -15),
        });
        // judge -> defendant
        camera_positions.push({
            pos: new Vector3(-3, 11, -17),
            look_at: new Vector3(-11, 3, 5),
        });
        // judge -> prosecutor
        camera_positions.push({
            pos: new Vector3(3, 11, -17),
            look_at: new Vector3(11, 3, 5),
        });

        camera.fov = 0.9; //rad

        const canvas = scene.getEngine().getRenderingCanvas();
        camera.attachControl(canvas, true); // allows for control with mouse

        initialized = true;
    }, []);
    // runs once per frame
    const onRender = useCallback(
        (scene: Scene) => {
            if (!initialized) {
                return;
            }
            const cur_phase = phase;
            //console.log(cur_phase, cur_turn);
            switch (cur_phase) {
                case GamePhase.MAIN_MENU:
                    camera_i = 0;
                    break;
                case GamePhase.JUDGE_TALKING:
                    camera_i = 1;
                    break;
                case GamePhase.DEFENSE_TALKING:
                    camera_i = 2;
                    break;
                case GamePhase.PROSECUTOR_TALKING:
                    camera_i = 3;
                    break;
            }

            const { pos, look_at } = camera_positions[camera_i];
            camera.position = Vector3.Lerp(camera.position, pos, 0.05);
            camera.target = Vector3.Lerp(camera.target, look_at, 0.05);
        },
        [phase]
    );

    return (
        <SceneRenderer
            antialias
            onSceneReady={onSceneReady}
            onRender={onRender}
            id="scene-canvas"
            className={className}
        />
    );
}

type CameraPos = {
    pos: Vector3;
    look_at: Vector3;
};

const SUN_DIR = new Vector3(1, -3, -1).normalize();

let initialized: boolean = false;

let camera: FreeCamera;
const camera_positions: CameraPos[] = [];
let camera_i = 0;

let judge: Mesh;
let judge_idle_anim: AnimationGroup;
let judge_talking_anim: AnimationGroup;

let player_d: Mesh;
const PLAYER_D_POS = new Vector3(-14, 0, 7);
let player_p: Mesh;
const PLAYER_P_POS = new Vector3(14, 0, 7);

function SceneRenderer({
    antialias,
    engineOptions,
    adaptToDeviceRatio,
    sceneOptions,
    onRender,
    onSceneReady,
    ...rest
}: {
    antialias: boolean;
    engineOptions?: EngineOptions;
    adaptToDeviceRatio?: boolean;
    sceneOptions?: SceneOptions;
    onRender: (scene: Scene) => void;
    onSceneReady: (scene: Scene) => void;
} & CanvasHTMLAttributes<HTMLCanvasElement>) {
    const reactCanvas = useRef(null);

    useEffect(() => {
        if (reactCanvas.current) {
            const engine = new Engine(
                reactCanvas.current,
                antialias,
                engineOptions,
                adaptToDeviceRatio
            );
            const scene = new Scene(engine, sceneOptions);

            if (scene.isReady()) {
                onSceneReady(scene);
            } else {
                scene.onReadyObservable.addOnce((scene) => onSceneReady(scene));
            }

            engine.runRenderLoop(() => {
                if (typeof onRender === "function") {
                    onRender(scene);
                }
                scene.render();
            });
            const resize = () => {
                scene.getEngine().resize();
            };
            if (window) {
                window.addEventListener("resize", resize);
            }
            return () => {
                scene.getEngine().dispose();
                if (window) {
                    window.removeEventListener("resize", resize);
                }
            };
        }
    }, [
        antialias,
        engineOptions,
        adaptToDeviceRatio,
        sceneOptions,
        onRender,
        onSceneReady,
    ]);

    return <canvas ref={reactCanvas} {...rest} />;
}
