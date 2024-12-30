'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.iUVertexBuffer = gl.createBuffer();
    this.iVVertexBuffer = gl.createBuffer();
    this.uVertexCount = 0;
    this.vVertexCount = 0;

    this.BufferData = function(uVertices, vVertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uVertices), gl.STREAM_DRAW);

        this.uVertexCount = uVertices.length/3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STREAM_DRAW);

        this.vVertexCount = vVertices.length/3;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
        gl.drawArrays(gl.LINE_STRIP, 0, this.uVertexCount);

        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
        gl.drawArrays(gl.LINE_STRIP, 0, this.vVertexCount);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    
    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1,1,0,1] );

    surface.Draw();
}

function CreateSurfaceData()
{
    let uVertexList = [];
    let vVertexList = [];
    const uSegments = 30; // Кількість сегментів уздовж t.
    const vSegments = 30; // Кількість сегментів уздовж v.

    // Константи поверхні
    const scale = 0.5;
    const a = 1.5 * scale, b = 3.0 * scale, c = 2.0 * scale, d = 2.0 * scale;

    // Функція f(v)
    function f(v) {
        return (a * b) / Math.sqrt((a ** 2) * Math.sin(v) ** 2 + (b ** 2) * Math.cos(v) ** 2);
    }

    // Генерація поліліній уздовж t (U-полілінії)
    for (let i = 0; i <= uSegments; i++) {
        const t = (i / uSegments) * 2 * Math.PI; // t змінюється від 0 до 2π.

        for (let j = 0; j <= vSegments; j++) {
            const v = (j / vSegments) * 2 * Math.PI; // v змінюється від 0 до 2π.

            const fv = f(v);
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            const x = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * cosV;
            const y = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * sinV;
            const z = 0.5 * (fv - (d ** 2 - c ** 2) / fv) * sinT;

            uVertexList.push(x, y, z);
        }
    }

    // Генерація поліліній уздовж v (V-полілінії)
    for (let j = 0; j <= vSegments; j++) {
        const v = (j / vSegments) * 2 * Math.PI; // v змінюється від 0 до 2π.

        for (let i = 0; i <= uSegments; i++) {
            const t = (i / uSegments) * 2 * Math.PI; // t змінюється від 0 до 2π.

            const fv = f(v);
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            const x = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * cosV;
            const y = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * sinV;
            const z = 0.5 * (fv - (d ** 2 - c ** 2) / fv) * sinT;

            vVertexList.push(x, y, z);
        }
    }

    return {uVertexList, vVertexList};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    const { uVertexList, vVertexList } = CreateSurfaceData();
    surface.BufferData(uVertexList, vVertexList);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
