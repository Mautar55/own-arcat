let ejemplo_para_json =
  {
    /////
    //MarkerControls
    /////
    // type of marker - ['pattern', 'barcode', 'unknown' ] - pattern es la imagen con marco, barcode la matriz falopera (el mas liviano).
    // se supone que el radio del pattern sea 0.5 de usarse asi
    marker_type : "barcode",
    // value for the barcode
    barcodeValue : 5,
    // pattern will use the patternUrl value, which should be at a constant, local, location
    // For specifics about markers and their creation see
    // https://medium.com/chialab-open-source/ar-js-the-simpliest-way-to-get-cross-browser-ar-on-the-web-8f670dd45462
    // Para crear un patron ver el link aca
    // https://ar-js-org.github.io/AR.js-Docs/marker-based/
    // para generar un qr con una imagen dentro ver esa herramienta
    // https://www.qrcode-monkey.com/#url
  
    /////
    //ToolkitContext
    /////
    // the mode of detection - ['color', 'color_and_matrix', 'mono', 'mono_and_matrix']
    detectionMode : "mono_and_matrix",
    // type of matrix code - valid if detectionMode end with 'matrix' - [3x3, 3x3_HAMMING63, 3x3_PARITY65, 4x4, 4x4_BCH_13_9_3, 4x4_BCH_13_5_5]
    matrixCodeType : "4x4_BCH_13_5_5",
    // Labeling mode for markers - ['black_region', 'white_region']
    // black_region (better): Black bordered markers on a white background, white_region: White bordered markers on a black background
    labelingMode : "black_region"
  
}
