import {
	DRACOLoader,
	EffectComposer,
	GLTFLoader,
	OrbitControls,
	OutputPass,
	RGBELoader,
	RectAreaLightHelper,
	RenderPass,
	RectAreaLightUniformsLib,
	UnrealBloomPass,
	LUT3dlLoader,
	LUTPass,
	CSS2DObject,
	CSS2DRenderer,
} from "three/examples/jsm/Addons.js";
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
	Sprite,
	SpriteMaterial,
	TextureLoader,
	Vector2,
	Vector3,
	Vector4,
	WebGLRenderer,
} from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { LoadingManager } from "three";
import gsap from "gsap";

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
		this.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xffffff, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = ACESFilmicToneMapping;

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
		this.initialCameraPos = { position: new Vector3(3.5, 2.5, 4.5), target: new Vector3(0, 0, 0) };
		this.camera.position.copy(this.initialCameraPos.position);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.maxPolarAngle = MathUtils.degToRad(89);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.1;
		this.controls.enableZoom = false;

		this.labelRenderer = new CSS2DRenderer();
		this.labelRenderer.setSize(this.width, this.height);
		this.labelCanvas = this.labelRenderer.domElement;
		this.labelRenderer.domElement.id = "annotationsCanvas";
		this.container.appendChild(this.labelRenderer.domElement);

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath("jsm/libs/draco/gltf/");

		this.gltfLoader = new GLTFLoader();
		this.gltfLoader.setDRACOLoader(dracoLoader);

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
			Brakes: "#A1FF00",
			Glass: "#ffffff",
		};
		this.wheels = [];
		this.materials = [];
		this.doors = [];
		this.bumpers = [];
		this.diffusers = [];
		this.brakes = [];
		this.glasses = [];
		this.mirrors = [];
		this.settingsBtn = document.getElementById("settingsBtn");

		this.annotations = [
			{ title: "Body", position: new Vector3(-3.5, 6, 6), target: new Vector3(0, 1, 0) },
			{ title: "Wheels", position: new Vector3(2.6, 0.8, 2.6), target: new Vector3(1.05, 0.7, 1.5) },
			{ title: "Windshield", position: new Vector3(0, 1.1, 2), target: new Vector3(0, 0.9, 1) },
			{ title: "Spoiler", position: new Vector3(0, 2, -4), target: new Vector3(0, 0.9, -2.2) },
			{ title: "Interior", position: new Vector3(0, 0.9, -0.1), target: new Vector3(0, 0.75, 0.3) },
		];
		this.annotationMarkers = [];
		this.isAnnotationActive = false;
		this.annotationsPanel = document.getElementById("annotationsPanel");

		this.isPlaying = true;
		this.addMaterials();
		this.addStudio();
		this.addLights();
		this.initComposer();
		this.resize();
		this.render();
		this.setupResize();
		this.addAnnotations();
		// this.addGUI();

		this.mouseEvents();
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

		this.settingsBtn.addEventListener("click", () => {
			const isAnnotationsVisible = this.settingsBtn.getAttribute("data-view") === "close";
			if (isAnnotationsVisible) {
				this.hideAnnotations();
			} else {
				this.showAnnotations();
			}
		});

		// this.container.addEventListener("click", () => {
		// 	gsap.to(this.controls.target, { x: -0.4, y: 0, z: 0, duration: 1.6, ease: "power3.out" });
		// 	gsap.to(this.camera.position, { x: 2.5, y: 0.5, z: 2.5, duration: 1.6, ease: "power3.out" });
		// });
	}

	setupResize() {
		window.addEventListener("resize", this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.composer.setSize(this.width, this.height);
		this.labelRenderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	initComposer() {
		this.bloomParams = {
			threshold: 0,
			strength: 0.286,
			radius: 0,
			exposure: 1,
		};
		const renderScene = new RenderPass(this.scene, this.camera);

		this.bloomPass = new UnrealBloomPass(new Vector2(this.width, this.height), 0, 0.2, 0);
		this.bloomPass.threshold = this.bloomParams.threshold;
		this.bloomPass.strength = this.bloomParams.strength;
		this.bloomPass.radius = this.bloomParams.radius;

		const outputPass = new OutputPass();
		this.lutPass = new LUTPass();

		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(renderScene);
		this.composer.addPass(this.bloomPass);
		this.composer.addPass(outputPass);
		this.composer.addPass(this.lutPass);

		new LUT3dlLoader().load("/luts/Presetpro-Cinematic.3dl", (lut) => {
			this.lut = lut;
			this.lutPass.lut = this.lut.texture3D;
		});
	}

	addLights() {
		RectAreaLightUniformsLib.init();
		let light = new RectAreaLight("#ffffff", 2, 4, 8);
		light.rotation.set(Math.PI / 2, Math.PI, 0);
		light.position.set(0, 3, 0);
		this.scene.add(light);
	}

	addMaterials() {
		this.bodyMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Body,
			metalness: 0.8,
			roughness: 0.3,
			clearcoat: 1,
			clearcoatRoughness: 0.1,
		});

		this.wheelMaterial = new MeshPhysicalMaterial({
			color: this.carProps.Wheels,
			metalness: 1,
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
			const carBody = studio.getObjectByName("Body").children[0];
			carBody.material = this.bodyMaterial;

			const wing = studio.getObjectByName("Spoiler");
			wing.material = this.wingMaterial;

			const diffusers = studio.getObjectByName("Diffusers");
			diffusers.material = this.diffuserMaterial;

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

			const glasses = studio.getObjectByName("Glasses");
			glasses.material = this.glassMaterial;

			this.scene.add(studio);
		});
	}

	addGUI() {
		this.gui = new GUI();
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

		// const controlsFolder = this.gui.addFolder("Controls");
		// controlsFolder.add(this.controls.target, "x", -10, 10, 0.5);
		// controlsFolder.add(this.controls.target, "y", -10, 10, 0.5);
		// controlsFolder.add(this.controls.target, "z", -10, 10, 0.5);

		// const cameraFolder = this.gui.addFolder("Camera");
		// cameraFolder.add(this.camera.position, "x", -10, 10, 0.5);
		// cameraFolder.add(this.camera.position, "y", -10, 10, 0.5);
		// cameraFolder.add(this.camera.position, "z", -10, 10, 0.5);
	}

	addAnnotations() {
		const circleTexture = new TextureLoader().load("/circle.png");
		const ul = document.createElement("ul");
		const ulElem = this.annotationsPanel.appendChild(ul);

		Object.keys(this.annotations).forEach((idx) => {
			const li = document.createElement("li");
			const liElem = ulElem.appendChild(li);
			const button = document.createElement("button");
			button.innerHTML = this.annotations[idx].title;
			button.className = "annotationButton";
			button.addEventListener("click", () => {
				this.gotoAnnotation(this.annotations[idx]);
			});
			liElem.appendChild(button);

			const annotationSpriteMaterial = new SpriteMaterial({
				map: circleTexture,
				depthTest: false,
				depthWrite: false,
				sizeAttenuation: false,
			});
			const annotationSprite = new Sprite(annotationSpriteMaterial);
			annotationSprite.scale.set(0.02, 0.02, 0.02);
			annotationSprite.position.copy(this.annotations[idx].target);
			annotationSprite.userData.id = idx;
			annotationSprite.visible = false;
			annotationSprite.renderOrder = 1;
			this.scene.add(annotationSprite);
			this.annotationMarkers.push(annotationSprite);

			const annotationDiv = document.createElement("div");
			annotationDiv.className = "annotationLabel";
			annotationDiv.innerHTML = Number(idx) + 1;
			const annotationLabel = new CSS2DObject(annotationDiv);
			annotationLabel.position.copy(this.annotations[idx].target);
			this.scene.add(annotationLabel);
		});
	}

	gotoAnnotation(annotation) {
		gsap.to(this.controls.target, {
			x: annotation.target.x,
			y: annotation.target.y,
			z: annotation.target.z,
			duration: 3,
			ease: "power3.inOut",
		});
		gsap.to(this.camera.position, {
			x: annotation.position.x,
			y: annotation.position.y,
			z: annotation.position.z,
			duration: 3,
			ease: "power3.inOut",
		});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		// this.material.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
		// if (this.lut) this.lutPass.lut = this.lut.texture3D;
		// this.composer.render();
		this.labelRenderer.render(this.scene, this.camera);
		this.controls.update();
	}

	showAnnotations() {
		this.settingsBtn.setAttribute("data-view", "close");
		this.annotationsPanel.style.display = "block";
		this.annotationMarkers.forEach((marker) => (marker.visible = true));
		this.labelCanvas.style.display = "block";
	}

	hideAnnotations() {
		this.settingsBtn.setAttribute("data-view", "settings");
		this.annotationsPanel.style.display = "none";
		this.labelCanvas.style.display = "none";
		this.annotationMarkers.forEach((marker) => (marker.visible = false));
		gsap.to(this.controls.target, {
			x: this.initialCameraPos.target.x,
			y: this.initialCameraPos.target.y,
			z: this.initialCameraPos.target.z,
			duration: 3,
			ease: "power3.inOut",
		});
		gsap.to(this.camera.position, {
			x: this.initialCameraPos.position.x,
			y: this.initialCameraPos.position.y,
			z: this.initialCameraPos.position.z,
			duration: 3,
			ease: "power3.inOut",
		});
	}
}

new Sketch({
	dom: document.getElementById("app"),
});
