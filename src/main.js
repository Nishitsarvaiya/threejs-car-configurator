import { DRACOLoader, GLTFLoader, OrbitControls, RGBELoader } from "three/examples/jsm/Addons.js";
import "../style.css";

import {
	AmbientLight,
	AxesHelper,
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
	OrthographicCamera,
	PerspectiveCamera,
	PlaneGeometry,
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

export default class Sketch {
	constructor(options) {
		this.scene = new Scene();
		// this.scene.background = new Color(0xffffff);
		this.scene.environment = new RGBELoader().load("/textures/lonely_road_afternoon_puresky_1k.hdr");
		this.scene.environment.mapping = EquirectangularReflectionMapping;
		// this.scene.fog = new Fog(0xffffff, 10, 15);

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xffffff, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputColorSpace = SRGBColorSpace;

		this.container.appendChild(this.renderer.domElement);

		const aspect = this.width / this.height;
		this.camera = new PerspectiveCamera(40, aspect, 0.1, 100);
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
		// this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.enableDamping = true;

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
			Body: "#1d1d1d",
			Wheels: "#EAEBED",
			Wing: "#EAEBED",
		};
		this.wheels = [];
		this.materials = [];

		this.isPlaying = true;
		this.addMaterials();
		this.addObjects();
		this.addGUI();
		// this.addLights();
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
		const lights = [];
		lights[0] = new AmbientLight(0xffffff, 10);
		lights[1] = new SpotLight(0xffffff, 1000, 20, Math.PI / 8, 0, 1.2);
		lights[2] = new SpotLight(0xffffff, 1000, 20, Math.PI / 8, 0, 1.2);

		lights[1].position.set(0, 8, 10);
		lights[2].position.set(0, 8, -10);

		this.scene.add(lights[0]);
		this.scene.add(lights[1]);
		this.scene.add(lights[2]);
	}

	addMaterials() {
		this.bodyMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Body,
			metalness: 1.0,
			roughness: 0.1,
			clearcoat: 1.0,
			clearcoatRoughness: 0.1,
		});

		this.wheelMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Wheels,
			metalness: 1.0,
			roughness: 0,
			transmission: 1,
			clearcoat: 1.0,
			clearcoatRoughness: 0.1,
		});

		this.wingMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Wing,
			metalness: 1.0,
			roughness: 0.1,
			clearcoat: 1.0,
			clearcoatRoughness: 0.1,
		});
	}

	addObjects() {
		// const plane = new Mesh(new PlaneGeometry(20, 20, 1, 1), new MeshBasicMaterial({ color: "#343330" }));
		// plane.rotation.x = -Math.PI / 2;
		// this.scene.add(plane);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

		const loader = new GLTFLoader();
		loader.setDRACOLoader(dracoLoader);

		// this.scene.add(new AxesHelper(10));

		loader.load("/models/gt500/gt500.gltf", (gltf) => {
			gltf.scene.traverse((obj) => {
				if (obj.type === "Mesh") {
					obj.castShadow = true;
					obj.receiveShadow = true;
				}
			});
			const car = gltf.scene.children[0];
			car.position.set(0, 0, -1.2);
			this.carBody = car.getObjectByName("GT500-body");
			this.carBody.material = this.bodyMaterial;

			this.wheels.push(
				car.getObjectByName("GT500-wheelFtL"),
				car.getObjectByName("GT500-wheelFtR"),
				car.getObjectByName("GT500-wheelBkL"),
				car.getObjectByName("GT500-wheelBkR")
			);
			this.wheels.forEach((wheel) => (wheel.material = this.wheelMaterial));

			this.wing = car.getObjectByName("GT500Wing_glossblack_0");
			this.wing.material = this.wingMaterial;

			this.scene.add(car);
		});
	}

	addGUI() {
		this.gui.addColor(this.carProps, "Body").onChange((newColor) => this.bodyMaterial.color.set(newColor));
		this.gui.addColor(this.carProps, "Wheels").onChange((newColor) => this.wheelMaterial.color.set(newColor));
		this.gui.addColor(this.carProps, "Wing").onChange((newColor) => this.wingMaterial.color.set(newColor));
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
