
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

import { ResLoader /*, ArcatMaterial*/ } from "../ArcatResources";

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

const resolution_scaling = 1;

console.log("device pix ratio " + window.devicePixelRatio + " screen width " + window.screen.width);

const wsw = (window.screen.width) * resolution_scaling;
const wsh = (window.screen.height) * resolution_scaling;

renderer.setSize(wsw, wsh);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0px";
renderer.domElement.style.left = "0px";
/*renderer.domElement.width = window.screen.width;
renderer.domElement.height = window.screen.height;*/
document.body.appendChild(renderer.domElement);

// array of functions for the rendering loop
var onRenderFcts = [];

// init scene and camera
var scene = new THREE.Scene();
var arcat_loader = new ResLoader(scene);

/////////////////////////////////////////////////////////////////////////////////
//		Initialize a basic camera
/////////////////////////////////////////////////////////////////////////////////

// Create a camera
var camera = new THREE.PerspectiveCamera( 50, window.screen.width / window.screen.height, 0.1, 50);
scene.add(camera);
camera.position.set(3.5,3.5,3.5);
camera.lookAt(0,1,0);

/////////////////////////////////////////////////////////////////////////////////
/// Loading HDRI
/////////////////////////////////////////////////////////////////////////////////

rgbe_loader.load("/models/this_ambient.hdr", (texture_env) => {
  texture_env.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture_env;
  scene.background = texture_env;
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

// handle resize
window.addEventListener("resize", function () {
  onResize();
});

function onResize() {
  arToolkitSource.onResizeElement();

  // esta funcion em altera la relacion de aspecto
  // ver si el px en styles es lo mismo que el absoluto como parte del canvas

}
////////////////////////////////////////////////////////////////////////////////
//          initialize arToolkitContext
////////////////////////////////////////////////////////////////////////////////

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
