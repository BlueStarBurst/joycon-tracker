//process.env.UV_THREADPOOL_SIZE=1024

const HID = require('windows-joycon');
var io = require('socket.io')();

let ready = true;

let toggleAuto = true;
let solving = false;

const defaultAuto = [-0.000154, 0.000041, 0.000041]
let newAuto = [0, 0, 0]
let genAuto = [[], [], []];

let Joycons = [];


let ping = 0;
let pong = 0;

let rx = 0;
let ry = 0;
let rz = 0;

let fix = false;

let overload = false;

io.listen(8000)

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.emit('init', {
        auto: toggleAuto
    });

    socket.on('auto', (data) => {
        if (toggleAuto) {
            console.log("solving!");
            solving = true;
        }
        else {
            toggleAuto = !toggleAuto;
        }
    });
});


HID.findControllers((devices) => {
    // When found any device.
    Joycons = devices;
    devices.forEach(async (device) => {
        console.log(`Found a device (${device.meta.serialNumber})`);
        let type = (await device.requestDeviceInfo()).type;
        // const deviceInfo = await device.requestDeviceInfo();
        await device.enableIMU();
        // await device.disableIMU();
        // await device.enableVibration();
        // await device.disableVibration();
        // Add a handler for new device.
        addHandler('add', device, type);

    });
});

async function addHandler(handler, device, type) {
    if (type == "Left Joy-Con") {
        device.manageHandler(handler, (packet) => {
            if (packet.inputReportID._raw[0] === 0x30) {

                ping++;
                let [x, y, z] = (packet).actualGyroscope.rps;

                if (solving) {

                    if (genAuto[0].length < 100) {
                        genAuto[0].push(x);
                        genAuto[1].push(y);
                        genAuto[2].push(z);
                    }
                    else {
                        solving = false;
                        newAuto[0] = avgAuto(genAuto[0]);
                        newAuto[1] = avgAuto(genAuto[1]);
                        newAuto[2] = avgAuto(genAuto[2]);
                        genAuto = [[], [], []];
                        toggleAuto = !toggleAuto;
                        console.log(newAuto);
                    }
                }

                if (!toggleAuto) {
                    x -= newAuto[0];
                    y -= newAuto[1];
                    z -= newAuto[2];
                }

                rx -= x;
                ry -= y;
                rz -= z;

                //console.log(`x:${x}   y:${y}   z:${z}`)

                //debugRot(x,y,z);

                if ((packet).buttonStatus.zr || (packet).buttonStatus.zl) {
                    rx = reset(rx);
                    ry = reset(ry);
                    rz = reset(rz);
                    sendRot();
                }

                if ((packet).buttonStatus.plus || (packet).buttonStatus.minus) {
                    rx = ry = rz = 0;
                    ping = -1000;
                    sendRot();
                }

            }
        });
    }
    else {
        device.manageHandler(handler, (packet) => {
            if (packet.inputReportID._raw[0] === 0x30) {

                ping++;
                let [x, y, z] = (packet).actualGyroscope.rps;

                if (solving) {

                    if (genAuto[0].length < 100) {
                        genAuto[0].push(x);
                        genAuto[1].push(y);
                        genAuto[2].push(z);
                    }
                    else {
                        solving = false;
                        newAuto[0] = avgAuto(genAuto[0]);
                        newAuto[1] = avgAuto(genAuto[1]);
                        newAuto[2] = avgAuto(genAuto[2]);
                        genAuto = [[], [], []];
                        toggleAuto = !toggleAuto;
                        console.log(newAuto);
                    }
                }

                if (!toggleAuto) {
                    x -= newAuto[0];
                    y -= newAuto[1];
                    z -= newAuto[2];
                }

                rx += x;
                ry += y;
                rz += z;

                //debugRot(x,y,z);

                if ((packet).buttonStatus.zr || (packet).buttonStatus.zl) {
                    rx = reset(rx);
                    ry = reset(ry);
                    rz = reset(rz);
                    sendRot();
                }

                if ((packet).buttonStatus.plus || (packet).buttonStatus.minus) {
                    ping = -1000;
                    rx = ry = rz = 0;
                    sendRot();
                }

            }
        });
    }
}



function reset(thing) {
    let step = 0.005
    if (thing > step) {
        thing -= step;
    }
    else if (thing < -step) {
        thing += step;
    }
    else {
        thing = 0;
    }
    return thing;
}

function debugRot(x, y, z) {
    if (Math.abs(x) > Math.abs(y)) {
        if (Math.abs(x) > Math.abs(z)) {
            console.log(`x:${x}`);
        }
        else {
            console.log(`z:${z}`);
        }
    }
    else if (Math.abs(y) > Math.abs(z)) {
        console.log(`y:${y}`);
    }
    else {
        console.log(`z:${z}`);
    }
}


function sendRot() {
    //console.log(`x:${rx}   y:${ry}   z:${rz}`)
    //console.log('emit');
    io.emit('data', {
        x: rx,
        y: ry,
        z: rz
    });
}


function avgAuto(arr) {
    var total = 0;
    for (var i = 0; i < arr.length; i++) {
        total += arr[i];
    }
    return avg = total / arr.length;
}

setInterval(sendRot, 100);

setInterval(function () {

    if (pong == 0)
    {
        pong = ping;
    }

    console.log(ping);
    /*
    if (ping < pong-10) {
        pong = 0;
        temp = [];
        Joycons.forEach(async (device) => {
            console.log(`Reset device (${device.meta.serialNumber})`);

            //temp.push(HID.findController(device));
            //device.resetHandlers();
            //let type = (await device.requestDeviceInfo()).type;
            //addHandler('add', device, type);
            /*
            await device.disableIMU();
            await device.enableIMU();
            
            
            //addHandler('add', device, type);
        });
        Joycons = temp;
    }
    */
    ping = 0;
}, 5000);