import {
	BokehPass,
	CSS2DObject,
	CSS2DRenderer,
	DRACOLoader,
	EffectComposer,
	FXAAShader,
	GLTFLoader,
	LUT3dlLoader,
	LUTPass,
	OrbitControls,
	OutputPass,
	RGBELoader,
	RectAreaLightUniformsLib,
	RenderPass,
	ShaderPass,
	UnrealBloomPass,
} from "three/examples/jsm/Addons.js";
import "../style.css";

import gsap from "gsap";
import {
	ACESFilmicToneMapping,
	EquirectangularReflectionMapping,
	LoadingManager,
	MathUtils,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	PerspectiveCamera,
	Raycaster,
	RectAreaLight,
	SRGBColorSpace,
	Scene,
	Sprite,
	SpriteMaterial,
	TextureLoader,
	Vector2,
	Vector3,
	WebGLRenderer,
} from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

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

		this.loadingManager = new LoadingManager();

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

		this.carProps = {
			Body: "#262626",
			Wheels: "#ffffff",
			Spoiler: "#262626",
			Diffusers: "#262626",
			Brakes: "#A1FF00",
			Glass: "#ffffff",
		};
		this.wheels = [];
		this.materials = [];
		this.diffusers = [];
		this.brakes = [];
		this.glasses = [];

		this.annotations = [
			{
				title: "Body",
				position: new Vector3(-3.5, 6, 6),
				target: new Vector3(0, 1, 0),
			},
			{
				title: "Wheels",
				position: new Vector3(2.6, 0.8, 2.6),
				target: new Vector3(1.05, 0.7, 1.5),
			},
			{
				title: "Glass",
				position: new Vector3(0, 1.1, 2),
				target: new Vector3(0, 0.9, 1),
			},
			{
				title: "Spoiler",
				position: new Vector3(0, 2, -4),
				target: new Vector3(0, 0.9, -2.2),
			},
			{
				title: "Interior",
				position: new Vector3(0, 0.9, -0.1),
				target: new Vector3(0, 0.75, 0.3),
			},
			{
				title: "Brakes",
				position: new Vector3(-2.6, 0.8, 1.3),
				target: new Vector3(-1, 0.35, 1.45),
			},
		];
		this.annotationMarkers = [];
		this.isAnnotationActive = false;
		this.annotationDivs = [];
		this.settingsBtn = document.getElementById("resetBtn");

		this.isPlaying = true;
		this.addMaterials();
		this.addStudio();
		this.addLights();
		this.initComposer();
		this.resize();
		this.render();
		this.setupResize();
		this.addGUI();
		this.addAnnotations();
		this.mouseEvents();
	}

	mouseEvents() {
		this.annotationDivs.forEach((label) => {
			label.addEventListener("click", () => {
				this.settingsBtn.setAttribute("data-show", true);
				const id = label.innerHTML;
				const annotation = this.annotations[id - 1];
				this.gotoAnnotation(annotation);
				Object.keys(this.guis).forEach((gui) => this.guis[gui].hide());
				if (annotation.title !== "Interior") this.guis[annotation.title].show();
			});
		});

		this.settingsBtn.addEventListener("click", () => {
			this.settingsBtn.setAttribute("data-show", false);
			this.gotoAnnotation(this.initialCameraPos);
			Object.keys(this.guis).forEach((gui) => this.guis[gui].hide());
		});
	}

	setupResize() {
		if (this.width < 992) {
			this.initialCameraPos.position.set(3.5, 5, 10);
			this.camera.position.copy(this.initialCameraPos.position);
		}
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
		const pixelRatio = this.renderer.getPixelRatio();
		this.fxaaPass.material.uniforms["resolution"].value.x = 1 / (this.width * pixelRatio);
		this.fxaaPass.material.uniforms["resolution"].value.y = 1 / (this.height * pixelRatio);
		if (this.width < 992) {
			this.initialCameraPos.position.set(3.5, 5, 10);
			this.camera.position.copy(this.initialCameraPos.position);
		} else {
			this.initialCameraPos.position.set(3.5, 2.5, 4.5);
			this.camera.position.copy(this.initialCameraPos.position);
		}
	}

	initComposer() {
		this.bloomParams = {
			threshold: 0,
			strength: 0.2,
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

		this.fxaaPass = new ShaderPass(FXAAShader);
		const pixelRatio = this.renderer.getPixelRatio();
		this.fxaaPass.material.uniforms["resolution"].value.x = 1 / (this.width * pixelRatio);
		this.fxaaPass.material.uniforms["resolution"].value.y = 1 / (this.height * pixelRatio);

		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(renderScene);
		this.composer.addPass(this.bloomPass);
		this.composer.addPass(outputPass);
		this.composer.addPass(this.lutPass);
		this.composer.addPass(this.fxaaPass);

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

		this.spoilerMaterial = new MeshStandardMaterial({
			color: this.carProps.Spoiler,
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
			this.spoilerMaterial,
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

			const spoiler = studio.getObjectByName("Spoiler");
			spoiler.material = this.spoilerMaterial;

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
				studio.getObjectByName("Spyder-wheelbrakeFtL").children[0],
				studio.getObjectByName("Spyder-wheelbrakeFtR").children[0],
				studio.getObjectByName("Spyder-wheelbrakeBkL").children[0],
				studio.getObjectByName("Spyder-wheelbrakeBkR").children[0]
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
		this.bodyGUI = new GUI({ title: "Body" }).hide();
		this.diffusersGUI = new GUI({ title: "Diffusers" }).hide();
		this.wheelsGUI = new GUI({ title: "Wheels" }).hide();
		this.spoilerGUI = new GUI({ title: "Spoiler" }).hide();
		this.brakesGUI = new GUI({ title: "Brakes" }).hide();
		this.glassGUI = new GUI({ title: "Glass" }).hide();

		this.guis = {
			Body: this.bodyGUI,
			Diffusers: this.diffusersGUI,
			Wheels: this.wheelsGUI,
			Spoiler: this.spoilerGUI,
			Brakes: this.brakesGUI,
			Glass: this.glassGUI,
		};

		this.bodyGUI.addColor(this.carProps, "Body").onChange((newColor) => {
			this.bodyMaterial.color.set(newColor);
			this.bodyMaterial.needsUpdate = true;
		});
		this.diffusersGUI.addColor(this.carProps, "Diffusers").onChange((newColor) => {
			this.diffuserMaterial.color.set(newColor);
			this.diffuserMaterial.needsUpdate = true;
		});
		this.wheelsGUI.addColor(this.carProps, "Wheels").onChange((newColor) => {
			this.wheelMaterial.color.set(newColor);
			this.wheelMaterial.needsUpdate = true;
		});
		this.spoilerGUI.addColor(this.carProps, "Spoiler").onChange((newColor) => {
			this.spoilerMaterial.color.set(newColor);
			this.spoilerMaterial.needsUpdate = true;
		});
		this.brakesGUI.addColor(this.carProps, "Brakes").onChange((newColor) => {
			this.brakeMaterial.color.set(newColor);
			this.brakeMaterial.needsUpdate = true;
		});
		this.glassGUI.addColor(this.carProps, "Glass").onChange((newColor) => {
			this.glassMaterial.color.set(newColor);
			this.glassMaterial.needsUpdate = true;
		});
	}

	addAnnotations() {
		const circleTexture = new TextureLoader().load("/circle.png");

		Object.keys(this.annotations).forEach((idx) => {
			const annotationSpriteMaterial = new SpriteMaterial({
				map: circleTexture,
				depthTest: false,
				depthWrite: false,
				sizeAttenuation: false,
			});
			const annotationSprite = new Sprite(annotationSpriteMaterial);
			annotationSprite.scale.set(0.04, 0.04, 0.04);
			annotationSprite.position.copy(this.annotations[idx].target);
			annotationSprite.userData = { ...this.annotations[idx] };
			annotationSprite.renderOrder = 1;
			this.scene.add(annotationSprite);
			this.annotationMarkers.push(annotationSprite);

			const annotationDiv = document.createElement("div");
			annotationDiv.className = "annotationLabel";
			annotationDiv.innerHTML = Number(idx) + 1;
			this.annotationDivs.push(annotationDiv);
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
			duration: 2,
			ease: "power3.inOut",
		});
		gsap.to(this.camera.position, {
			x: annotation.position.x,
			y: annotation.position.y,
			z: annotation.position.z,
			duration: 2,
			ease: "power3.inOut",
		});
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		// this.material.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));
		// this.renderer.render(this.scene, this.camera);
		this.composer.render();
		this.labelRenderer.render(this.scene, this.camera);
		this.controls.update();
	}
}

new Sketch({
	dom: document.getElementById("app"),
});
