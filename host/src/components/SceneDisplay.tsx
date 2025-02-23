import { useEffect, useRef, CanvasHTMLAttributes } from "react";
import {
	FreeCamera,
	Vector3,
	HemisphericLight,
	Mesh,
	Scene,
	SceneOptions,
	Engine,
	EngineOptions,
	LoadAssetContainerAsync,
	Color4,
	Color3,
	AnimationGroup,
	KeyboardEventTypes,
	AbstractMesh,
	DirectionalLight,
    FreeCamera,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    Mesh,
    Scene,
    SceneOptions,
    Engine,
    EngineOptions,
    LoadAssetContainerAsync,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

export default function SceneDisplay({ className }: { className: string }) {
	return (
		<div className="w-screen h-screen">
			<SceneRenderer
				antialias
				onSceneReady={onSceneReady}
				onRender={onRender}
				id="scene-canvas"
				className="w-full h-full"
			/>
		</div>
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

async function onSceneReady(scene: Scene) {
    console.debug("Initializing scene");

    registerBuiltInLoaders();

	// gotta be right handed for glb importing
	scene.useRightHandedSystem = true;
	scene.clearColor = Color4.FromColor3(Color3.White());
	scene.ambientColor = Color3.Red();

	camera = new FreeCamera("camera", Vector3.Zero(), scene);

	const hemi_light = new HemisphericLight("hemi light", SUN_DIR.negate(), scene);
	hemi_light.intensity = 1.2;
	const hemi_light_opposite = new HemisphericLight("hemi light opposite", SUN_DIR, scene);
	hemi_light_opposite.intensity = 0.4;
	const dir_light = new DirectionalLight("directional light", SUN_DIR, scene);
	dir_light.intensity = 0.5;

	{
		// loading environment
		const container = await LoadAssetContainerAsync("/models/environment.glb", scene);
		container.addAllToScene();
	}

	{
		// loading judge model
		const container = await LoadAssetContainerAsync("/models/judge.glb", scene);
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
		const container = await LoadAssetContainerAsync("/models/person.glb", scene);

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

		//person.rotate(Vector3.Up(), 3.1);
	}

	camera_i = 1;
	// main judge cam
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

	// handle keypress
	scene.onKeyboardObservable.add((kbInfo) => {
		switch (kbInfo.type) {
			case KeyboardEventTypes.KEYDOWN:
				switch (kbInfo.event.key) {
					case " ":
						camera_i = (camera_i + 1) % camera_positions.length;
						break;
				}
				break;
			case KeyboardEventTypes.KEYUP:
				break;
		}
	});

	initialized = true;
	console.debug("Scene initialization done");
}

// runs once per frame
const onRender = (scene: Scene) => {
	if (!initialized) {
		return;
	}
	const { pos, look_at } = camera_positions[camera_i];
	camera.position = Vector3.Lerp(camera.position, pos, 0.05);
	camera.target = Vector3.Lerp(camera.target, look_at, 0.05);
};

export function SceneRenderer({
    antialias,
    engineOptions,
    adaptToDeviceRatio,
    sceneOptions,
    onRender,
    onSceneReady,
    ...rest
}: CanvasHTMLAttributes<HTMLCanvasElement> & {
    antialias: boolean;
    engineOptions?: EngineOptions;
    adaptToDeviceRatio?: boolean;
    sceneOptions?: SceneOptions;
    onRender: (scene: Scene) => void;
    onSceneReady: (scene: Scene) => void;
}) {
    const reactCanvas = useRef(null);

    // set up basic engine and scene
    useEffect(() => {
        const { current: canvas } = reactCanvas;
        if (!canvas) return;

        const engine = new Engine(
            canvas,
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
            if (typeof onRender === "function") onRender(scene);
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
