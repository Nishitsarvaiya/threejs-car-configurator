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
		this.camera = new PerspectiveCamera(50, aspect, 0.1, 100);
		// var frustumSize = this.height;
		// this.camera = new OrthographicCamera(
		// 	(frustumSize * aspect) / -2,
		// 	(frustumSize * aspect) / 2,
		// 	frustumSize / 2,
		// 	frustumSize / -2,
		// 	-1000,
		// 	1000
		// );
		this.camera.position.set(0, 3, 6);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		// this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.enableDamping = true;

		this.time = 0;
		this.mouse = {
			x: 0,
			y: 0,
			prevX: 0,
			prevY: 0,
			vX: 0,
			vY: 0,
		};
		this.wheels = [];
		this.materials = [];

		this.isPlaying = true;
		this.addMaterials();
		this.addObjects();
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
			color: 0xff0000,
			metalness: 1.0,
			roughness: 0.1,
			clearcoat: 1.0,
			clearcoatRoughness: 0.03,
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

		this.scene.add(new AxesHelper(10));

		loader.load("/models/gt500/gt500.gltf", (gltf) => {
			const car = gltf.scene.children[0];
			car.position.set(0, 0, -1.2);
			console.log(car);
			this.scene.add(car);
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
