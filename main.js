'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let uSegments = 30;          // U granularity
let vSegments = 30;          // V granularity
let lightAngle = 0;             // Light angle

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Constructor
function Model(name) {
    this.name = name;
    this.uVertexBuffer = gl.createBuffer();
    this.vVertexBuffer = gl.createBuffer();
    this.uIndexBuffer = gl.createBuffer();
    this.vIndexBuffer = gl.createBuffer();
    this.uNormalBuffer = gl.createBuffer();
    this.vNormalBuffer = gl.createBuffer();
    this.uIndexCount = 0;
    this.vIndexCount = 0;

    this.BufferData = function(uVertices, vVertices, uIndices, vIndices, uNormals, vNormals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uVertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uNormals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.uIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(uIndices), gl.STATIC_DRAW);

        this.uIndexCount = uIndices.length;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vNormals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vIndices), gl.STATIC_DRAW);

        this.vIndexCount = vIndices.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.uIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.uIndexCount, gl.UNSIGNED_SHORT, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.vIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iShininess = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);
    let normalMatrix = m4.transpose(m4.inverse(matAccum1));

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    // Update light position
    lightAngle += 0.01;
    let lightPosition = [10 * Math.cos(lightAngle), 5, 10 * Math.sin(lightAngle)];
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);

    surface.Draw();
}

function normalize(vec) {
    const length = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
    return [vec[0] / length, vec[1] / length, vec[2] / length];
}

function calculateNormals(vertices, indices) {
    const normals = new Array(vertices.length / 3).fill(0).map(() => [0, 0, 0]);

    for (let i = 0; i < indices.length; i += 3) {
        const idx0 = indices[i];
        const idx1 = indices[i + 1];
        const idx2 = indices[i + 2];

        const v0 = vertices.slice(idx0 * 3, idx0 * 3 + 3);
        const v1 = vertices.slice(idx1 * 3, idx1 * 3 + 3);
        const v2 = vertices.slice(idx2 * 3, idx2 * 3 + 3);

        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        const normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ];

        if(normals[idx0]){
            normals[idx0][0] += normal[0];
            normals[idx0][1] += normal[1];
            normals[idx0][2] += normal[2];
        }

        if(normals[idx1]){
            normals[idx1][0] += normal[0];
            normals[idx1][1] += normal[1];
            normals[idx1][2] += normal[2];
        }

        if(normals[idx2]){
            normals[idx2][0] += normal[0];
            normals[idx2][1] += normal[1];
            normals[idx2][2] += normal[2];
        }
    }

    for (let i = 0; i < normals.length; i++) {
        const normal = normalize(normals[i]);
        normals[i] = normal;
    }

    return normals.flat();
}

function CreateSurfaceData() {
    let uVertices = [];
    let vVertices = [];
    let uIndices = [];
    let vIndices = [];
    let uNormals = [];
    let vNormals = [];
    
    const scale = 0.5;
    const a = 1.5 * scale, b = 3.0 * scale, c = 2.0 * scale, d = 2.0 * scale;

    function f(v) {
        return (a * b) / Math.sqrt((a ** 2) * Math.sin(v) ** 2 + (b ** 2) * Math.cos(v) ** 2);
    }

    // Генерація поліліній уздовж t (U-полілінії)
    for (let i = 0; i <= uSegments; i++) {
        const t = (i / uSegments) * 2 * Math.PI;
        for (let j = 0; j <= vSegments; j++) {
            const v = (j / vSegments) * 2 * Math.PI;
            const fv = f(v);
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            const x = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * cosV;
            const y = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * sinV;
            const z = 0.5 * (fv - (d ** 2 - c ** 2) / fv) * sinT;

            uVertices.push(x, y, z);
        }
    }

    // Генерація поліліній уздовж v (V-полілінії)
    for (let j = 0; j <= vSegments; j++) {
        const v = (j / vSegments) * 2 * Math.PI;
        for (let i = 0; i <= uSegments; i++) {
            const t = (i / uSegments) * 2 * Math.PI;
            const fv = f(v);
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            const cosV = Math.cos(v);
            const sinV = Math.sin(v);

            const x = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * cosV;
            const y = 0.5 * (fv * (1 + cosT) + (d ** 2 - c ** 2) * (1 - cosT) / fv) * sinV;
            const z = 0.5 * (fv - (d ** 2 - c ** 2) / fv) * sinT;

            vVertices.push(x, y, z);
        }
    }

    // Створення індексів для U-поліліній
    for (let i = 0; i < uSegments; i++) {
        for (let j = 0; j < vSegments; j++) {
            const p0 = i * (vSegments + 1) + j;
            const p1 = p0 + 1;
            const p2 = (i + 1) * (vSegments + 1) + j;
            const p3 = p2 + 1;

            uIndices.push(p0, p1, p2);
            uIndices.push(p1, p3, p2);
        }
    }

    // Створення індексів для V-поліліній
    for (let j = 0; j < vSegments; j++) {
        for (let i = 0; i < uSegments; i++) {
            const p0 = j * (vSegments + 1) + i;
            const p1 = p0 + 1;
            const p2 = (j + 1) * (vSegments + 1) + i;
            const p3 = p2 + 1;

            vIndices.push(p0, p1, p2);
            vIndices.push(p1, p3, p2);
        }
    }


    uNormals = calculateNormals(uVertices, uIndices);
    vNormals = calculateNormals(vVertices, vIndices);

    return { uVertices, vVertices, uIndices, vIndices, uNormals, vNormals };
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "AmbientColor");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "DiffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "SpecularColor");
    shProgram.iShininess = gl.getUniformLocation(prog, "Shininess");

    shProgram.Use();
    gl.uniform4fv(shProgram.iAmbientColor, [0.2, 0.2, 0.2, 1.0]);
    gl.uniform4fv(shProgram.iDiffuseColor, [0.7, 0.7, 0.7, 1.0]);
    gl.uniform4fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 50.0);

    surface = new Model('Surface');
    const { uVertices, vVertices, uIndices, vIndices, uNormals, vNormals } = CreateSurfaceData();
    surface.BufferData(uVertices, vVertices, uIndices, vIndices, uNormals, vNormals);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function updateGranularity() {
    const uSlider = document.getElementById('uGranularity');
    const vSlider = document.getElementById('vGranularity');

    uSegments = parseInt(uSlider.value, 10);
    vSegments = parseInt(vSlider.value, 10);
    
    const { uVertices, vVertices, uIndices, vIndices, uNormals, vNormals } = CreateSurfaceData();
    surface.BufferData(uVertices, vVertices, uIndices, vIndices, uNormals, vNormals);
    draw();
}

function animate() {
    draw();
    requestAnimationFrame(animate);
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    document.getElementById("uGranularity").addEventListener("input", updateGranularity);
    document.getElementById("vGranularity").addEventListener("input", updateGranularity);

    animate();
}