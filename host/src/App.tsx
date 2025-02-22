import { FreeCamera, Vector3, HemisphericLight, MeshBuilder, Mesh, Scene } from "@babylonjs/core";
import SceneComponent from "./components/SceneComponent";

let box: Mesh;

const onSceneReady = (scene: Scene) => {
	console.debug("Initializing scene");

	const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
	camera.setTarget(Vector3.Zero());

	const canvas = scene.getEngine().getRenderingCanvas();

	// allows for control with mouse
	// camera.attachControl(canvas, true);

	// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
	const light = new HemisphericLight("light", new Vector3(0.5, 1, 0), scene);

	light.intensity = 0.9;

	box = MeshBuilder.CreateBox("box", { size: 2 }, scene);

	box.position.y = 1;

	MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

	console.debug("Scene initialization done");
};

// runs once per frame
const onRender = (scene: Scene) => {
	if (box !== undefined) {
		const deltaTimeInMillis = scene.getEngine().getDeltaTime();

		const rpm = 10;
		box.rotation.y += (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
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
