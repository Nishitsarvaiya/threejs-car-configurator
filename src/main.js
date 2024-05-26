import { DRACOLoader, GLTFLoader, OrbitControls, RGBELoader } from 'three/examples/jsm/Addons.js';
import '../style.css';

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
} from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { LoadingManager } from 'three';

export default class Sketch {
	constructor(options) {
		this.scene = new Scene();
		// this.scene.background = new Color(0xffffff);
		// this.scene.environment = new RGBELoader().load("/textures/lonely_road_afternoon_puresky_1k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/meadow_2_1k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/thatch_chapel_2k.hdr");
		// this.scene.environment = new RGBELoader().load("/textures/venice_sunset_2k.hdr");
		this.hdri = new RGBELoader().load('/textures/poly_haven_studio_4k.hdr', (data) => {
			this.scene.background = data;
			this.scene.backgroundBlurriness = 0;
			this.scene.backgroundIntensity = 1;
			this.scene.environment = data;
			this.scene.environment.mapping = EquirectangularReflectionMapping;
		});
		// this.scene.fog = new Fog(0xffffff, 10, 15);

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(this.width, this.height);
		// this.renderer.setClearColor(0xffffff, 1);
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
		this.controls.maxPolarAngle = MathUtils.degToRad(85);
		this.controls.enableDamping = true;

		this.loadingManager = new LoadingManager();

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
			Body: '#1d1d1d',
			Wheels: '#EAEBED',
			Wing: '#EAEBED',
		};
		this.wheels = [];
		this.materials = [];

		this.isPlaying = true;
		this.addFloor();
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
		window.addEventListener('mousemove', (e) => {
			this.mouse.prevX = this.mouse.x;
			this.mouse.prevY = this.mouse.y;
			this.mouse.x = e.clientX - this.width / 2;
			this.mouse.y = this.height / 2 - e.clientY;
			this.mouse.vX = this.mouse.x - this.mouse.prevX;
			this.mouse.vY = this.mouse.y - this.mouse.prevY;
		});
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
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

	addFloor() {
		const geometry = new PlaneGeometry(100, 100, 1, 1);
		const material = new MeshPhysicalMaterial({ color: '#ffffff', side: DoubleSide });
		const plane = new Mesh(geometry, material);
		plane.receiveShadow = true;
		plane.rotation.x = -Math.PI / 2;

		const textureLoader = new TextureLoader(this.loadingManager);

		const textures = [];

		textures.push(
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_COL_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_AO_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_BUMP_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_DISP_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_GLOSS_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_NRM_1K.jpg'),
			textureLoader.load('/textures/WoodFlooringAshSuperWhite001/WoodFlooringAshSuperWhite001_REFL_1K.jpg')
		);

		this.loadingManager.onLoad = () => {
			textures.forEach((tex) => {
				tex.wrapT = RepeatWrapping;
				tex.wrapS = RepeatWrapping;
				tex.repeat.set(15, 15);
			});
			material.map = textures[0];
			material.aoMap = textures[1];
			material.bumpMap = textures[2];
			material.displacementMap = textures[3];
			material.reflectivity = 0;
			material.normalMap = textures[5];
			material.clearcoat = 1;
			material.roughnessMap = textures[4];
			material.clearcoatMap = textures[6];
			material.needsUpdate = true;
			plane.position.set(0, -0.685, 0);
			this.scene.add(plane);
		};
	}

	addObjects() {
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

		const loader = new GLTFLoader();
		loader.setDRACOLoader(dracoLoader);

		// new TextureLoader().load('/textures/floor/TilesCeramicSquareLarge001_COL_1K.jpg', (texture) => {
		// 	console.log(texture);
		// 	texture.wrapS = RepeatWrapping;
		// 	texture.wrapT = RepeatWrapping;
		// 	texture.repeat.set(20, 20);
		// 	plane.material.map = texture;
		// 	this.scene.add(plane);
		// });
		// this.scene.add(new AxesHelper(10));

		loader.load('/models/spyder/spyder.gltf', (gltf) => {
			gltf.scene.traverse((obj) => {
				if (obj.type === 'Mesh') {
					obj.castShadow = true;
					obj.receiveShadow = true;
				}
			});
			const car = gltf.scene.children[0];
			car.position.set(0, 0, -1.2);
			// this.carBody = car.getObjectByName("GT500-body");
			// this.carBody.material = this.bodyMaterial;

			// this.wheels.push(
			// 	car.getObjectByName("GT500-wheelFtL"),
			// 	car.getObjectByName("GT500-wheelFtR"),
			// 	car.getObjectByName("GT500-wheelBkL"),
			// 	car.getObjectByName("GT500-wheelBkR")
			// );
			// this.wheels.forEach((wheel) => (wheel.material = this.wheelMaterial));

			// this.wing = car.getObjectByName("GT500Wing_glossblack_0");
			// this.wing.material = this.wingMaterial;

			this.scene.add(car);
		});
	}

	addGUI() {
		this.gui.addColor(this.carProps, 'Body').onChange((newColor) => this.bodyMaterial.color.set(newColor));
		this.gui.addColor(this.carProps, 'Wheels').onChange((newColor) => this.wheelMaterial.color.set(newColor));
		this.gui.addColor(this.carProps, 'Wing').onChange((newColor) => this.wingMaterial.color.set(newColor));
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
	dom: document.getElementById('app'),
});
