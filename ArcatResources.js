import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { PMREMGenerator } from "three";

const gltf_loader = new GLTFLoader();
const DRACOLoaderloader = new DRACOLoader();
DRACOLoaderloader.setDecoderPath("three/examples/jsm/libs/draco/");
gltf_loader.setDRACOLoader(DRACOLoaderloader);
const texture_loader = new THREE.TextureLoader();
const rgbe_loader = new RGBELoader();

THREE.Cache.enabled = true;

// Esto es una clase que se instancia para guardarse
// en el mapa llamado items de ResLoader.
class ArcatRes {
  
  constructor(
    is_ready, // bandera para establecer si se cargo exitosamente
    new_object = undefined, // objeto de la escena de THREE que se guarda para esconder
    materialOverrides = new Array[undefined]() // materiales que se le reemplaza, saltea los indefinidos
  ) {
    this.ready = is_ready;
    this.sceneObject = new_object;
    this.materialOverrides = materialOverrides;
  }
}

// Esta clase tiene funciones estaticas que sirven para
// crear y usar los materiales.
// Arrancó como una clase instanciable pero cambió mucho.
export class ArcatMaterial {
  constructor() {
  }

  // Ésta función toma el tipo y los parámetros
  // que vendrían del archivo .mat.json hermano
  // del modelo glb 
  // (mismo nombre y ubicación, diferente extensión)
  // y devuelve un objeto de material.
  // Tiene un array de tipos de material de THREE
  // y un array de funciones que construyen
  static Parse(type, parameters = {}) {
    // esta lista vino del codigo fuente de three. La converti en un mapa clave valor bien lindito
    const material_constructors = {
      shadowmaterial: THREE.ShadowMaterial,
      spritematerial: THREE.SpriteMaterial,
      rawshadermaterial: THREE.RawShaderMaterial,
      shadermaterial: THREE.ShaderMaterial,
      pointsmaterial: THREE.PointsMaterial,
      meshphysicalmaterial: THREE.MeshPhysicalMaterial,
      meshstandardmaterial: THREE.MeshStandardMaterial,
      meshphongmaterial: THREE.MeshPhongMaterial,
      meshtoonmaterial: THREE.MeshToonMaterial,
      meshnormalmaterial: THREE.MeshNormalMaterial,
      meshlambertmaterial: THREE.MeshLambertMaterial,
      meshdepthmaterial: THREE.MeshDepthMaterial,
      meshdistancematerial: THREE.MeshDistanceMaterial,
      meshbasicmaterial: THREE.MeshBasicMaterial,
      meshmatcapmaterial: THREE.MeshMatcapMaterial,
      linedashedmaterial: THREE.LineDashedMaterial,
      linebasicmaterial: THREE.LineBasicMaterial,
    };

    const custom_constructors = {
      arcatglass: this.FromGlass,
      arcatliquidmatcap: this.FromLiquidMatcap,
    };

    const MaterialClass = material_constructors[type.toLowerCase()];

    let new_material;
    if (MaterialClass) {
      // If constructor found, return a new instance of the material
      new_material = new MaterialClass(parameters);
    } else {
      // If constructor not found, return a default material (or handle the error in your preferred way)

      const targetFunction = custom_constructors[type.toLowerCase()];
      if (targetFunction) {
        new_material = targetFunction.call();
        new_material.setValues(parameters);
      } else {
        console.error("Nor THREE or Arcat Material type recognized: ", type);
        new_material = new THREE.MeshBasicMaterial();
      }
    }

    return new_material;
  }

  // Crea un material de matcap con la textura de liquidos
  static FromLiquidMatcap() {
    let tex_matcap = texture_loader.load(
      "models/matcap_liquid_50p.png"
    );
    tex_matcap.colorSpace = THREE.SRGBColorSpace;
    /*return new THREE.MeshMatcapMaterial({
      matcap: tex_matcap,
    });*/

    let refractive_env = rgbe_loader.load("models/refraction_ambient.hdr", (texture_env) => {
      texture_env.mapping = THREE.EquirectangularReflectionMapping; // no hay diff con reflection pero qsy
      //texture_env.colorSpace = THREE.SRGBColorSpace;
    });

    let retmat = new THREE.MeshStandardMaterial({
      color: 16777215,
      //map: refractive_env,
      side: THREE.BackSide,
      roughness: .05,
      metalness: 1,
      envMap: refractive_env,
      envMapIntensity: 1.67,
    });
    return retmat;
  }

  // Crea un material de vidrio para los vasos
  static FromGlass() {
    // esto lo tengo asi comentado para probar la otra funcion
    /*return this.Parse("MeshPhysicalMaterial", {
      "color": 16777215,
      "roughness": 0,
      "metalness": 0,
      "sheen": 0,
      "sheenColor": 0,
      "sheenRoughness": 1,
      "emissive": 0,
      "specularIntensity": 1,
      "specularColor": 16777215,
      "clearcoat": 0,
      "clearcoatRoughness": 0,
      "iridescence": 0,
      "iridescenceIOR": 1.3,
      "iridescenceThicknessRange": [100,400],
      "anisotropy": 0,
      "anisotropyRotation": 0,
      "reflectivity": 1,
      "transmission": 1,
      "thickness": 0,
      "attenuationColor": 16777215,
      "vertexColors": true,
      "transparent": true,
      "blendColor": 0,
      "depthWrite": false
    })*/

    return new THREE.MeshPhysicalMaterial({
      color: "rgb(255, 255, 255)",
      roughness: 0,
      metalness: 0,
      sheen: 0,
      sheenColor: 0,
      sheenRoughness: 1,
      emissive: 0,
      specularIntensity: 1,
      specularColor: 16777215,
      clearcoat: 1,
      clearcoatRoughness: .2,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      anisotropy: 0,
      anisotropyRotation: 0,
      reflectivity: 1,
      transmission: 1,
      thickness: 0,
      attenuationColor: 16777215,
      vertexColors: true,
      transparent: true,
      blendColor: 0,
      depthWrite: false,
    });
  }

  // Toma una escena y reemplaza los materiales 
  // de las mallas por los de una lista.
  // Si es indefinido lo ignora (para no reemplazar).
  static OverrideFromScene(scene, material_array = array[0]) {
    let current_slot = 0;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (material_array[current_slot]) {
          child.material = material_array[current_slot];
        }
        current_slot++;
      }
    });
  }
}

// De esta clase se hace una instancia en
// index.html, o en su script, simplest.js
// Tiene una lista de modelos cargados indexada
// con la url
export class ResLoader {
  constructor(newTargetScene) {
    this.items = new Map(); // Lista de modelos
    this.targetScene = newTargetScene; // escena de THREE en la que se ponen los modelos
    this.loadingBar = this.InitLoadingBar(); // se inicializa la barra de carga
  }

  // Se supone que esta sea la unica funcion que se llame
  // desde el script principal. Debería seguir así, simple.
  LoadModel(srcurl) {
    // ej "data/models/vaso0/cerveza_de_exportacion.glb"

    // 1 - esconde el modelo que estaba antes.
    this.RemoveModel();

    // 2a - Si existe y está listo lo pone visible.
    if (this.items.has(srcurl)) {
      if (this.items.get(srcurl).ready) {
        this.items.get(srcurl).sceneObject.visible = true;
      }
    } else {
      // 2b - Si no existe, carga el archivo...
      // 2b.1 - Prepara la url del archivo de materiales.
      const json_path = srcurl
        .substring(0, srcurl.lastIndexOf("."))
        .concat(".mat.json");

      // 2b.2 - lee el .mat.json ... 
      let material_array = Array.apply(0);

      fetch(json_path)
        .then((response) => response.json())
        .then((data) => {
          // por cada elemento del array "material overrides" en el json
          // si hay un algo valido toma el tipo y valor y crea el objeto de material
          // si no, pasa indefinido.
          // De estos elementos se crea el nuevo array de materiales.
          material_array = data.material_overrides.map((mat_data) => {
            return mat_data
              ? ArcatMaterial.Parse(mat_data.type, mat_data.values)
              : undefined;
          });

          // Ahi se agrega al mapa con la url como clave,
          // pero se marca como no terminado y la escena es indefinida porque no exite...
          this.items.set(srcurl, new ArcatRes(false, undefined, material_array));
          this.LoadGLB(srcurl); // sigue en esta funcion, que es la que realmente carga el modelo.
        })
        .catch((error) => console.error("Error buscando Material JSON: ", error)); 
    }
  }

  RemoveModel() {
    this.items.forEach((element) => {
      if (element.ready) element.sceneObject.visible = false;
    });
  }

  // llamado al terminarse de cargar el modelo, 
  OnModelLoaded(gltf, srcurl) {
    console.log("fully loaded: " + srcurl);
    this.loadingBar.visible = false;

    // reemplaza los materiales por los guardados en el mapa
    // despues agrega a la escena y por ultimo actualiza el mapa de modelos (items)
    ArcatMaterial.OverrideFromScene(
      gltf.scene,
      this.items.get(srcurl).materialOverrides
    );
    this.targetScene.add(gltf.scene);

    this.items.set(
      srcurl,
      new ArcatRes(true, gltf.scene, this.items.get(srcurl).materialOverrides)
    );
  }

  // se llama cuando progresa la carga del modelo. La verdad no sirve de mucho la barra de carga pero bueno.
  OnLoadingProgress(xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% ");
    this.loadingBar.visible = true;
    this.loadingBar.scale.y = xhr.loaded / xhr.total;
    this.loadingBar.position.y = xhr.loaded / xhr.total / 2.0;
  }

  // Carga el glb, llama a OnModelLoaded al terminar
  // tambien llama a OnLoadingProgress mientras carga, 
  // para la barra/cubo de carga verde.
  LoadGLB(srcurl) {
    console.log("testing : " + srcurl);
    gltf_loader.load(
      // resource URL
      srcurl,

      // called when the resource is loaded
      (gltf) => {
        this.OnModelLoaded(gltf, srcurl);
      },

      // called while loading is progressing
      this.OnLoadingProgress.bind(this),

      // called when loading has errors
      function (error) {
        console.log("An error happened loading " + error);
      }
    );
  }

  // Se inicializa la barra de carga
  InitLoadingBar() {
    if (!this.loadingBar) {
      const geometry = new THREE.IcosahedronGeometry( 0.5, 2 ); ;
      const tex_matcap = texture_loader.load(
        "models/matcap_marron.png"
      );
      tex_matcap.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshMatcapMaterial({
        matcap: tex_matcap,
        color: "rgb(0.5,0.5,0.5)"
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.0;
      //mesh.rotation.x = Math.PI * 0.5;
      this.targetScene.add(mesh);
      console.log("reached loading bar init " + mesh.isMesh);
      mesh.visible = false;

      //setTimeout(() => {this.loadingBar.rotation.y += (Math.PI * 2 / 66)}, 33);

      return mesh;
    }
  }

}
