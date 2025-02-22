import { useEffect, useRef, CanvasHTMLAttributes } from "react";
import {
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

export default function SceneDisplay() {
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

let judge: Mesh;

async function onSceneReady(scene: Scene) {
	console.debug("Initializing scene");

	registerBuiltInLoaders();

	// gotta be RH for glb
	scene.useRightHandedSystem = true;

	const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
	camera.setTarget(Vector3.Zero());

	const canvas = scene.getEngine().getRenderingCanvas();

	// allows for control with mouse
	camera.attachControl(canvas, true);

	// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
	const light = new HemisphericLight("light", new Vector3(1, 3, 0), scene);

	light.intensity = 0.9;

	{
		// loading judge model
		const container = await LoadAssetContainerAsync("/assets/models/judge.glb", scene);
		judge = container.meshes[0] as Mesh;
		container.addAllToScene();
	}

	//box = MeshBuilder.CreateBox("box", { size: 2 }, scene);
	// box.position.y = 1;

	MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

	console.debug("Scene initialization done");
}

// runs once per frame
const onRender = (scene: Scene) => {
	if (typeof judge != "undefined") {
		judge.addRotation(0, 0.01, 0);
	}
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

		const engine = new Engine(canvas, antialias, engineOptions, adaptToDeviceRatio);
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
	}, [antialias, engineOptions, adaptToDeviceRatio, sceneOptions, onRender, onSceneReady]);

	return <canvas ref={reactCanvas} {...rest} />;
}
