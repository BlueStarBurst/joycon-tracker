import React, { useRef, useState, useEffect, Suspense } from 'react'
import ReactDom from "react-dom"
import { Canvas, useFrame, useThree, extend, useLoader } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import openSocket from 'socket.io-client'

import { useFBX } from '@react-three/drei'

import 'bootstrap/dist/css/bootstrap.min.css';

import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ToggleButton from 'react-bootstrap/ToggleButton'
import Button from 'react-bootstrap/Button'

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";


import { ArrowRepeat, GearFill, ThreeDots } from 'react-bootstrap-icons'
import * as THREE from 'three'

extend({ ButtonGroup, ToggleButton, Button, React })

const loader = new THREE.ObjectLoader();

let socket = openSocket('http://localhost:8000');

let settings = {
    auto: 'None',
    sensitivity: 6
}


let rot = [0, 0, 0];

socket.on('connection', (socket) => {
    sendReady();
});

socket.on('init', (data) => {
    if (data.auto)
    {
        settings.auto = "None"
    }
    else {
        settings.auto = "Solved"
    }
    document.getElementById('auto').innerHTML = settings.auto;
    //setTimeout(function() {document.getElementById('auto').innerHTML = settings.auto;},100)
});


socket.on('data', function (data) {
    rot[0] = data.y * settings.sensitivity;
    rot[1] = data.x * settings.sensitivity;
    rot[2] = -data.z * settings.sensitivity;
    sendReady();
})

function sendReady() {
    socket.emit('ready', { data: 'ready' });
}

function CameraController() {
    const { camera, gl } = useThree();
    useEffect(
        () => {
            const controls = new OrbitControls(camera, gl.domElement);

            controls.minDistance = 3;
            controls.maxDistance = 20;
            return () => {
                controls.dispose();
            };
        },
        [camera, gl]
    );
    return null;
};

function moveTowards(start, end) {
    let step = Math.abs(end - start) / 5;
    if (start < end) {
        start += step;
    }
    else if (start > end) {
        start -= step;
    }
    return start;
}

function Loading(props) {

    return (
        <>
        </>
    )
}


function Joycon(props) {

    /*
    // This reference will give us direct access to the mesh
    const mesh = useRef()

    // Rotate mesh every frame, this is outside of React without overhead
    useFrame(() => {
        mesh.current.rotation.x = moveTowards(mesh.current.rotation.x, rot[0]);
        mesh.current.rotation.y = moveTowards(mesh.current.rotation.y, rot[1]);
        mesh.current.rotation.z = moveTowards(mesh.current.rotation.z, rot[2]);
    })
    */

    const obj = useRef();

    let Joycon = (new renderModel("objs/Joycon.gltf", [-1, 0, 0], [1.575,0,0], [0.5,0.5,0.5])).getModel();
    //let Joycon = (new renderModel("objs/joycontest3.gltf", [-1, 0, 0], [1.575,0,0], [0.5,0.5,0.5])).getModel();

    useFrame(() => {
        console.log(obj);
        obj.current.rotation.x = moveTowards(obj.current.rotation.x, rot[0]);
        obj.current.rotation.y = moveTowards(obj.current.rotation.y, rot[1]);
        obj.current.rotation.z = moveTowards(obj.current.rotation.z, rot[2]);
    })

    console.log(Joycon);
    return (
        <group
            ref={obj}    
        >
            {Joycon}
        </group >
    );
}

class renderModel {

    constructor(path, position = [0, 0, 0], rotation = [0,0,0], scale = [0,0,0]) {
        this.loader = useLoader(GLTFLoader, path);
        this.original = this.loader.scene;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    getModel() {
        return <group
            children={this.getChildren(this.original)}
            position={this.position}
            rotation={this.rotation}
            scale={this.scale}
        ></group>;
    }

    getChildren(current) {
        console.log("dsfhj");
        console.log(current);
        if (!current) {
            return [];
        }
        let children = [];
        current.children.forEach(element => {
            console.log(element.type);

            if (element.type == 'Mesh') {
                children.push(this.createMesh(element));
            }
            if (element.type == 'Object3D') {

                children.push(this.create3D(element));
            }

        });
        return children;
    }

    createMesh(mesh) {
        console.log("mesh!");
        let mesh_ = new THREE.Mesh(mesh.geometry, mesh.material);
        return <primitive object={mesh} position={[0, 0, 0]} />;
    }

    create3D(obj) {
        console.log("obj!");
        let obj_ = new THREE.Object3D();
        return <primitive
            object={obj_}
            children={this.getChildren(obj)}
            position={[obj.position.x, obj.position.y, obj.position.z]}
            rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
            scale={[obj.scale.x, obj.scale.y, obj.scale.z]}
        />;
    }
}

function AutoFixButtons() {



    return (

        <ButtonGroup vertical toggle className="mb-2" size="lg" style={{ "position": "absolute", "top": "1vw", "left": "1vw" }}>
            <ToggleButton
                type="checkbox"
                variant="primary"
                checked={(settings.auto == "None")}
                value="1"
                onChange={(e) => {
                    if (settings.auto == "None")
                    {
                        settings.auto = "Solved"
                    }
                    else
                    {
                        settings.auto = "None"
                    }
                    sendMessage('auto', true);
                    document.getElementById('auto').innerHTML = settings.auto;
                }}
            >
                <div id="auto">{settings.auto}</div>
            </ToggleButton>
        </ButtonGroup>
    );

}

function Scene() {
    return (
        <>
            <AutoFixButtons />
            <div style={{ "position": "absolute", "zIndex": "-10", "width": "100vw", "height": "100vh", "backgroundColor": "rgb(7, 24, 48)" }}>
                <Canvas>
                    <ambientLight />
                    <pointLight position={[10, 10, 10]} />

                    <Suspense fallback={<Loading position={[0, 0, 0]} />}>
                        <Joycon position={[0, 0, 0]} />
                    </Suspense>

                    <axesHelper scale={[10, 10, 10]} />
                    <CameraController />
                </Canvas>
            </div>
        </>
    )
}


ReactDom.render(
    <Scene />,
    document.getElementById("root")
);

function sendMessage(name, data) {
    console.log('data');
    socket.emit(name, data);
}
