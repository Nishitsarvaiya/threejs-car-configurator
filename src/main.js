import { DRACOLoader, GLTFLoader, OrbitControls, RGBELoader, RectAreaLightHelper } from "three/examples/jsm/Addons.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/Addons.js";
import "../style.css";

import {
	ACESFilmicToneMapping,
	AmbientLight,
	AxesHelper,
	CineonToneMapping,
	Color,
	DirectionalLight,
	DoubleSide,
	EquirectangularReflectionMapping,
	Fog,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	NoToneMapping,
	OrthographicCamera,
	PerspectiveCamera,
	PlaneGeometry,
	RectAreaLight,
	RepeatWrapping,
	SRGBColorSpace,
	Scene,
	ShaderMaterial,
	Skeleton,
	SkinnedMesh,
	SpotLight,
	SpotLightHelper,
	TextureLoader,
	Vector4,
	WebGLRenderer,
} from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { LoadingManager } from "three";

export default class Sketch {
	constructor(options) {
		this.scene = new Scene();
		// this.scene.background = new Color(0xffffff);
		// this.scene.environment = new RGBELoader().load("/textures/lonely_road_afternoon_puresky_1k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/meadow_2_1k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/thatch_chapel_2k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/venice_sunset_2k.hdr");
		this.hdri = new RGBELoader().load("/textures/poly_haven_studio_4k.hdr", (data) => {
			this.scene.environment = data;
			this.scene.environmentIntensity = 0.1;
			this.scene.environment.mapping = EquirectangularReflectionMapping;
		});
		// this.scene.fog = new Fog(0xffffff, 10, 15);

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xffffff, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputColorSpace = SRGBColorSpace;

		this.container.appendChild(this.renderer.domElement);

		const aspect = this.width / this.height;
		this.camera = new PerspectiveCamera(40, aspect, 0.01, 1000);
		// var frustumSize = this.height;
		// this.camera = new OrthographicCamera(
		// 	(frustumSize * aspect) / -2,
		// 	(frustumSize * aspect) / 2,
		// 	frustumSize / 2,
		// 	frustumSize / -2,
		// 	-1000,
		// 	1000
		// );
		this.camera.position.set(4, 3, 5);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.maxPolarAngle = MathUtils.degToRad(85);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.1;
		this.controls.minDistance = 2.5;
		this.controls.maxDistance = 10;

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(dracoLoader);

		this.gui = new GUI();

		this.time = 0;
		this.mouse = {
			x: 0,
			y: 0,
			prevX: 0,
			prevY: 0,
			vX: 0,
			vY: 0,
		};
		this.carProps = {
			Body: "#262626",
			Wheels: "#ffffff",
			Wing: "#262626",
			Diffusers: "#262626",
			Brakes: "#F2545B",
			Glass: "#ffffff",
		};
		this.wheels = [];
		this.materials = [];
		this.doors = [];
		this.bumpers = [];
		this.diffusers = [];
		this.brakes = [];
		this.glasses = [];
		this.wing = null;

		this.isPlaying = true;
		this.addMaterials();
		this.addStudio();
		// this.addObjects();
		this.addGUI();
		this.addLights();
		this.resize();
		this.render();
		this.setupResize();

		// this.mouseEvents();
	}

	mouseEvents() {
		window.addEventListener("mousemove", (e) => {
			this.mouse.prevX = this.mouse.x;
			this.mouse.prevY = this.mouse.y;
			this.mouse.x = e.clientX - this.width / 2;
			this.mouse.y = this.height / 2 - e.clientY;
			this.mouse.vX = this.mouse.x - this.mouse.prevX;
			this.mouse.vY = this.mouse.y - this.mouse.prevY;
		});
	}

	setupResize() {
		window.addEventListener("resize", this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;

		// image cover
		// this.imageAspect = 2400 / 1920;
		// let a1;
		// let a2;
		// if (this.height / this.width > this.imageAspect) {
		// 	a1 = (this.width / this.height) * this.imageAspect;
		// 	a2 = 1;
		// } else {
		// 	a1 = 1;
		// 	a2 = this.height / this.width / this.imageAspect;
		// }

		// this.material.uniforms.resolution.value.x = this.width;
		// this.material.uniforms.resolution.value.y = this.height;
		// this.material.uniforms.resolution.value.z = a1;
		// this.material.uniforms.resolution.value.w = a2;

		this.camera.updateProjectionMatrix();
	}

	addLights() {
		RectAreaLightUniformsLib.init();
		let light = new RectAreaLight("#ffffff", 1.5, 3, 6);
		light.rotation.set(Math.PI / 2, Math.PI, 0);
		light.position.set(0, 3, 0);
		this.scene.add(light);

		// light = new RectAreaLight("#ffffff", 0, 1, 2);
		// light.power = 20;
		// light.rotation.set(Math.PI / 2, Math.PI - 1, 0);
		// light.position.set(10, 8, 0);
		// this.scene.add(light);

		// light = new RectAreaLight("#ffffff", 0, 1, 2);
		// light.power = 20;
		// light.rotation.set(Math.PI / 2, Math.PI + 1, 0);
		// light.position.set(-10, 8, 0);
		// this.scene.add(light);

		this.scene.add(new AmbientLight("#ffffff", 1.5));

		// this.scene.add(new RectAreaLightHelper(light));
	}

	addMaterials() {
		this.bodyMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Body,
			metalness: 0.8,
			roughness: 0.3,
			clearcoat: 0.5,
			clearcoatRoughness: 0.1,
		});

		this.wheelMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Wheels,
			metalness: 0.8,
			roughness: 0.3,
			clearcoat: 0.5,
			clearcoatRoughness: 0.1,
		});

		this.wingMaterial = new MeshStandardMaterial({
			color: this.carProps.Wing,
			metalness: 0.5,
			roughness: 0.1,
			clearcoat: 0.2,
			clearcoatRoughness: 0,
		});

		this.diffuserMaterial = new MeshStandardMaterial({
			color: this.carProps.Diffusers,
			metalness: 0.5,
			roughness: 0.1,
			clearcoat: 0.2,
			clearcoatRoughness: 0,
		});

		this.brakeMaterial = new MeshStandardMaterial({
			color: this.carProps.Brakes,
			metalness: 0.5,
			roughness: 0.1,
			clearcoat: 0.2,
			clearcoatRoughness: 0,
		});

		this.glassMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Glass,
			metalness: 0,
			roughness: 0,
			reflectivity: 0.2,
			transmission: 1,
			clearcoat: 1,
			transparent: true,
		});

		this.materials.push(
			this.bodyMaterial,
			this.wheelMaterial,
			this.wingMaterial,
			this.diffuserMaterial,
			this.brakeMaterial,
			this.glassMaterial
		);
	}

	addStudio() {
		this.gltfLoader.load("/models/studio/spyder_studio.gltf", (gltf) => {
			gltf.scene.traverse((obj) => {
				if (obj.type === "Mesh") {
					obj.castShadow = true;
					obj.receiveShadow = true;
				}
			});
			const studio = gltf.scene;
			console.log(studio);
			const carBody = studio.getObjectByName("Body");
			this.doors.push(studio.getObjectByName("Door_Left"), studio.getObjectByName("Door_Right"));
			carBody.material = this.bodyMaterial;
			this.doors[0].material = this.bodyMaterial;
			this.doors[1].material = this.bodyMaterial;
			this.bumpers.push(studio.getObjectByName("Bumper"), studio.getObjectByName("Rear_Bumper"));
			this.bumpers[0].material = this.bodyMaterial;
			this.bumpers[1].material = this.bodyMaterial;

			const wing = studio.getObjectByName("Spoiler");
			wing.material = this.wingMaterial;

			this.diffusers.push(studio.getObjectByName("Diffuser"), studio.getObjectByName("Front_Diffuser"));
			this.diffusers[0].material = this.diffuserMaterial;
			this.diffusers[1].material = this.diffuserMaterial;

			this.wheels.push(
				studio.getObjectByName("Spyder-wheelFtL"),
				studio.getObjectByName("Spyder-wheelFtR"),
				studio.getObjectByName("Spyder-wheelBkL"),
				studio.getObjectByName("Spyder-wheelBkR")
			);
			this.wheels[0].material = this.wheelMaterial;
			this.wheels[1].material = this.wheelMaterial;
			this.wheels[2].material = this.wheelMaterial;
			this.wheels[3].material = this.wheelMaterial;

			this.brakes.push(
				studio.getObjectByName("Spyder-wheelbrakeFtL"),
				studio.getObjectByName("Spyder-wheelbrakeFtR"),
				studio.getObjectByName("Spyder-wheelbrakeBkL"),
				studio.getObjectByName("Spyder-wheelbrakeBkR")
			);
			this.brakes[0].material = this.brakeMaterial;
			this.brakes[1].material = this.brakeMaterial;
			this.brakes[2].material = this.brakeMaterial;
			this.brakes[3].material = this.brakeMaterial;

			this.glasses.push(
				studio.getObjectByName("Glass_Left"),
				studio.getObjectByName("Glass_Right"),
				studio.getObjectByName("Windshield")
			);
			this.glasses[0].material = this.glassMaterial;
			this.glasses[1].material = this.glassMaterial;
			this.glasses[2].material = this.glassMaterial;

			this.scene.add(studio);
		});
	}

	addGUI() {
		this.gui.addColor(this.carProps, "Body").onChange((newColor) => {
			this.bodyMaterial.color.set(newColor);
			this.bodyMaterial.needsUpdate = true;
		});
		this.gui.addColor(this.carProps, "Diffusers").onChange((newColor) => {
			this.diffuserMaterial.color.set(newColor);
			this.diffuserMaterial.needsUpdate = true;
		});
		this.gui.addColor(this.carProps, "Wheels").onChange((newColor) => {
			this.wheelMaterial.color.set(newColor);
			this.wheelMaterial.needsUpdate = true;
		});
		this.gui.addColor(this.carProps, "Wing").onChange((newColor) => {
			this.wingMaterial.color.set(newColor);
			this.wingMaterial.needsUpdate = true;
		});
		this.gui.addColor(this.carProps, "Brakes").onChange((newColor) => {
			this.brakeMaterial.color.set(newColor);
			this.brakeMaterial.needsUpdate = true;
		});
		this.gui.addColor(this.carProps, "Glass").onChange((newColor) => {
			this.glassMaterial.color.set(newColor);
			this.glassMaterial.needsUpdate = true;
		});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		// this.material.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
		this.controls.update();
	}
}

new Sketch({
	dom: document.getElementById("app"),
});
