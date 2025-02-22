import {
	FreeCamera,
	Vector3,
	HemisphericLight,
	MeshBuilder,
	Mesh,
	Scene,
	LoadAssetContainerAsync,
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import SceneComponent from "./components/SceneComponent";

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
	const light = new HemisphericLight("light", new Vector3(-1, 3, 0), scene);

	light.intensity = 0.9;

	{
		// loading judge model
		const container = await LoadAssetContainerAsync("/assets/judge.glb", scene);
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

export default function App() {
	return (
		<div className="w-screen h-screen">
			<SceneComponent
				antialias
				onSceneReady={onSceneReady}
				onRender={onRender}
				id="scene-canvas"
				className="w-full h-full"
			/>
		</div>
	);
}
