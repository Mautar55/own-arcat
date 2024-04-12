//////////////////////////////////////////////////////////////////////////////////
//		Init
//////////////////////////////////////////////////////////////////////////////////

////// LINKS RELEVANTES
/*


https://stackoverflow.com/questions/67641811/how-to-use-three-js-and-threex-and-ar-js-cdn-in-my-react-component
https://threejs.org/docs/#manual/en/introduction/Installation
https://ar-js-org.github.io/AR.js-Docs/#import-the-library
https://github.com/AR-js-org/AR.js
https://github.com/AR-js-org/AR.js/issues/234

///////// este me salvo las papas con el import
https://github.com/kalwalt/react-AR-experiments/tree/master/react-threex-example

*/

import {
  ArToolkitProfile,
  ArToolkitSource,
  ArToolkitContext,
  ArMarkerControls,
} from "@ar-js-org/ar.js/three.js/build/ar-threex.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

import { ResLoader /*, ArcatMaterial*/ } from "./ArcatResources";

ArToolkitContext.baseURL = "./";

const loader = new GLTFLoader();
const DRACOLoaderloader = new DRACOLoader();
DRACOLoaderloader.setDecoderPath("three/examples/jsm/libs/draco/");
loader.setDRACOLoader(DRACOLoaderloader);
const rgbe_loader = new RGBELoader();

THREE.Cache.enabled = true;

const some_response = await fetch("/data/BusinessParameters.json");
const BusinessParameters = await some_response.json();

// init renderer
var renderer = new THREE.WebGLRenderer({
  antialias: true,
  //alpha: true, // no hace falta activar si se usa el fondo de three
  depth: true,
  precision: "highp",
  toneMapping: THREE.AgXToneMapping,
  toneMappingExposure: 1,
  premultipliedAlpha: false
});
renderer.localClippingEnabled = true;
//renderer.setClearColor(new THREE.Color("black"), 0); // esto se pone si se usa el fondo transparente, pero ahora la textura va en three

const resolution_scaling = 1.0;

console.log("device pix ratio " + window.devicePixelRatio + " screen width " + window.screen.width);

const wsw = (window.screen.width * window.devicePixelRatio) * resolution_scaling;
const wsh = (window.screen.height * window.devicePixelRatio) * resolution_scaling;

renderer.setSize(wsw, wsh);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0px";
renderer.domElement.style.left = "0px";
document.body.appendChild(renderer.domElement);

// array of functions for the rendering loop
var onRenderFcts = [];
var arToolkitContext, arMarkerControls;

// init scene and camera
var scene = new THREE.Scene();
var arcat_loader = new ResLoader(scene);

/////////////////////////////////////////////////////////////////////////////////
//		Initialize a basic camera
/////////////////////////////////////////////////////////////////////////////////

// Create a camera
var camera = new THREE.Camera();
scene.add(camera);

/////////////////////////////////////////////////////////////////////////////////
/// Loading HDRI
/////////////////////////////////////////////////////////////////////////////////

rgbe_loader.load("/models/this_ambient.hdr", (texture_env) => {
  texture_env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture_env;
});

/////////////////////////////////////////////////////////////////////////////////
// CREACION DE BOTONES Y CARGA DE MODELOS
// La idea en general es tocar solo esta parte para cargar los modelos y relacionar la UI.
// El resto medio está atado con cinta y tiene código comentado para pruebas.
// Me resta explicar algunas configuraciones sobre lo que se detecta
// para el rastreo. Pero son solo propiedades que se establecen.
/////////////////////////////////////////////////////////////////////////////////
// slots vaso, liquido, espuma

/* De referencia, asi es como se enlaza un boton a la carga de un modelo en especifico. EL boton Cargar1 ya no existe
document.getElementById("butCargar1").addEventListener("click", () => {
  arcat_loader.LoadModel("models/cerveza_de_exportacion.glb");
}); */

const hslider = document.getElementById("hbox_slider");
const product_name = document.getElementById("product_name");
const product_description = document.getElementById("product_description");

BusinessParameters.products.forEach((element) => {
  const elem_a = document.createElement("a");
  elem_a.href = "#";
  const elem_i = document.createElement("img");
  elem_i.src = element.thumbnailImage;
  elem_a.appendChild(elem_i);

  elem_a.addEventListener("click", () => {
    arcat_loader.LoadModel(element.model_url);
    product_name.innerText = element.label;
    product_description.innerText = element.description;
  });

  hslider.appendChild(elem_a);
});

////////////////////////////////////////////////////////////////////////////////
//          handle arToolkitSource
////////////////////////////////////////////////////////////////////////////////

var arToolkitSource = new ArToolkitSource({
  // to read from the webcam
  sourceType: "webcam",

  // 854 x 480 es 16:9
  sourceWidth: (window.innerWidth > window.innerHeight) ? 640 : 480,
  sourceHeight: (window.innerWidth > window.innerHeight) ? 480 : 640,

  
  
  displayWidth: window.innerWidth,
  displayHeight: window.innerHeight,

  // // to read from an image
  // sourceType : 'image',
  // sourceUrl : ArToolkitContext.baseURL + '../data/images/img.jpg',

  // to read from a video
  // sourceType : 'video',
  // sourceUrl : ArToolkitContext.baseURL + '../data/videos/headtracking.mp4',
});

arToolkitSource.init(function onReady() {
  arToolkitSource.domElement.willReadFrequently = true;
  arToolkitSource.domElement.addEventListener("canplay", () => {
    console.log("canplay " + arToolkitSource.domElement.id + 
      " actual source dimensions "+
      arToolkitSource.domElement.videoWidth + " " +
      arToolkitSource.domElement.videoHeight
    );

    // esto se llama cuando el video está preparado y se reproduce. Acá se setea como fondo de THREE
    const gltexturevideo = new THREE.VideoTexture( arToolkitSource.domElement );
    gltexturevideo.colorSpace = THREE.SRGBColorSpace;
    scene.background = gltexturevideo;
    scene.backgroundIntensity = 1;

    initARContext();
  });
  window.arToolkitSource = arToolkitSource;
  setTimeout(() => {
    onResize();
  }, 100);
});

// handle resize
window.addEventListener("resize", function () {
  onResize();
});

function onResize() {
  arToolkitSource.onResizeElement();

  // esta funcion em altera la relacion de aspecto
  // ver si el px en styles es lo mismo que el absoluto como parte del canvas
  arToolkitSource.copyElementSizeTo(renderer.domElement);
  

  if (window.arToolkitContext) {
    if (window.arToolkitContext.arController !== null) {
      arToolkitSource.copyElementSizeTo(window.arToolkitContext.arController.canvas);
    }
  }
}
////////////////////////////////////////////////////////////////////////////////
//          initialize arToolkitContext
////////////////////////////////////////////////////////////////////////////////

function initARContext() {
  // create atToolkitContext
  arToolkitContext = new ArToolkitContext({
    cameraParametersUrl: ArToolkitContext.baseURL + "/data/camera_para.dat",
    detectionMode: BusinessParameters.detectionMode,
    matrixCodeType: BusinessParameters.matrixCodeType,
    labelingMode: BusinessParameters.labelingMode,
  });

  // initialize it
  arToolkitContext.init(() => {
    // copy projection matrix to camera
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());

    arToolkitContext.arController.orientation = getSourceOrientation();
    arToolkitContext.arController.options.orientation = getSourceOrientation();

    // no tiran error pero no hacen nada
    //arToolkitContext.arController.setProjectionNearPlane(0.01);
    //arToolkitContext.arController.setProjectionNearPlane(1);

    window.arToolkitContext = arToolkitContext;
  });

  // MARKER
  arMarkerControls = new ArMarkerControls(arToolkitContext, camera, {
    type: BusinessParameters.marker_type,
    patternUrl: "/data/pattern-marker.patt",
    barcodeValue: BusinessParameters.barcodeValue,
    patternRatio: 0.5,
    // patternUrl : ArToolkitContext.baseURL + '../data/data/patt.kanji',

    changeMatrixMode: "cameraTransformMatrix",
  });

  scene.visible = false;
  window.arMarkerControls = arMarkerControls;
}

function getSourceOrientation() {
  if (!arToolkitSource) {
    return null;
  }

  console.log(
    "actual source dimensions " + 
    arToolkitSource.domElement.videoWidth +" "+
    arToolkitSource.domElement.videoHeight
  );

  let orientation;
  if (
    arToolkitSource.domElement.videoWidth >
    arToolkitSource.domElement.videoHeight
  ) {
    orientation = "landscape";
  } else {
    orientation = "portrait";
  }
  return orientation;
}

// update artoolkit on every frame
onRenderFcts.push(function () {
  if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
    return;
  }

  arToolkitContext.update(arToolkitSource.domElement);

  // el interno arController tiene que haber sido inicializado para traer la matriz de proyeccion
  if (arToolkitContext.arController) {
    // tengo que modificar desde aca los parametros seteados aca
    // https://github.com/AR-js-org/jsartoolkit5/blob/244b2b23286403e78fa24805b34509dc5a88052f/js/artoolkit.api.js#L1314
    // no se si sea posible...
    // eso es una funcion expuesta?? no es... https://github.com/AR-js-org/jsartoolkit5/blob/244b2b23286403e78fa24805b34509dc5a88052f/js/artoolkit.api.js#L1833

    // resultado final
    // con una mezcla de chatgpt trate de modificar la matriz desde aca con nuevas distancias de corte segun las que crei

    // antes segun el repo de jsartoolkit5 va de 0.1 a 1000
    // pero segun la formula de stackoverflow va de 0.0001 a 1000

    // ahora, si tomo la funcion para modifica la matriz de perspectiva
    // y le paso las mismas distancias iniciales y finales
    // por alguna razon se resuelve el problema del z-fighting !!!!

    const oldnear = 0.1;
    const oldfar = 1000;
    const newnear = 0.1;
    const newfar = 1000;

    // esta funcion trae la matriz actual de la camara, que es calculada por el wasm de jsartoolkit5.. creo (osea, en Rust!)
    let pmatrix = arToolkitContext.getProjectionMatrix().toArray();

    let [cnear, cfar, cfov] = extractNearFarFromPerspectiveMatrix(pmatrix); // esta no se si anda

    /////// estos logs son para corroborar que la transformacion de matriz a array es correcta, y lo es!
    //
    // console.log("old projection goes: " + cnear + " to " + cfar + " with fov " + cfov);
    // console.log(pmatrix[0] + " , " + pmatrix[1] + " , " + pmatrix[2] + " , " + pmatrix[3]); // primera columna de arriba hacia abajo
    // console.log(pmatrix[4] + " , " + pmatrix[5] + " , " + pmatrix[6] + " , " + pmatrix[7]); // segunda columna de arriba hacia abajo y asi...
    // console.log(pmatrix[8] + " , " + pmatrix[9] + " , " + pmatrix[10] + " , " + pmatrix[11]); // el ultimo valor es -1 en todas las matrices de esta onda
    // console.log(pmatrix[12] + " , " + pmatrix[13] + " , " + pmatrix[14] + " , " + pmatrix[15]);

    pmatrix = modifyClipPlanes(pmatrix, oldnear, oldfar, newnear, newfar);

    let auxmat = new THREE.Matrix4();
    auxmat.fromArray(pmatrix, 0);
    camera.projectionMatrix.copy(auxmat); // esta linea se puede comentar para ver como queda la escena sin el arreglo del bug. Es una locura!!!!
  }

  // update scene.visible if the marker is seen
  scene.visible = camera.visible;
});

// esta funcion tampoco me anda como deberia, porque me cambia la perspectiva...  la hice con una mezcla de chatgpt y otras fuentes
// se supone que cambie las distancias de corte de la matriz de perspectiva de la camara
function modifyClipPlanes(oldMatrix, oldNear, oldFar, newNear, newFar) {
  // Create a copy of the original matrix
  let newMatrix = oldMatrix;

  newMatrix[0] = (oldMatrix[0] / oldNear) * newNear;
  newMatrix[5] = (oldMatrix[5] / oldNear) * newNear;
  newMatrix[10] = -((newFar + newNear) / (newFar - newNear));
  newMatrix[14] = (-2 * newFar * newNear) / (newFar - newNear);

  return newMatrix;
}

// arriba explico que no se si esta funcion anda, porque se me hace medio imposible despejar near y far...
function extractNearFarFromPerspectiveMatrix(projectionMatrix) {
  // https://stackoverflow.com/questions/56428880/how-to-extract-camera-parameters-from-projection-matrix

  // Extract values from the perspective matrix
  const a = projectionMatrix[10];
  const b = projectionMatrix[14];

  let fov = (2 * Math.atan(1 / projectionMatrix[5]) * 180) / Math.PI;

  let near = projectionMatrix[14] / (projectionMatrix[10] - 1.0);

  let far = projectionMatrix[14] / (projectionMatrix[10] + 1.0);

  return [near, far, fov];
}

//////////////////////////////////////////////////////////////////////////////////
//		add an object in the scene
//////////////////////////////////////////////////////////////////////////////////

let plane_geometry = new THREE.PlaneGeometry(1, 1);
let plane_material = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  color: "rgb(0,0,0)"
});
let plane_mesh = new THREE.Mesh(plane_geometry, plane_material);
plane_mesh.position.y = 0.0;
plane_mesh.rotation.x = Math.PI * 0.5;
scene.add(plane_mesh);

onRenderFcts.push(function (delta) {
  //mesh.rotation.x += Math.PI * delta;
});

//////////////////////////////////////////////////////////////////////////////////
//		render the whole thing on the page
//////////////////////////////////////////////////////////////////////////////////

// render the scene
onRenderFcts.push(function () {
  renderer.render(scene, camera);
});

// run the rendering loop
var lastTimeMsec = null;
requestAnimationFrame(function animate(nowMsec) {
  // keep looping
  requestAnimationFrame(animate);
  // measure time
  lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60;
  var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
  lastTimeMsec = nowMsec;
  // call each update function
  onRenderFcts.forEach(function (onRenderFct) {
    onRenderFct(deltaMsec / 1000, nowMsec / 1000);
  });
});
